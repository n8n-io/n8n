import type {
	LanguageModelV4StreamPart,
	LanguageModelV4ToolCall,
	LanguageModelV4ToolResult,
	SharedV4ProviderMetadata,
} from '@ai-sdk/provider';
import { randomUUID } from 'node:crypto';

import { toFinishReason, toUsage } from '../converters/ai-sdk-call';
import { fromChatModelMessage, toProviderMetadata } from '../converters/ai-sdk-message';
import type { MessageContent } from '../types/message';
import type { FinishReason, StreamChunk, TokenUsage } from '../types/output';

/** Ids for streamed text and reasoning when the chat model does not number its parts. */
const DEFAULT_TEXT_ID = 'text';
const DEFAULT_REASONING_ID = 'reasoning';

interface ToolCallState {
	id: string;
	/** Set when `tool-input-start` is sent. The AI SDK needs the name to start. */
	name?: string;
	input: string;
	/** Chat model metadata of all chunks of the call. */
	metadata?: Record<string, unknown>;
}

/**
 * Turns the flat chat model stream into the AI SDK stream, which brackets
 * every text, reasoning and tool input with start and end parts.
 *
 * Tool call deltas are matched by id, so parallel tool calls can interleave.
 * A delta without an id continues the tool call that got the last delta,
 * because `tool-call-delta` has no index to tell parallel calls apart.
 *
 * Complete tool calls are held back until the finish. A tool result from the
 * chat model releases its call first, marked as executed by the provider.
 */
export class AiSdkStreamConverter {
	private readonly openText = new Set<string>();

	private readonly openReasoning = new Set<string>();

	private readonly openToolCalls = new Map<string, ToolCallState>();

	private readonly readyToolCalls = new Map<string, LanguageModelV4ToolCall>();

	/** Names of all tool calls of the stream, for the tool results that follow them. */
	private readonly toolNames = new Map<string, string>();

	/** Tool call that deltas without an id belong to. */
	private currentToolCallId: string | undefined;

	/** Set by an error chunk or an error finish. A failed turn sends no tool calls. */
	private failed = false;

	private finished = false;

	constructor(private readonly provider: string) {}

	convert(chunk: StreamChunk): LanguageModelV4StreamPart[] {
		const providerMetadata = toProviderMetadata(this.provider, chunk.providerMetadata);

		switch (chunk.type) {
			case 'text-delta':
				return this.textDelta(chunk.id ?? DEFAULT_TEXT_ID, chunk.delta, providerMetadata);
			case 'reasoning-delta':
				return this.reasoningDelta(chunk.id ?? DEFAULT_REASONING_ID, chunk.delta, providerMetadata);
			case 'tool-call-delta': {
				const state = this.openToolCall(chunk.id ?? this.currentToolCallId ?? randomUUID());
				this.currentToolCallId = state.id;
				return this.appendToolInput(
					state,
					chunk.name,
					chunk.argumentsDelta,
					chunk.providerMetadata,
				);
			}
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

	private textDelta(
		id: string,
		delta: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		if (!this.openText.has(id)) {
			this.openText.add(id);
			parts.push({ type: 'text-start', id });
		}
		parts.push({ type: 'text-delta', id, delta, providerMetadata });
		return parts;
	}

	private reasoningDelta(
		id: string,
		delta: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		if (!this.openReasoning.has(id)) {
			this.openReasoning.add(id);
			parts.push({ type: 'reasoning-start', id });
		}
		parts.push({ type: 'reasoning-delta', id, delta, providerMetadata });
		return parts;
	}

	private openToolCall(id: string): ToolCallState {
		const state = this.openToolCalls.get(id) ?? { id, input: '' };
		this.openToolCalls.set(id, state);
		return state;
	}

	private appendToolInput(
		state: ToolCallState,
		name: string | undefined,
		argumentsDelta: string | undefined,
		metadata: Record<string, unknown> | undefined,
	): LanguageModelV4StreamPart[] {
		if (metadata) state.metadata = { ...state.metadata, ...metadata };

		const parts: LanguageModelV4StreamPart[] = [];
		// The name is not streamed in fragments: chat models send it whole, and
		// some repeat it on every delta. The first name starts the tool input,
		// and the input that arrived before it is sent in one delta.
		if (name && state.name === undefined) {
			state.name = name;
			this.toolNames.set(state.id, name);
			parts.push({ type: 'tool-input-start', id: state.id, toolName: name });
			if (state.input) {
				parts.push({ type: 'tool-input-delta', id: state.id, delta: state.input });
			}
		}
		if (argumentsDelta) {
			state.input += argumentsDelta;
			if (state.name !== undefined) {
				parts.push({ type: 'tool-input-delta', id: state.id, delta: argumentsDelta });
			}
		}
		return parts;
	}

	/** A complete content block is sent as a bracketed part of its own. */
	private content(
		block: MessageContent,
		id: string | undefined,
		chunkMetadata: Record<string, unknown> | undefined,
	): LanguageModelV4StreamPart[] {
		const metadata = chunkMetadata ? { ...chunkMetadata, ...block.providerMetadata } : undefined;
		const withChunkMetadata = metadata ? { ...block, providerMetadata: metadata } : block;
		const parts: LanguageModelV4StreamPart[] = [];

		for (const part of fromChatModelMessage(
			{ role: 'assistant', content: [withChunkMetadata] },
			this.provider,
		)) {
			switch (part.type) {
				case 'text': {
					const textId = id ?? randomUUID();
					parts.push(...this.textDelta(textId, part.text, undefined), {
						type: 'text-end',
						id: textId,
						providerMetadata: part.providerMetadata,
					});
					this.openText.delete(textId);
					break;
				}
				case 'reasoning': {
					const reasoningId = id ?? randomUUID();
					parts.push(...this.reasoningDelta(reasoningId, part.text, undefined), {
						type: 'reasoning-end',
						id: reasoningId,
						providerMetadata: part.providerMetadata,
					});
					this.openReasoning.delete(reasoningId);
					break;
				}
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
		if (this.currentToolCallId === state.id) this.currentToolCallId = undefined;
		// Without a name there is no tool to call.
		if (state.name === undefined) return [];

		this.readyToolCalls.set(state.id, {
			type: 'tool-call',
			toolCallId: state.id,
			toolName: state.name,
			input: state.input || '{}',
			providerMetadata: toProviderMetadata(this.provider, state.metadata),
		});
		return [{ type: 'tool-input-end', id: state.id }];
	}

	private finish(
		finishReason: FinishReason,
		usage: TokenUsage | undefined,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		if (finishReason === 'error') this.failed = true;
		const parts: LanguageModelV4StreamPart[] = [];

		for (const id of this.openText) parts.push({ type: 'text-end', id });
		this.openText.clear();
		for (const id of this.openReasoning) parts.push({ type: 'reasoning-end', id });
		this.openReasoning.clear();
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
