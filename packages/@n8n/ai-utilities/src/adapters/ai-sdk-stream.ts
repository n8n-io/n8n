import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
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
	name?: string;
	input: string;
	/** Whether `tool-input-start` was emitted. That needs the tool name. */
	started: boolean;
}

/**
 * Turns the flat chat model stream into the AI SDK stream, which brackets
 * every text, reasoning and tool input with start and end parts.
 */
export class AiSdkStreamConverter {
	private readonly openText = new Set<string>();

	private readonly openReasoning = new Set<string>();

	private readonly toolCalls = new Map<string, ToolCallState>();

	/** Tool call that deltas without an id belong to. */
	private currentToolCallId: string | undefined;

	private finished = false;

	convert(chunk: StreamChunk): LanguageModelV3StreamPart[] {
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
	end(): LanguageModelV3StreamPart[] {
		return this.finished ? [] : this.finish('other', undefined);
	}

	private textDelta(id: string, delta: string): LanguageModelV3StreamPart[] {
		const parts: LanguageModelV3StreamPart[] = [];
		if (!this.openText.has(id)) {
			this.openText.add(id);
			parts.push({ type: 'text-start', id });
		}
		parts.push({ type: 'text-delta', id, delta });
		return parts;
	}

	private reasoningDelta(id: string, delta: string): LanguageModelV3StreamPart[] {
		const parts: LanguageModelV3StreamPart[] = [];
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
	): LanguageModelV3StreamPart[] {
		const key = id ?? this.currentToolCallId ?? randomUUID();
		const state = this.toolCalls.get(key) ?? { id: key, input: '', started: false };
		this.toolCalls.set(key, state);
		this.currentToolCallId = key;

		const parts: LanguageModelV3StreamPart[] = [];
		// Chat models send the tool name in one piece. The first one wins, and
		// the tool input starts as soon as it is known.
		if (name && !state.started) {
			state.name = name;
		}
		if (!state.started && state.name) {
			// The input that arrived before the name is sent now, in one delta.
			state.started = true;
			parts.push({ type: 'tool-input-start', id: state.id, toolName: state.name });
			if (state.input) {
				parts.push({ type: 'tool-input-delta', id: state.id, delta: state.input });
			}
		}
		if (argumentsDelta) {
			state.input += argumentsDelta;
			if (state.started) {
				parts.push({ type: 'tool-input-delta', id: state.id, delta: argumentsDelta });
			}
		}
		return parts;
	}

	/** A complete content block is sent as a bracketed part of its own. */
	private content(block: MessageContent, id: string | undefined): LanguageModelV3StreamPart[] {
		const parts: LanguageModelV3StreamPart[] = [];

		for (const part of fromChatModelMessage({ role: 'assistant', content: [block] })) {
			switch (part.type) {
				case 'text': {
					const textId = id ?? randomUUID();
					parts.push(...this.textDelta(textId, part.text), { type: 'text-end', id: textId });
					this.openText.delete(textId);
					break;
				}
				case 'reasoning': {
					const reasoningId = id ?? randomUUID();
					parts.push(...this.reasoningDelta(reasoningId, part.text), {
						type: 'reasoning-end',
						id: reasoningId,
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

	private closeToolCall(id: string): LanguageModelV3StreamPart[] {
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
	): LanguageModelV3StreamPart[] {
		const parts: LanguageModelV3StreamPart[] = [];

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
