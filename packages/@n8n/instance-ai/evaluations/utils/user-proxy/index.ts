// LLM-backed user simulator for multi-turn workflow evals.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import { createUserProxyAgent, type UserProxyAgent } from './agent';
import {
	getNextUnsentReferenceUserTurn,
	tryDeterministicConfirmationResponse,
} from './deterministic';
import { buildConfirmationPrompt, buildFollowUpPrompt } from './prompts';
import { encodeConfirmationDecision } from './tools';
import { buildAutoApprovePayload } from '../../harness/chat-loop';
import type { NextMessageDecision } from '../../harness/chat-loop';
import type { CapturedEvent, ConversationTurn } from '../../types';

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

	private messagesSent = 0;
	private ingestedEventCount = 0;
	private rollingTranscript: ConversationTurn[];
	private readonly seenRequestIds = new Set<string>();

	constructor(config: UserProxyConfig) {
		this.conversation = config.conversation;
		this.messageBudget = config.messageBudget ?? DEFAULT_MESSAGE_BUDGET;
		this.agent = config.agent ?? createUserProxyAgent({ modelId: config.modelId });
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

		if (isRepeat) return buildAutoApprovePayload(event);

		const det = tryDeterministicConfirmationResponse(event);
		if (det) return det;

		const prompt = buildConfirmationPrompt(this.promptContext(), event);
		const decision = await this.agent.decide(prompt);
		if (!decision) return buildAutoApprovePayload(event);

		const encoded = encodeConfirmationDecision(decision);
		return encoded ?? buildAutoApprovePayload(event);
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	return isRecord(value) ? value : undefined;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	return typeof value === 'string' ? value : undefined;
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
