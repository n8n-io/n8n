// LLM-backed user simulator for multi-turn workflow evals.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import { createUserProxyAgent, type UserProxyAgent } from './agent';
import {
	getNextUnsentReferenceUserTurn,
	tryDeterministicConfirmationResponse,
} from './deterministic';
import { buildConfirmationPrompt, buildFollowUpPrompt } from './prompts';
import { encodeConfirmationDecision, type Decision } from './tools';
import { buildAutoApprovePayload } from '../../harness/chat-loop';
import type { NextMessageDecision } from '../../harness/chat-loop';
import type { EvalLogger } from '../../harness/logger';
import type { CapturedEvent, ConversationTurn } from '../../types';
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
	private readonly conversation: ConversationTurn[];
	private readonly messageBudget: number;
	private readonly agent: UserProxyAgent;
	private readonly logger?: EvalLogger;

	private messagesSent = 0;
	private ingestedEventCount = 0;
	private rollingTranscript: ConversationTurn[];
	private readonly seenRequestIds = new Set<string>();
	private readonly decisionStats: ProxyDecisionStats = {};

	constructor(config: UserProxyConfig) {
		this.conversation = config.conversation;
		this.messageBudget = config.messageBudget ?? DEFAULT_MESSAGE_BUDGET;
		this.logger = config.logger;
		this.agent =
			config.agent ?? createUserProxyAgent({ modelId: config.modelId, logger: config.logger });
		this.rollingTranscript = [...config.conversation];
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
				this.rollingTranscript.push({ role: 'assistant', text: pendingAssistantText });
				pendingAssistantText = '';
			}
		}

		if (pendingAssistantText.length > 0) {
			const last = this.rollingTranscript[this.rollingTranscript.length - 1];
			if (last?.role === 'assistant') {
				last.text = last.text + pendingAssistantText;
			} else {
				this.rollingTranscript.push({ role: 'assistant', text: pendingAssistantText });
			}
		}
	}

	async respondToConfirmation(event: CapturedEvent): Promise<InstanceAiConfirmRequest> {
		const requestId = extractRequestId(event);
		const isRepeat = requestId !== undefined && this.seenRequestIds.has(requestId);
		if (requestId) this.seenRequestIds.add(requestId);

		if (isRepeat) {
			this.bumpStat('repeat');
			return buildAutoApprovePayload(event);
		}

		const det = tryDeterministicConfirmationResponse(event);
		if (det) {
			this.bumpStat('deterministic');
			return det;
		}

		const prompt = buildConfirmationPrompt(this.promptContext(), event);
		const decision = await this.agent.decide(prompt);
		if (!decision) {
			this.logger?.warn(`[user-proxy] no decision; event=${summarizeEvent(event)}`);
			this.bumpStat('fallback-no-decision');
			return buildAutoApprovePayload(event);
		}

		const encoded = encodeConfirmationDecision(decision, (raw, parseError) =>
			this.logger?.warn(
				`[user-proxy] nodeParametersJson failed to parse (${String(parseError)}); raw=${raw.slice(0, 200)}`,
			),
		);
		if (!encoded) {
			this.logger?.warn(
				`[user-proxy] action=${decision.action} did not encode to a confirmation payload`,
			);
			this.bumpStat('fallback-unencoded');
			return buildAutoApprovePayload(event);
		}

		this.recordDecision(decision, encoded, event);
		return encoded;
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
		if (this.messagesSent >= this.messageBudget) return { kind: 'done' };

		const nextReferenceTurn = getNextUnsentReferenceUserTurn(this.conversation, this.messagesSent);
		if (nextReferenceTurn) {
			this.messagesSent++;
			return { kind: 'followUp', message: nextReferenceTurn };
		}

		const prompt = buildFollowUpPrompt(this.promptContext());
		const decision = await this.agent.decide(prompt);
		if (!decision) return { kind: 'done' };

		if (decision.action === 'send_follow_up_message') {
			const message = decision.message.trim();
			if (!message) return { kind: 'done' };
			this.messagesSent++;
			return { kind: 'followUp', message };
		}
		return { kind: 'done' };
	}

	// -------------------------------------------------------------------------
	// Internal
	// -------------------------------------------------------------------------

	private promptContext() {
		return {
			conversation: this.conversation,
			rollingTranscript: this.rollingTranscript,
		};
	}
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

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
