import type {
	LanguageModelV4StreamPart,
	LanguageModelV4ToolCall,
	LanguageModelV4ToolResult,
	SharedV4ProviderMetadata,
} from '@ai-sdk/provider';
import { randomUUID } from 'node:crypto';

import type { NormalizedStreamChunk } from './normalize-tool-call-deltas';
import { toFinishReason, toUsage } from '../converters/ai-sdk-call';
import { fromChatModelMessage, toProviderMetadata } from '../converters/ai-sdk-message';
import type { MessageContent } from '../types/message';
import type { FinishReason, TokenUsage } from '../types/output';

/** Ids for streamed text and reasoning when the chat model does not number its parts. */
const DEFAULT_TEXT_ID = 'text';
const DEFAULT_REASONING_ID = 'reasoning';

type TextKind = 'text' | 'reasoning';

interface ToolCallState {
	id: string;
	name?: string;
	/** Whether `tool-input-start` was sent. It needs the name. */
	started: boolean;
	input: string;
	/** Chat model metadata of all chunks of the call. */
	metadata?: Record<string, unknown>;
}

/**
 * Turns the flat chat model stream into the AI SDK stream, which brackets
 * every text, reasoning and tool input with start and end parts.
 *
 * Tool call deltas are matched by id, so parallel tool calls can interleave.
 * normalizeToolCallDeltas gives every delta its id before it gets here.
 *
 * A complete text, reasoning or tool call block closes the open part with its
 * id, or the only open part when it has no id. Only the part of the block that
 * was not streamed yet is sent.
 *
 * Complete tool calls are held back until the finish. A tool result from the
 * chat model releases its call first, marked as executed by the provider.
 */
export class AiSdkStreamConverter {
	/** Open text and reasoning parts, with the text sent for each so far. */
	private readonly openText = new Map<string, string>();

	private readonly openReasoning = new Map<string, string>();

	private readonly openToolCalls = new Map<string, ToolCallState>();

	private readonly readyToolCalls = new Map<string, LanguageModelV4ToolCall>();

	/** Names of all tool calls of the stream, for the tool results that follow them. */
	private readonly toolNames = new Map<string, string>();

	/** Set by an error chunk or an error finish. A failed turn sends no tool calls. */
	private failed = false;

	private finished = false;

	constructor(private readonly provider: string) {}

	convert(chunk: NormalizedStreamChunk): LanguageModelV4StreamPart[] {
		const providerMetadata = toProviderMetadata(this.provider, chunk.providerMetadata);

		switch (chunk.type) {
			case 'text-delta':
				return this.delta('text', chunk.id ?? DEFAULT_TEXT_ID, chunk.delta, providerMetadata);
			case 'reasoning-delta':
				return this.delta(
					'reasoning',
					chunk.id ?? DEFAULT_REASONING_ID,
					chunk.delta,
					providerMetadata,
				);
			case 'tool-call-delta':
				return this.appendToolInput(
					this.openToolCall(chunk.id),
					chunk.name,
					chunk.argumentsDelta,
					chunk.providerMetadata,
				);
			case 'content':
				return this.content(chunk.content, chunk.id, chunk.providerMetadata);
			case 'finish':
				return this.finish(chunk.finishReason, chunk.usage, providerMetadata);
			case 'error':
				this.failed = true;
				return [{ type: 'error', error: chunk.error }];
		}
	}

	/** Closes what is still open when the chat model stream ends. */
	end(): LanguageModelV4StreamPart[] {
		return this.finished ? [] : this.finish('other', undefined, undefined);
	}

	private openParts(kind: TextKind): Map<string, string> {
		return kind === 'text' ? this.openText : this.openReasoning;
	}

	private delta(
		kind: TextKind,
		id: string,
		delta: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		const open = this.openParts(kind);
		const sent = open.get(id);
		open.set(id, (sent ?? '') + delta);

		const parts: LanguageModelV4StreamPart[] = [];
		if (sent === undefined) {
			parts.push(kind === 'text' ? { type: 'text-start', id } : { type: 'reasoning-start', id });
		}
		parts.push(
			kind === 'text'
				? { type: 'text-delta', id, delta, providerMetadata }
				: { type: 'reasoning-delta', id, delta, providerMetadata },
		);
		return parts;
	}

	private endPart(
		kind: TextKind,
		id: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart {
		this.openParts(kind).delete(id);
		return kind === 'text'
			? { type: 'text-end', id, providerMetadata }
			: { type: 'reasoning-end', id, providerMetadata };
	}

	private completePart(
		kind: TextKind,
		id: string | undefined,
		text: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		const open = this.openParts(kind);
		const openId = id ?? onlyKey(open);
		const sent = openId === undefined ? undefined : open.get(openId);
		const parts: LanguageModelV4StreamPart[] = [];

		let partId: string;
		let rest = text;
		if (openId !== undefined && sent !== undefined && text.startsWith(sent)) {
			partId = openId;
			rest = text.slice(sent.length);
		} else {
			// A block that does not continue the streamed text cannot replace what
			// was sent. The streamed part ends as it is, and the block becomes a
			// part of its own.
			if (id !== undefined && sent !== undefined) parts.push(this.endPart(kind, id, undefined));
			partId = id !== undefined && sent === undefined ? id : randomUUID();
		}

		if (rest !== '' || !open.has(partId)) {
			parts.push(...this.delta(kind, partId, rest, undefined));
		}
		parts.push(this.endPart(kind, partId, providerMetadata));
		return parts;
	}

	private openToolCall(id: string): ToolCallState {
		const state = this.openToolCalls.get(id) ?? { id, started: false, input: '' };
		this.openToolCalls.set(id, state);
		return state;
	}

	private startToolInput(state: ToolCallState, name: string): LanguageModelV4StreamPart[] {
		state.started = true;
		this.toolNames.set(state.id, name);
		const parts: LanguageModelV4StreamPart[] = [
			{ type: 'tool-input-start', id: state.id, toolName: name },
		];
		if (state.input) parts.push({ type: 'tool-input-delta', id: state.id, delta: state.input });
		return parts;
	}

	private appendToolInput(
		state: ToolCallState,
		name: string | undefined,
		argumentsDelta: string | undefined,
		metadata: Record<string, unknown> | undefined,
	): LanguageModelV4StreamPart[] {
		if (metadata) state.metadata = { ...state.metadata, ...metadata };

		// The name is not streamed in fragments: chat models send it whole, and
		// some repeat it on every delta. The first name wins.
		if (name && state.name === undefined) state.name = name;
		if (argumentsDelta) state.input += argumentsDelta;

		if (state.started) {
			return argumentsDelta
				? [{ type: 'tool-input-delta', id: state.id, delta: argumentsDelta }]
				: [];
		}
		// The input that arrived before the start is sent in one delta.
		return state.name !== undefined ? this.startToolInput(state, state.name) : [];
	}

	/** A complete content block is sent as a bracketed part of its own. */
	private content(
		block: MessageContent,
		id: string | undefined,
		chunkMetadata: Record<string, unknown> | undefined,
	): LanguageModelV4StreamPart[] {
		const metadata = chunkMetadata ? { ...chunkMetadata, ...block.providerMetadata } : undefined;
		const withChunkMetadata = this.withPendingToolCallId(
			metadata ? { ...block, providerMetadata: metadata } : block,
		);
		const parts: LanguageModelV4StreamPart[] = [];

		for (const part of fromChatModelMessage(
			{ role: 'assistant', content: [withChunkMetadata] },
			this.provider,
		)) {
			switch (part.type) {
				case 'text':
				case 'reasoning':
					parts.push(...this.completePart(part.type, id, part.text, part.providerMetadata));
					break;
				case 'tool-call':
					parts.push(...this.completeToolCall(part, withChunkMetadata.providerMetadata));
					break;
				case 'tool-result':
					parts.push(...this.providerToolResult(part));
					break;
				default:
					parts.push(part);
			}
		}

		return parts;
	}

	/**
	 * A complete tool call without an id belongs to the pending call only when
	 * one call is open and its name does not contradict the block.
	 */
	private withPendingToolCallId(block: MessageContent): MessageContent {
		if (block.type !== 'tool-call' || block.toolCallId !== undefined) return block;
		const pendingId = onlyKey(this.openToolCalls);
		const pending = pendingId === undefined ? undefined : this.openToolCalls.get(pendingId);
		if (!pending || (pending.name !== undefined && pending.name !== block.toolName)) return block;
		return { ...block, toolCallId: pending.id };
	}

	/** A complete tool call ends the deltas streamed for it before. Its input is the final one. */
	private completeToolCall(
		part: LanguageModelV4ToolCall,
		metadata: Record<string, unknown> | undefined,
	): LanguageModelV4StreamPart[] {
		const state = this.openToolCall(part.toolCallId);
		const parts = this.appendToolInput(state, part.toolName, undefined, metadata);
		if (part.input.startsWith(state.input)) {
			parts.push(
				...this.appendToolInput(state, undefined, part.input.slice(state.input.length), undefined),
			);
		}
		state.input = part.input;
		parts.push(...this.closeToolCall(state));
		return parts;
	}

	private providerToolResult(part: LanguageModelV4ToolResult): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		const open = this.openToolCalls.get(part.toolCallId);
		if (open) parts.push(...this.closeToolCall(open));

		const call = this.readyToolCalls.get(part.toolCallId);
		if (call) {
			this.readyToolCalls.delete(part.toolCallId);
			parts.push({ ...call, providerExecuted: true });
		}
		parts.push({ ...part, toolName: this.toolNames.get(part.toolCallId) ?? part.toolName });
		return parts;
	}

	private closeToolCall(state: ToolCallState): LanguageModelV4StreamPart[] {
		this.openToolCalls.delete(state.id);
		// Without a name there is no tool to call.
		if (state.name === undefined) return [];

		const parts: LanguageModelV4StreamPart[] = [];
		this.readyToolCalls.set(state.id, {
			type: 'tool-call',
			toolCallId: state.id,
			toolName: state.name,
			input: state.input || '{}',
			providerMetadata: toProviderMetadata(this.provider, state.metadata),
		});
		parts.push({ type: 'tool-input-end', id: state.id });
		return parts;
	}

	private finish(
		finishReason: FinishReason,
		usage: TokenUsage | undefined,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		if (finishReason === 'error') this.failed = true;
		const parts: LanguageModelV4StreamPart[] = [];

		for (const id of [...this.openText.keys()]) parts.push(this.endPart('text', id, undefined));
		for (const id of [...this.openReasoning.keys()]) {
			parts.push(this.endPart('reasoning', id, undefined));
		}
		for (const state of [...this.openToolCalls.values()]) parts.push(...this.closeToolCall(state));
		if (!this.failed) parts.push(...this.readyToolCalls.values());
		this.readyToolCalls.clear();

		parts.push({
			type: 'finish',
			finishReason: toFinishReason(this.failed ? 'error' : finishReason),
			usage: toUsage(usage),
			providerMetadata,
		});
		this.finished = true;
		return parts;
	}
}

function onlyKey<T>(map: Map<string, T>): string | undefined {
	return map.size === 1 ? map.keys().next().value : undefined;
}
