import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { ModelMessage } from 'ai';

import { toAiMessages } from './messages';
import { stringifyError } from './runtime-helpers';
import { stripOrphanedToolMessages } from './strip-orphaned-tool-messages';
import { buildWorkingMemoryInstruction } from './working-memory';
import { filterLlmMessages, getCreatedAt } from '../sdk/message';
import type { SerializedMessageList } from '../types/runtime/message-list';
import type { AgentDbMessage, AgentMessage, ContentToolCall } from '../types/sdk/message';
import type { JSONValue } from '../types/utils/json';

export type { SerializedMessageList };

type MessageSource = 'history' | 'input' | 'response';

export interface WorkingMemoryContext {
	template: string;
	structured: boolean;
	/** The current persisted state, or null if not yet loaded. Falls back to template. */
	state: string | null;
	/** Custom instruction text. When absent the default instruction is used. */
	instruction?: string;
}

/**
 * Message container with Set-based source tracking.
 *
 * Three named sources:
 *   history   — messages loaded from memory at the start of the turn.
 *               Never included in turnDelta(); already persisted.
 *   input     — the caller's raw input for this turn (custom messages preserved).
 *   response  — LLM replies, tool results, and custom tool messages from this turn.
 *
 * After each `addHistory` / `addInput` / `addResponse` batch, `all` is sorted by
 * `createdAt` ascending, then `id`, so transcript order matches timestamps.
 *
 * Serialization stores the flat message array plus the IDs of each set so
 * the full three-way source distinction survives a round-trip.
 */
export class AgentMessageList {
	private all: AgentDbMessage[] = [];

	private historySet = new Set<AgentDbMessage>();

	private inputSet = new Set<AgentDbMessage>();

	private responseSet = new Set<AgentDbMessage>();

	private lastCreatedAt: number = 0;

	/**
	 * Normalize an AgentMessage into an AgentDbMessage and push it onto `this.all`,
	 * enforcing monotonically increasing createdAt across the list.
	 *
	 * source === 'history':
	 *   The message is loaded from the database and already carries the authoritative
	 *   createdAt.  It is preserved exactly; lastCreatedAt is updated to the max so
	 *   that subsequent live messages stay strictly later.
	 *
	 * source === 'input' | 'response':
	 *   The message is a live, in-flight message.  Its existing createdAt (if any)
	 *   is used as a hint, but it is bumped to max(hint, lastCreatedAt + 1) so
	 *   every message in the list has a unique, ordered timestamp.
	 *   If no createdAt is present, Date.now() is used as the hint.
	 */
	private addMessage(message: AgentMessage, source: MessageSource): AgentDbMessage {
		const id = 'id' in message && typeof message.id === 'string' ? message.id : crypto.randomUUID();
		const existing = getCreatedAt(message);

		let createdAt: Date;
		if (existing !== null && source === 'history') {
			// DB-loaded history message — keep the original timestamp exactly
			createdAt = existing;
			this.lastCreatedAt = Math.max(this.lastCreatedAt, createdAt.getTime());
		} else {
			// Live message — use any existing createdAt as a hint, then ensure monotonicity
			const hint = existing !== null ? existing.getTime() : Date.now();
			const ts = Math.max(hint, this.lastCreatedAt + 1);
			createdAt = new Date(ts);
			this.lastCreatedAt = ts;
		}

		const dbMsg: AgentDbMessage = { ...message, id, createdAt };
		this.all.push(dbMsg);
		return dbMsg;
	}

	/** Sort key for chronological ordering; non-finite times sort last. */
	private createdAtSortKey(m: AgentDbMessage): number {
		const t = m.createdAt instanceof Date ? m.createdAt.getTime() : new Date(m.createdAt).getTime();
		return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
	}

	/** Stable sort by `createdAt`, then `id`; refreshes `lastCreatedAt` from `all`. */
	private sortAllByCreatedAt(): void {
		this.all.sort((a, b) => {
			const ta = this.createdAtSortKey(a);
			const tb = this.createdAtSortKey(b);
			if (ta !== tb) return ta < tb ? -1 : 1;
			return a.id.localeCompare(b.id);
		});
		let max = 0;
		for (const m of this.all) {
			const t =
				m.createdAt instanceof Date ? m.createdAt.getTime() : new Date(m.createdAt).getTime();
			if (Number.isFinite(t) && t > max) max = t;
		}
		this.lastCreatedAt = max;
	}

	/** Working memory context for this run. Set by buildMessageList / resume. */
	workingMemory: WorkingMemoryContext | undefined;

	addHistory(messages: AgentMessage[] | AgentDbMessage[]): void {
		for (const m of messages) {
			const dbMsg = this.addMessage(m, 'history');
			this.historySet.add(dbMsg);
		}
		this.sortAllByCreatedAt();
	}

	addInput(messages: AgentMessage[] | AgentDbMessage[]): void {
		for (const m of messages) {
			const dbMsg = this.addMessage(m, 'input');
			this.inputSet.add(dbMsg);
		}
		this.sortAllByCreatedAt();
	}

	addResponse(messages: AgentMessage[] | AgentDbMessage[]): void {
		for (const m of messages) {
			const dbMsg = this.addMessage(m, 'response');
			this.responseSet.add(dbMsg);
		}
		this.sortAllByCreatedAt();
	}

	/**
	 * Locate the assistant message hosting the given toolCallId and mark the
	 * block as resolved with the supplied output.
	 *
	 * Returns the mutated host message, or `undefined` if the toolCallId is
	 * not found (internal invariant violation — caller should log/throw).
	 */
	setToolCallResult(toolCallId: string, output: JSONValue): AgentDbMessage | undefined {
		const host = this.findToolCallHost(toolCallId);
		if (!host) return undefined;

		const block = this.findToolCallBlock(host, toolCallId);
		if (!block) return undefined;

		const mutableBlock = block;
		mutableBlock.state = 'resolved';
		(mutableBlock as Extract<ContentToolCall, { state: 'resolved' }>).output = output;
		if ('error' in mutableBlock) {
			delete (mutableBlock as { error: unknown }).error;
		}

		this.responseSet.add(host);
		return host;
	}

	/**
	 * Locate the assistant message hosting the given toolCallId and mark the
	 * block as rejected with the supplied error.
	 *
	 * Returns the mutated host message, or `undefined` if the toolCallId is
	 * not found (internal invariant violation — caller should log/throw).
	 */
	setToolCallError(toolCallId: string, error: unknown): AgentDbMessage | undefined {
		const host = this.findToolCallHost(toolCallId);
		if (!host) return undefined;

		const block = this.findToolCallBlock(host, toolCallId)!;
		const mutableBlock = block;
		mutableBlock.state = 'rejected';
		(mutableBlock as Extract<ContentToolCall, { state: 'rejected' }>).error = stringifyError(error);
		if ('output' in mutableBlock) {
			delete (mutableBlock as { output: unknown }).output;
		}

		this.responseSet.add(host);
		return host;
	}

	private findToolCallHost(toolCallId: string): AgentDbMessage | undefined {
		// Start from the last message and go backwards to find the host message
		for (let i = this.all.length - 1; i >= 0; i--) {
			const m = this.all[i];
			if (
				'content' in m &&
				Array.isArray(m.content) &&
				m.content.some((c) => c.type === 'tool-call' && c.toolCallId === toolCallId)
			) {
				return m;
			}
		}
		return undefined;
	}

	private findToolCallBlock(host: AgentDbMessage, toolCallId: string): ContentToolCall | undefined {
		if (!('content' in host) || !Array.isArray(host.content)) return undefined;
		return host.content.find(
			(c): c is ContentToolCall => c.type === 'tool-call' && c.toolCallId === toolCallId,
		);
	}

	/**
	 * Full LLM context for a generateText / streamText call.
	 * Prepends the system prompt (with working memory appended if configured),
	 * strips custom messages via filterLlmMessages.
	 */
	forLlm(baseInstructions: string, instructionProviderOptions?: ProviderOptions): ModelMessage[] {
		let systemPrompt = baseInstructions;

		if (this.workingMemory) {
			const wmInstruction = buildWorkingMemoryInstruction(
				this.workingMemory.template,
				this.workingMemory.structured,
				this.workingMemory.instruction,
			);
			const wmState = this.workingMemory.state ?? this.workingMemory.template;
			systemPrompt +=
				wmInstruction + '\n\nCurrent working memory state:\n```\n' + wmState + '\n```\n';
		}

		const systemMessage: ModelMessage = instructionProviderOptions
			? { role: 'system', content: systemPrompt, providerOptions: instructionProviderOptions }
			: { role: 'system', content: systemPrompt };
		return [systemMessage, ...toAiMessages(filterLlmMessages(stripOrphanedToolMessages(this.all)))];
	}

	/**
	 * Current-turn delta for memory persistence (input + responses).
	 * Non-destructive — safe to call multiple times (e.g. on retry).
	 */
	turnDelta(): AgentDbMessage[] {
		return this.all.filter((m) => this.inputSet.has(m) || this.responseSet.has(m));
	}

	/**
	 * Only the LLM-produced messages from this turn (responses + tool results).
	 * Used for GenerateResult.messages — callers should not see their own input echoed back.
	 */
	responseDelta(): AgentDbMessage[] {
		return this.all.filter((m) => this.responseSet.has(m));
	}

	serialize(): SerializedMessageList {
		const toIds = (set: Set<AgentDbMessage>) => Array.from(set).map((m) => m.id);
		return {
			messages: [...this.all],
			historyIds: toIds(this.historySet),
			inputIds: toIds(this.inputSet),
			responseIds: toIds(this.responseSet),
		};
	}

	static deserialize(data: SerializedMessageList): AgentMessageList {
		const list = new AgentMessageList();
		const historyIdSet = new Set(data.historyIds);
		const inputIdSet = new Set(data.inputIds);
		const responseIdSet = new Set(data.responseIds);
		for (const m of data.messages) {
			list.all.push(m);
			if (historyIdSet.has(m.id)) list.historySet.add(m);
			if (inputIdSet.has(m.id)) list.inputSet.add(m);
			if (responseIdSet.has(m.id)) list.responseSet.add(m);
		}
		list.sortAllByCreatedAt();
		return list;
	}
}
