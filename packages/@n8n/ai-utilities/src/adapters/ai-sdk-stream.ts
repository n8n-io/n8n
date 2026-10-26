import type { LanguageModelV4StreamPart } from '@ai-sdk/provider';
import { randomUUID } from 'node:crypto';

import { toFinishReason, toUsage } from '../converters/ai-sdk-call';
import { fromChatModelMessage } from '../converters/ai-sdk-message';
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
}

/**
 * Turns the flat chat model stream into the AI SDK stream, which brackets
 * every text, reasoning and tool input with start and end parts.
 *
 * Tool call deltas are matched by id, so parallel tool calls can interleave.
 * A delta without an id continues the tool call that got the last delta,
 * because `tool-call-delta` has no index to tell parallel calls apart.
 */
export class AiSdkStreamConverter {
	private readonly openText = new Set<string>();

	private readonly openReasoning = new Set<string>();

	private readonly toolCalls = new Map<string, ToolCallState>();

	/** Tool call that deltas without an id belong to. */
	private currentToolCallId: string | undefined;

	private finished = false;

	convert(chunk: StreamChunk): LanguageModelV4StreamPart[] {
		switch (chunk.type) {
			case 'text-delta':
				return this.textDelta(chunk.id ?? DEFAULT_TEXT_ID, chunk.delta);
			case 'reasoning-delta':
				return this.reasoningDelta(chunk.id ?? DEFAULT_REASONING_ID, chunk.delta);
			case 'tool-call-delta':
				return this.toolCallDelta(chunk.id, chunk.name, chunk.argumentsDelta);
			case 'content':
				return this.content(chunk.content, chunk.id);
			case 'finish':
				return this.finish(chunk.finishReason, chunk.usage);
			case 'error':
				return [{ type: 'error', error: chunk.error }];
		}
	}

	/** Closes what is still open when the chat model stream ends. */
	end(): LanguageModelV4StreamPart[] {
		return this.finished ? [] : this.finish('other', undefined);
	}

	private textDelta(id: string, delta: string): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		if (!this.openText.has(id)) {
			this.openText.add(id);
			parts.push({ type: 'text-start', id });
		}
		parts.push({ type: 'text-delta', id, delta });
		return parts;
	}

	private reasoningDelta(id: string, delta: string): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		if (!this.openReasoning.has(id)) {
			this.openReasoning.add(id);
			parts.push({ type: 'reasoning-start', id });
		}
		parts.push({ type: 'reasoning-delta', id, delta });
		return parts;
	}

	private toolCallDelta(
		id: string | undefined,
		name: string | undefined,
		argumentsDelta: string | undefined,
	): LanguageModelV4StreamPart[] {
		const key = id ?? this.currentToolCallId ?? randomUUID();
		const state = this.toolCalls.get(key) ?? { id: key, input: '' };
		this.toolCalls.set(key, state);
		this.currentToolCallId = key;

		const parts: LanguageModelV4StreamPart[] = [];
		// The name is not streamed in fragments: chat models send it whole, and
		// some repeat it on every delta. The first name starts the tool input,
		// and the input that arrived before it is sent in one delta.
		if (name && state.name === undefined) {
			state.name = name;
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
	private content(block: MessageContent, id: string | undefined): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];

		for (const part of fromChatModelMessage({ role: 'assistant', content: [block] })) {
			switch (part.type) {
				case 'text': {
					const textId = id ?? randomUUID();
					parts.push(...this.textDelta(textId, part.text), {
						type: 'text-end',
						id: textId,
						providerMetadata: part.providerMetadata,
					});
					this.openText.delete(textId);
					break;
				}
				case 'reasoning': {
					const reasoningId = id ?? randomUUID();
					parts.push(...this.reasoningDelta(reasoningId, part.text), {
						type: 'reasoning-end',
						id: reasoningId,
						providerMetadata: part.providerMetadata,
					});
					this.openReasoning.delete(reasoningId);
					break;
				}
				case 'tool-call': {
					const state = this.toolCalls.get(part.toolCallId);
					if (state) {
						// A complete tool call ends the deltas streamed for it before. Its
						// input is the final one and is not repeated as a delta.
						state.input = part.input;
						parts.push(...this.toolCallDelta(part.toolCallId, part.toolName, undefined));
					} else {
						parts.push(...this.toolCallDelta(part.toolCallId, part.toolName, part.input));
					}
					parts.push(...this.closeToolCall(part.toolCallId));
					break;
				}
				default:
					parts.push(part);
			}
		}

		return parts;
	}

	private closeToolCall(id: string): LanguageModelV4StreamPart[] {
		const state = this.toolCalls.get(id);
		this.toolCalls.delete(id);
		if (this.currentToolCallId === id) this.currentToolCallId = undefined;
		// Without a name there is no tool to call.
		if (!state?.name) return [];

		return [
			{ type: 'tool-input-end', id },
			{ type: 'tool-call', toolCallId: id, toolName: state.name, input: state.input || '{}' },
		];
	}

	private finish(
		finishReason: FinishReason,
		usage: TokenUsage | undefined,
	): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];

		for (const id of this.openText) parts.push({ type: 'text-end', id });
		this.openText.clear();
		for (const id of this.openReasoning) parts.push({ type: 'reasoning-end', id });
		this.openReasoning.clear();
		for (const id of [...this.toolCalls.keys()]) parts.push(...this.closeToolCall(id));

		parts.push({
			type: 'finish',
			finishReason: toFinishReason(finishReason),
			usage: toUsage(usage),
		});
		this.finished = true;
		return parts;
	}
}
