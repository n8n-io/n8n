// LLM-backed user simulator for multi-turn workflow evals.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { createUserProxyAgent, type UserProxyAgent } from './agent';
import { tryDeterministicConfirmationResponse } from './deterministic';
import { buildConfirmationPrompt, buildFollowUpPrompt } from './prompts';
import {
	encodeConfirmationDecision,
	type Decision,
	type SetupWizardParseContext,
	type CredentialSetupParseContext,
	type CreateCredentialFn,
} from './tools';
import type { N8nClient } from '../../clients/n8n-client';
import { createOneCredential } from '../../credentials/seeder';
import { buildAutoApprovePayload } from '../../harness/chat-loop';
import type { NextMessageDecision } from '../../harness/chat-loop';
import type { EvalLogger } from '../../harness/logger';
import type { CapturedEvent, ConversationTurn } from '../../types';
import { getEventPayload } from '../confirmation-payload';
import { getNestedRecord, getString } from '../safe-extract';

/**
 * Lets `manual` create a real credential (TRUST-349) when a setup card shows
 * zero existing candidates for the resolved type — "user fills the New
 * Credential modal". Omit for cases that don't exercise credential-setup
 * engagement; `manual` then declines with zero candidates instead of crashing.
 */
export interface CredentialCreationConfig {
	client: N8nClient;
	threadId: string;
	/** Ids already allowlisted for this thread (from pre-run seeding via
	 *  `createDeclaredCredentials`) — required because
	 *  `setThreadCredentialAllowlist` REPLACES the whole list, so a mid-run
	 *  creation must include these or it clobbers the case's declared set. */
	allowlistedCredentialIds: string[];
	/** Run-level registry newly-created ids are added to for end-of-run cleanup. */
	createdCredentialIds?: Set<string>;
	/** Shared with the same `Map` passed to `createDeclaredCredentials` for this
	 *  build's pre-run seeding, so a mid-run-created credential's display name
	 *  gets the right `#2`/`#3` suffix instead of silently colliding with a
	 *  declared credential of the same default name (e.g. two "[eval] Slack"
	 *  credentials with no way to tell which one an agent picked). Defaults to
	 *  a fresh, unshared `Map` if omitted. */
	nameCounts?: Map<string, number>;
}

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
	| 'fallback-unencoded'
	/** A created credential was registered as passing its connection test. Counted
	 *  so a case relying on that can assert the bypass fired instead of trusting a
	 *  green — the agent-visible result is deliberately indistinguishable. */
	| 'credential-test-bypassed';

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
	/** Wire this in to let `manual` create a real credential when a setup card
	 *  shows zero existing candidates — see `CredentialCreationConfig`. */
	credentialCreation?: CredentialCreationConfig;
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

	private readonly credentialCreation?: CredentialCreationConfig;
	/** Mutable running copy of `credentialCreation.allowlistedCredentialIds` —
	 *  grows as `createCredential` mints new ones, since the allowlist endpoint
	 *  replaces the whole list rather than appending. */
	private allowlistedCredentialIds: string[];
	/** Ids the backend should resolve as passing their connection test — grows as
	 *  the proxy creates credentials a stage direction described as working. */
	private bypassCredentialTestIds: string[] = [];
	/** Defaults to a fresh Map when the caller doesn't share one from pre-run
	 *  seeding — see `CredentialCreationConfig.nameCounts`. */
	private readonly createdCredentialNameCounts: Map<string, number>;

	constructor(config: UserProxyConfig) {
		this.script = config.conversation;
		this.messageBudget = config.messageBudget ?? DEFAULT_MESSAGE_BUDGET;
		this.logger = config.logger;
		this.agent =
			config.agent ?? createUserProxyAgent({ modelId: config.modelId, logger: config.logger });
		this.credentialCreation = config.credentialCreation;
		this.allowlistedCredentialIds = config.credentialCreation?.allowlistedCredentialIds ?? [];
		this.createdCredentialNameCounts =
			config.credentialCreation?.nameCounts ?? new Map<string, number>();
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

		const det = tryDeterministicConfirmationResponse(event, {
			allowCredentialEngagement: this.hasPendingStageDirection(),
		});
		if (det && !this.deferAccessGateToScript(event)) {
			this.bumpStat('deterministic');
			return this.rememberResponse(requestId, det);
		}

		const scripted = this.tryScriptedConfirmationResponse(event);
		if (scripted) {
			this.bumpStat('deterministic');
			return this.rememberResponse(requestId, scripted);
		}

		const prompt = buildConfirmationPrompt(this.promptContext(), event);
		const decision = await this.agent.decide(prompt, 'confirmation');
		if (!decision) {
			this.logger?.warn(`[user-proxy] no decision; event=${summarizeEvent(event)}`);
			this.bumpStat('fallback-no-decision');
			return this.rememberResponse(requestId, this.fallbackConfirmationResponse(event));
		}

		const encoded = await encodeConfirmationDecision(
			decision,
			(raw, parseError) =>
				this.logger?.warn(
					`[user-proxy] action=${decision.action} failed to encode (${String(parseError)}); raw=${raw.slice(0, 200)}`,
				),
			extractSetupWizardParseContext(event),
			extractCredentialSetupContext(event),
			this.credentialCreation ? this.createCredential : undefined,
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

	/**
	 * Creates a real credential for `manual`'s "zero existing candidates"
	 * case, registers it for cleanup, and updates the thread's allowlist so
	 * both this and any later turn can see it. Arrow field (not a method) so
	 * it stays correctly bound when passed as a bare `CreateCredentialFn`.
	 */
	private createCredential: CreateCredentialFn = async (credentialType, options) => {
		if (!this.credentialCreation) {
			// encodeConfirmationDecision only receives this function at all when
			// `this.credentialCreation` is set (see respondToConfirmation) — a
			// throw here means that invariant broke, not a normal runtime failure.
			throw new Error('createCredential invoked without a credentialCreation config');
		}
		const { client, threadId, createdCredentialIds } = this.credentialCreation;
		const created = await createOneCredential(
			client,
			credentialType,
			undefined,
			this.createdCredentialNameCounts,
			{ logger: this.logger },
		);
		createdCredentialIds?.add(created.id);
		this.allowlistedCredentialIds = [...this.allowlistedCredentialIds, created.id];
		// A "works" credential still carries a placeholder token, so its real
		// connection test would fail and the setup card would refuse to apply it.
		// Registering the bypass here — in the allowlist call the creation already
		// makes — keeps it strictly before the confirmation response is sent, which
		// is when the product runs that test. Keep this ordering if you refactor.
		if (options?.works === true) {
			this.bypassCredentialTestIds = [...this.bypassCredentialTestIds, created.id];
			this.bumpStat('credential-test-bypassed');
		}
		// Call with two args in the default case so the request stays byte-identical
		// to before for every case that doesn't opt into the bypass.
		if (this.bypassCredentialTestIds.length > 0) {
			await client.setThreadCredentialAllowlist(
				threadId,
				this.allowlistedCredentialIds,
				this.bypassCredentialTestIds,
			);
		} else {
			await client.setThreadCredentialAllowlist(threadId, this.allowlistedCredentialIds);
		}
		return created;
	};

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
		const decision = await this.agent.decide(prompt, 'user-turn');
		if (!decision) {
			const [next] = this.remainingUserScriptTurns();
			if (!next || hasStageDirection(next.text)) {
				this.logger?.warn(
					'[user-proxy] no user-turn decision and no plain scripted turn to fall back to — ending conversation',
				);
				return { kind: 'done' };
			}
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
		if (decision.action !== 'declare_done') {
			// The user-turn schema offers only the two actions above, so this only
			// fires for injected test agents or schema drift — never drop it silently.
			this.logger?.warn(
				`[user-proxy] user-turn decision returned confirmation-only action=${decision.action} — treating as done`,
			);
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

	/** Network-access gates (fetch-url domain, web search) are granted deterministically so the
	 *  common case spends no LLM call. A pending stage direction may instruct a refusal though,
	 *  so hand those to the LLM the way plan review already is. */
	private deferAccessGateToScript(event: CapturedEvent): boolean {
		const payload = getEventPayload(event);
		if (!payload.domainAccess && !payload.webSearch) return false;
		return this.hasPendingStageDirection();
	}

	/**
	 * Any stage direction still pending delivery — the one signal the harness
	 * uses everywhere to decide "consult the model instead of taking the
	 * deterministic default" (domain access, web search, plan review, and — as
	 * of TRUST-349 — credential-setup engagement below). Deliberately content-
	 * agnostic: a keyword-scoped variant was tried and rejected after a corpus
	 * audit found it both under- and over-fires (a note saying "don't provide
	 * the API key, fill it in yourself later" matched on "API key"/"credential"
	 * despite asking for the opposite of engagement — a word match can't tell
	 * what a note means, but the model reading the actual text can). The
	 * system prompt already instructs the model to keep deferring unless a
	 * pending note says otherwise, so routing every pending-direction case
	 * through it is the same bet already made for domain access and plan
	 * review, not a new one.
	 */
	private hasPendingStageDirection(): boolean {
		return this.remainingUserScriptTurns().some((turn) => hasStageDirection(turn.text));
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

/**
 * Workflow setup wizard shows one `setupRequests[]` entry per (node,
 * credentialType) combo, plus a separate param-only entry — so a node needing
 * both a credential and parameter fixes can appear across multiple entries.
 * Group by node name/id and merge each field in as encountered.
 */
function extractSetupWizardParseContext(event: CapturedEvent): SetupWizardParseContext | undefined {
	const payload = getEventPayload(event);
	if (!Array.isArray(payload.setupRequests)) return undefined;

	const byNodeName = new Map<string, SetupWizardParseContext['nodes'][number]>();

	for (const item of payload.setupRequests) {
		if (!isRecord(item)) continue;
		const node = isRecord(item.node) ? item.node : undefined;
		const nodeName = (node ? getString(node, 'name') : undefined) ?? getString(item, 'nodeName');
		if (!nodeName) continue;

		const nodeId = (node ? getString(node, 'id') : undefined) ?? getString(item, 'nodeId');
		const existing = byNodeName.get(nodeName) ?? {
			nodeName,
			parameterNames: [],
			credentialRequests: [],
		};
		// A node can appear across multiple setupRequests[] entries (one per
		// credential type, plus a param-only one); backfill nodeId from
		// whichever entry actually carries it, not just the first one seen.
		if (nodeId && !existing.nodeId) existing.nodeId = nodeId;

		const parameterNames = [
			...existing.parameterNames,
			...extractParameterNames(item, 'editableParameters'),
			...extractParameterNames(item, 'parameterRequests'),
			...extractParameterIssueNames(item),
		];
		existing.parameterNames = [...new Set(parameterNames)];

		const credentialType = getString(item, 'credentialType');
		if (credentialType) {
			existing.credentialRequests = [
				...existing.credentialRequests,
				{ credentialType, existingCredentials: extractExistingCredentials(item) },
			];
		}

		byNodeName.set(nodeName, existing);
	}

	const nodes = [...byNodeName.values()];
	return nodes.length > 0 ? { nodes } : undefined;
}

function extractCredentialSetupContext(
	event: CapturedEvent,
): CredentialSetupParseContext | undefined {
	const payload = getEventPayload(event);
	if (!Array.isArray(payload.credentialRequests)) return undefined;

	const requests = payload.credentialRequests.flatMap((item) => {
		if (!isRecord(item)) return [];
		const credentialType = getString(item, 'credentialType');
		if (!credentialType) return [];

		return [{ credentialType, existingCredentials: extractExistingCredentials(item) }];
	});

	return requests.length > 0 ? { requests } : undefined;
}

function extractExistingCredentials(
	item: Record<string, unknown>,
): Array<{ id: string; name: string }> {
	if (!Array.isArray(item.existingCredentials)) return [];
	return item.existingCredentials.flatMap((cred) => {
		if (!isRecord(cred)) return [];
		const id = getString(cred, 'id');
		const name = getString(cred, 'name');
		return id && name ? [{ id, name }] : [];
	});
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
