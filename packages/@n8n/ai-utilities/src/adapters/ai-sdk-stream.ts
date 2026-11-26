import type {
	LanguageModelV4StreamPart,
	LanguageModelV4ToolCall,
	LanguageModelV4ToolResult,
	SharedV4ProviderMetadata,
} from '@ai-sdk/provider';
import { UserError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import { toAiSdkFinishReason, toAiSdkUsage } from '../converters/ai-sdk-call';
import { toAiSdkContent, toAiSdkProviderMetadata } from '../converters/ai-sdk-message';
import type { MessageContent } from '../types/message';
import type { FinishReason, StreamChunk, TokenUsage } from '../types/output';

/** Ids for streamed text and reasoning when the chat model does not number its parts. */
const DEFAULT_TEXT_ID = 'text';
const DEFAULT_REASONING_ID = 'reasoning';

const TEXT_KINDS = ['text', 'reasoning'] as const;

type TextKind = (typeof TEXT_KINDS)[number];

type ToolCallState = {
	readonly id: string;
	/** The AI SDK opens a tool input with its name, so the input starts with the name. */
	name?: string;
	input: string;
	/** Chat model metadata of all chunks of the call. */
	metadata?: Record<string, unknown>;
};

type ReceivedFinish = {
	readonly reason: FinishReason;
	readonly usage?: TokenUsage;
	readonly providerMetadata?: SharedV4ProviderMetadata;
};

/**
 * The first finish chunk closes the open parts. The AI SDK finish waits for the
 * end of the stream, because a later finish chunk can carry the usage.
 */
type Phase =
	| { readonly kind: 'streaming' }
	| { readonly kind: 'finishing'; readonly finish: ReceivedFinish }
	| { readonly kind: 'ended' };

type ContentChunk = Exclude<StreamChunk, { type: 'finish' }>;

/**
 * Turns the flat chat model stream into the AI SDK stream, which brackets every
 * text, reasoning and tool input with start and end parts. Tool call deltas are
 * matched by id. A complete block closes the open part with its id, or the only
 * open part, and sends only what was not streamed yet. Complete tool calls are
 * held back until the finish, or until a tool result of the chat model.
 */
export class AiSdkStreamConverter {
	/** Open text and reasoning parts, with the text sent for each so far. */
	private readonly openTextParts: Record<TextKind, Map<string, string>> = {
		text: new Map(),
		reasoning: new Map(),
	};

	private readonly openToolCalls = new Map<string, ToolCallState>();

	private lastToolCallId?: string;

	private readonly readyToolCalls = new Map<string, LanguageModelV4ToolCall>();

	/** Names of all tool calls of the stream, for the tool results that follow them. */
	private readonly toolNames = new Map<string, string>();

	/** Set by an error chunk or an error finish. A failed turn sends no tool calls. */
	private failed = false;

	private phase: Phase = { kind: 'streaming' };

	constructor(
		private readonly provider: string,
		private readonly modelId: string,
	) {}

	convert(chunk: StreamChunk): LanguageModelV4StreamPart[] {
		const { phase } = this;
		const providerMetadata = toAiSdkProviderMetadata(this.provider, chunk.providerMetadata);
		switch (phase.kind) {
			case 'streaming':
				return chunk.type === 'finish'
					? this.startFinish({ reason: chunk.finishReason, usage: chunk.usage, providerMetadata })
					: this.convertContent(chunk, providerMetadata);
			case 'finishing':
				// After the finish only a finish with the last usage is expected.
				if (chunk.type === 'finish') {
					this.phase = {
						kind: 'finishing',
						finish: {
							reason: chunk.finishReason,
							usage: chunk.usage ?? phase.finish.usage,
							providerMetadata: providerMetadata ?? phase.finish.providerMetadata,
						},
					};
				}
				return [];
			case 'ended':
				return [];
		}
	}

	/** Closes what is still open and sends the finish when the chat model stream ends. */
	end(): LanguageModelV4StreamPart[] {
		const { phase } = this;
		switch (phase.kind) {
			case 'streaming':
				return [...this.closeAll(), this.sendFinish({ reason: 'other' })];
			case 'finishing':
				return [this.sendFinish(phase.finish)];
			case 'ended':
				return [];
		}
	}

	/** Sends an error that stopped the stream, then closes what is still open. */
	fail(error: unknown): LanguageModelV4StreamPart[] {
		this.failed = true;
		return [{ type: 'error', error }, ...this.end()];
	}

	private convertContent(
		chunk: ContentChunk,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
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
			case 'tool-call-delta': {
				const id = chunk.id || this.continuedToolCallId();
				this.lastToolCallId = id;
				return this.appendToolInput(
					this.openToolCall(id),
					chunk.name,
					chunk.argumentsDelta,
					chunk.providerMetadata,
				);
			}
			case 'content':
				return this.content(chunk.content, chunk.id, chunk.providerMetadata);
			case 'error':
				this.failed = true;
				return [{ type: 'error', error: chunk.error }];
			// A community node built against another SDK version can send a chunk
			// type that the contract does not have.
			default:
				throw new UserError(
					`The chat model "${this.provider}/${this.modelId}" streamed a chunk of an unknown type`,
				);
		}
	}

	private delta(
		kind: TextKind,
		id: string,
		delta: string,
		providerMetadata: SharedV4ProviderMetadata | undefined,
	): LanguageModelV4StreamPart[] {
		const open = this.openTextParts[kind];
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
		this.openTextParts[kind].delete(id);
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
		const open = this.openTextParts[kind];
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
			if (openId !== undefined && sent !== undefined) {
				parts.push(this.endPart(kind, openId, undefined));
			}
			partId = id !== undefined && sent === undefined ? id : randomUUID();
		}

		if (rest !== '' || !open.has(partId)) {
			parts.push(...this.delta(kind, partId, rest, undefined));
		}
		parts.push(this.endPart(kind, partId, providerMetadata));
		return parts;
	}

	/**
	 * Many providers send the id only in the first chunk of a tool call. Like in
	 * the LangChain adapter, a delta without an id continues the last call.
	 */
	private continuedToolCallId(): string {
		const last = this.lastToolCallId;
		return last !== undefined && this.openToolCalls.has(last) ? last : randomUUID();
	}

	private openToolCall(id: string): ToolCallState {
		const state = this.openToolCalls.get(id) ?? { id, input: '' };
		this.openToolCalls.set(id, state);
		return state;
	}

	private startToolInput(state: ToolCallState, name: string): LanguageModelV4StreamPart[] {
		state.name = name;
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

		if (argumentsDelta) state.input += argumentsDelta;

		// The name is not streamed in fragments: chat models send it whole, and
		// some repeat it on every delta. The first name wins.
		if (state.name !== undefined) {
			return argumentsDelta
				? [{ type: 'tool-input-delta', id: state.id, delta: argumentsDelta }]
				: [];
		}
		// The input that arrived before the start is sent in one delta.
		if (name) return this.startToolInput(state, name);
		return [];
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
		const { content, warnings } = toAiSdkContent(
			{ role: 'assistant', content: [withChunkMetadata] },
			this.provider,
		);
		// Warnings go out in stream-start, before the first chunk. A block that
		// is dropped later is reported as an error part instead.
		const parts: LanguageModelV4StreamPart[] = warnings.map(({ feature, details }) => ({
			type: 'error',
			error: new UserError(
				`The chat model "${this.provider}/${this.modelId}" streamed an unsupported ${feature}`,
				{ description: details },
			),
		}));
		for (const part of content) {
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
		// Without a name there is no tool to call, so the call is lost.
		if (state.name === undefined) {
			const message = `The chat model "${this.provider}/${this.modelId}" streamed a tool call without a name`;
			return [{ type: 'error', error: new UserError(message) }];
		}

		this.readyToolCalls.set(state.id, {
			type: 'tool-call',
			toolCallId: state.id,
			toolName: state.name,
			input: state.input || '{}',
			providerMetadata: toAiSdkProviderMetadata(this.provider, state.metadata),
		});
		return [{ type: 'tool-input-end', id: state.id }];
	}

	private startFinish(finish: ReceivedFinish): LanguageModelV4StreamPart[] {
		if (finish.reason === 'error') this.failed = true;
		this.phase = { kind: 'finishing', finish };
		return this.closeAll();
	}

	private sendFinish(finish: ReceivedFinish): LanguageModelV4StreamPart {
		this.phase = { kind: 'ended' };
		return {
			type: 'finish',
			finishReason: toAiSdkFinishReason(this.failed ? 'error' : finish.reason),
			usage: toAiSdkUsage(finish.usage),
			providerMetadata: finish.providerMetadata,
		};
	}

	/** Ends the open parts and sends the held tool calls, unless the turn failed. */
	private closeAll(): LanguageModelV4StreamPart[] {
		const parts: LanguageModelV4StreamPart[] = [];
		for (const kind of TEXT_KINDS) {
			for (const id of [...this.openTextParts[kind].keys()]) {
				parts.push(this.endPart(kind, id, undefined));
			}
		}
		for (const state of [...this.openToolCalls.values()]) parts.push(...this.closeToolCall(state));
		if (!this.failed) parts.push(...this.readyToolCalls.values());
		this.readyToolCalls.clear();
		return parts;
	}
}

function onlyKey<T>(map: Map<string, T>): string | undefined {
	return map.size === 1 ? map.keys().next().value : undefined;
}
