// LLM-backed user simulator for multi-turn workflow evals.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { isRecord } from '@n8n/utils';

import { createUserProxyAgent, type UserProxyAgent } from './agent';
import { tryDeterministicConfirmationResponse } from './deterministic';
import { buildConfirmationPrompt, buildFollowUpPrompt } from './prompts';
import { encodeConfirmationDecision, type Decision, type SetupWizardParseContext } from './tools';
import { buildAutoApprovePayload } from '../../harness/chat-loop';
import type { NextMessageDecision } from '../../harness/chat-loop';
import type { EvalLogger } from '../../harness/logger';
import type { CapturedEvent, ConversationTurn } from '../../types';
import { getEventPayload } from '../confirmation-payload';
import { getNestedRecord, getString } from '../safe-extract';

/**
 * What category of response the proxy sent for a confirmation event.
 * Mostly mirrors the `kind` of the InstanceAiConfirmRequest, with overlay
 * categories that describe WHERE the response came from:
 *
 *  - `dismissal` / `rejection` — shape of a successful LLM-driven decision
 *  - `deterministic` — handled by the deterministic shortcut (no LLM call)
 *  - `repeat` — a confirmation requestId we already responded to
 *  - `fallback-no-decision` — LLM returned no decision; sent autoApprove
 *  - `fallback-unencoded` — LLM picked a between-run action that doesn't
 *    encode to a confirmation payload; sent autoApprove
 */
export type ProxyDecisionCategory =
	| InstanceAiConfirmRequest['kind']
	| 'dismissal'
	| 'rejection'
	| 'deterministic'
	| 'repeat'
	| 'fallback-no-decision'
	| 'fallback-unencoded';

export type ProxyDecisionStats = Partial<Record<ProxyDecisionCategory, number>>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MESSAGE_BUDGET = 5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UserProxyConfig {
	conversation: ConversationTurn[];
	messageBudget?: number;
	modelId?: string;
	logger?: EvalLogger;
	/** Test seam — inject a fake agent. */
	agent?: UserProxyAgent;
}

// ---------------------------------------------------------------------------
// UserProxyLlm
// ---------------------------------------------------------------------------

export class UserProxyLlm {
	/** The intended conversation — read-only, what the user wants overall. */
	private readonly script: ConversationTurn[];
	private readonly messageBudget: number;
	private readonly agent: UserProxyAgent;
	private readonly logger?: EvalLogger;

	/** What's actually been sent and received this run, both sides. The
	 *  opening turn is seeded here on construction because the harness sends
	 *  it directly via `client.sendMessage` before the first SSE event. */
	private readonly actualTranscript: ConversationTurn[];

	private messagesSent = 0;
	private ingestedEventCount = 0;
	private readonly seenRequestIds = new Set<string>();
	private readonly responseByRequestId = new Map<string, InstanceAiConfirmRequest>();
	private readonly sentScriptUserTurnIndexes = new Set<number>();
	private readonly decisionStats: ProxyDecisionStats = {};

	constructor(config: UserProxyConfig) {
		this.script = config.conversation;
		this.messageBudget = config.messageBudget ?? DEFAULT_MESSAGE_BUDGET;
		this.logger = config.logger;
		this.agent =
			config.agent ?? createUserProxyAgent({ modelId: config.modelId, logger: config.logger });
		// Seed with the opener — the harness has already sent it.
		const opener = this.script[0];
		this.actualTranscript = opener ? [{ role: opener.role, text: opener.text }] : [];
		if (opener?.role === 'user') {
			this.sentScriptUserTurnIndexes.add(0);
		}
	}

	getMessagesSent(): number {
		return this.messagesSent;
	}

	ingestEvents(events: CapturedEvent[]): void {
		const newEvents = events.slice(this.ingestedEventCount);
		this.ingestedEventCount = events.length;

		let pendingAssistantText = '';
		for (const event of newEvents) {
			if (event.type === 'text-delta') {
				const text = extractTextDelta(event);
				if (text) pendingAssistantText += text;
			} else if (event.type === 'run-finish' && pendingAssistantText.length > 0) {
				this.actualTranscript.push({ role: 'assistant', text: pendingAssistantText });
				pendingAssistantText = '';
			}
		}

		if (pendingAssistantText.length > 0) {
			const last = this.actualTranscript[this.actualTranscript.length - 1];
			if (last?.role === 'assistant') {
				last.text = last.text + pendingAssistantText;
			} else {
				this.actualTranscript.push({ role: 'assistant', text: pendingAssistantText });
			}
		}
	}

	async respondToConfirmation(event: CapturedEvent): Promise<InstanceAiConfirmRequest> {
		const requestId = extractRequestId(event);
		const isRepeat = requestId !== undefined && this.seenRequestIds.has(requestId);
		if (isRepeat) {
			this.bumpStat('repeat');
			return this.responseByRequestId.get(requestId) ?? buildAutoApprovePayload(event);
		}

		const det = tryDeterministicConfirmationResponse(event);
		if (det) {
			this.bumpStat('deterministic');
			return this.rememberResponse(requestId, det);
		}

		const scripted = this.tryScriptedConfirmationResponse(event);
		if (scripted) {
			this.bumpStat('deterministic');
			return this.rememberResponse(requestId, scripted);
		}

		const prompt = buildConfirmationPrompt(this.promptContext(), event);
		const decision = await this.agent.decide(prompt);
		if (!decision) {
			this.logger?.warn(`[user-proxy] no decision; event=${summarizeEvent(event)}`);
			this.bumpStat('fallback-no-decision');
			return this.rememberResponse(requestId, this.fallbackConfirmationResponse(event));
		}

		const encoded = encodeConfirmationDecision(
			decision,
			(raw, parseError) =>
				this.logger?.warn(
					`[user-proxy] nodeParametersJson failed to parse (${String(parseError)}); raw=${raw.slice(0, 200)}`,
				),
			extractSetupWizardParseContext(event),
		);
		if (!encoded) {
			this.logger?.warn(
				`[user-proxy] action=${decision.action} did not encode to a confirmation payload`,
			);
			this.bumpStat('fallback-unencoded');
			return this.rememberResponse(requestId, this.fallbackConfirmationResponse(event));
		}

		this.recordDecision(decision, encoded, event);
		return this.rememberResponse(requestId, encoded);
	}

	private bumpStat(category: ProxyDecisionCategory): void {
		this.decisionStats[category] = (this.decisionStats[category] ?? 0) + 1;
	}

	/** Counts of proxy decisions by category. Read after the build completes. */
	getDecisionStats(): Readonly<ProxyDecisionStats> {
		return { ...this.decisionStats };
	}

	private recordDecision(
		decision: Decision,
		encoded: InstanceAiConfirmRequest,
		event: CapturedEvent,
	): void {
		const category = classifyDecision(encoded);
		this.bumpStat(category);
		this.logger?.verbose(`[user-proxy] decision action=${decision.action} category=${category}`);
		if (category === 'dismissal') {
			this.logger?.warn(
				`[user-proxy] dismissal-like response kind=${encoded.kind}; event=${summarizeEvent(event)}`,
			);
		}
	}

	async decideFollowUp(): Promise<NextMessageDecision> {
		if (this.messagesSent >= this.messageBudget) {
			this.logger?.warn(
				`[user-proxy] message budget exhausted (${String(this.messagesSent)}/${String(this.messageBudget)}); ending conversation`,
			);
			return { kind: 'done' };
		}

		const prompt = buildFollowUpPrompt(this.promptContext());
		const decision = await this.agent.decide(prompt);
		if (!decision) {
			const [next] = this.remainingUserScriptTurns();
			if (!next || hasStageDirection(next.text)) return { kind: 'done' };
			const scriptedMessage = this.consumeNextRemainingUserScriptTurn();
			if (!scriptedMessage) return { kind: 'done' };
			this.messagesSent++;
			return { kind: 'followUp', message: scriptedMessage };
		}

		if (decision.action === 'send_follow_up_message') {
			const message = decision.message.trim();
			if (!message) return { kind: 'done' };
			this.messagesSent++;
			this.actualTranscript.push({ role: 'user', text: message });
			return { kind: 'followUp', message };
		}
		return { kind: 'done' };
	}

	// -------------------------------------------------------------------------
	// Internal
	// -------------------------------------------------------------------------

	private promptContext() {
		return {
			script: this.script,
			actualTranscript: this.actualTranscript,
		};
	}

	private rememberResponse(
		requestId: string | undefined,
		response: InstanceAiConfirmRequest,
	): InstanceAiConfirmRequest {
		if (requestId) {
			this.responseByRequestId.set(requestId, response);
			this.seenRequestIds.add(requestId);
		}
		return response;
	}

	private fallbackConfirmationResponse(event: CapturedEvent): InstanceAiConfirmRequest {
		return this.tryScriptedConfirmationResponse(event) ?? buildAutoApprovePayload(event);
	}

	private tryScriptedConfirmationResponse(
		event: CapturedEvent,
	): InstanceAiConfirmRequest | undefined {
		const payload = getEventPayload(event);
		const inputType = getString(payload, 'inputType');

		if (this.remainingUserScriptTurns().some((turn) => hasStageDirection(turn.text))) {
			return undefined;
		}

		// ask-user questions go to the LLM; only single-blob plan-review/text are scripted here.
		if (inputType === 'plan-review') {
			const userInput = this.consumeAllRemainingUserScriptTurns(
				'Before I approve, use these details:',
			);
			if (userInput) return { kind: 'approval', approved: false, userInput };
		}

		if (inputType === 'text') {
			const userInput = this.consumeAllRemainingUserScriptTurns();
			if (userInput) return { kind: 'approval', approved: true, userInput };
		}

		return undefined;
	}

	private consumeAllRemainingUserScriptTurns(prefix?: string): string | undefined {
		const turns = this.remainingUserScriptTurns();
		if (turns.length === 0) return undefined;

		for (const turn of turns) {
			this.sentScriptUserTurnIndexes.add(turn.index);
		}

		const text = turns.map((turn) => turn.text).join('\n\n');
		this.actualTranscript.push({ role: 'user', text });
		return prefix ? `${prefix}\n${text}` : text;
	}

	private consumeNextRemainingUserScriptTurn(): string | undefined {
		const [turn] = this.remainingUserScriptTurns();
		if (!turn) return undefined;

		this.sentScriptUserTurnIndexes.add(turn.index);
		this.actualTranscript.push({ role: 'user', text: turn.text });
		return turn.text;
	}

	private remainingUserScriptTurns(): Array<{ index: number; text: string }> {
		const turns: Array<{ index: number; text: string }> = [];
		for (let index = 0; index < this.script.length; index++) {
			const turn = this.script[index];
			if (!turn || turn.role !== 'user' || this.sentScriptUserTurnIndexes.has(index)) continue;
			turns.push({ index, text: turn.text });
		}
		return turns;
	}
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

/** Text carrying a `[stage direction]` — proxy guidance, not dialogue; callers defer it to the LLM. */
function hasStageDirection(text: string): boolean {
	return /\[[^\]]+\]/.test(text);
}

function extractTextDelta(event: CapturedEvent): string | undefined {
	const directText = event.data.text;
	if (typeof directText === 'string') return directText;
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.text === 'string') return payload.text;
	return undefined;
}

function extractRequestId(event: CapturedEvent): string | undefined {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload) {
		const id = getString(payload, 'requestId');
		if (id) return id;
	}
	return getString(event.data, 'requestId');
}

function extractSetupWizardParseContext(event: CapturedEvent): SetupWizardParseContext | undefined {
	const payload = getEventPayload(event);
	if (!Array.isArray(payload.setupRequests)) return undefined;

	const nodes = payload.setupRequests.flatMap((item) => {
		if (!isRecord(item)) return [];
		const node = isRecord(item.node) ? item.node : undefined;
		const nodeName = (node ? getString(node, 'name') : undefined) ?? getString(item, 'nodeName');
		if (!nodeName) return [];

		const nodeId = (node ? getString(node, 'id') : undefined) ?? getString(item, 'nodeId');
		const parameterNames = [
			...extractParameterNames(item, 'editableParameters'),
			...extractParameterNames(item, 'parameterRequests'),
			...extractParameterIssueNames(item),
		];

		return [
			{
				...(nodeId ? { nodeId } : {}),
				nodeName,
				parameterNames: [...new Set(parameterNames)],
			},
		];
	});

	return nodes.length > 0 ? { nodes } : undefined;
}

function extractParameterNames(item: Record<string, unknown>, key: string): string[] {
	const parameters = item[key];
	if (!Array.isArray(parameters)) return [];
	return parameters.flatMap((parameter) =>
		isRecord(parameter)
			? [getString(parameter, 'name')].filter((name): name is string => !!name)
			: [],
	);
}

function extractParameterIssueNames(item: Record<string, unknown>): string[] {
	const parameterIssues = item.parameterIssues;
	return isRecord(parameterIssues) ? Object.keys(parameterIssues) : [];
}

/** Compact JSON of the event payload, truncated for log readability. */
function summarizeEvent(event: CapturedEvent): string {
	const payload = getNestedRecord(event.data, 'payload') ?? event.data;
	const summary = JSON.stringify(payload);
	return summary.length > 800 ? `${summary.slice(0, 800)}…` : summary;
}

/** Coarse category for accounting: how the proxy responded to a confirmation. */
function classifyDecision(encoded: InstanceAiConfirmRequest): ProxyDecisionCategory {
	if (
		(encoded.kind === 'questions' &&
			(encoded.answers.length === 0 || encoded.answers.every((a) => a.skipped))) ||
		(encoded.kind === 'setupWorkflowApply' &&
			(!encoded.nodeParameters || Object.keys(encoded.nodeParameters).length === 0))
	) {
		return 'dismissal';
	}
	if (encoded.kind === 'approval' && !encoded.approved) return 'rejection';
	return encoded.kind;
}
