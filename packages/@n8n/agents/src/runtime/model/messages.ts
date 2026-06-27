import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';
import type {
	FilePart,
	ModelMessage,
	TextPart,
	ToolCallPart,
	ToolResultPart,
	ImagePart,
	ToolApprovalRequest,
	ToolApprovalResponse,
	FinishReason as AiFinishReason,
} from 'ai';

import type { FinishReason } from '../../types';
import type {
	AgentMessage,
	ContentFile,
	ContentReasoning,
	ContentText,
	ContentToolCall,
	Message,
	MessageContent,
} from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';

/** Reasoning content part — mirrors @ai-sdk/provider-utils ReasoningPart (not re-exported by 'ai'). */
type ReasoningPart = { type: 'reasoning'; text: string };

type AiContentPart =
	| TextPart
	| FilePart
	| ImagePart
	| ReasoningPart
	| ToolCallPart
	| ToolResultPart
	| ToolApprovalRequest
	| ToolApprovalResponse;

// --- Type guards for MessageContent blocks ---

function isText(block: MessageContent): block is ContentText {
	return block.type === 'text';
}

function isReasoning(block: MessageContent): block is ContentReasoning {
	return block.type === 'reasoning';
}

function isFile(block: MessageContent): block is ContentFile {
	return block.type === 'file';
}

function isToolCall(block: MessageContent): block is ContentToolCall {
	return block.type === 'tool-call';
}

type ToolInputNormalizationResult =
	| { ok: true; input: JSONObject }
	| { ok: false; input: JSONObject; error: string };

function describeValue(value: unknown): string {
	if (Array.isArray(value)) return 'array';
	if (value === null) return 'null';
	return typeof value;
}

export function normalizeToolInputForModel(value: unknown): ToolInputNormalizationResult {
	if (typeof value === 'string') {
		try {
			const parsed: unknown = JSON.parse(value);
			if (isJsonObject(parsed)) return { ok: true, input: parsed };
			return {
				ok: false,
				input: {},
				error: `Tool input must be a JSON object, got ${describeValue(parsed)}.`,
			};
		} catch {
			return {
				ok: false,
				input: {},
				error: 'Tool input must be a valid JSON object string.',
			};
		}
	}

	if (isJsonObject(value)) return { ok: true, input: value };
	if (value === null || value === undefined) return { ok: true, input: {} };

	return {
		ok: false,
		input: {},
		error: `Tool input must be a JSON object, got ${describeValue(value)}.`,
	};
}

function toToolInputObject(value: JSONValue): JSONObject {
	return normalizeToolInputForModel(value).input;
}

function isJsonObject(value: unknown): value is JSONObject {
	return isRecord(value);
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

type ContentToolResultOutput = Extract<ToolResultPart['output'], { type: 'content' }>;

function isContentToolResultOutput(value: JSONValue): value is ContentToolResultOutput {
	return isRecord(value) && value.type === 'content' && Array.isArray(value.value);
}

/**
 * Anthropic replays reasoning from `providerOptions`, but the AI SDK exposes the
 * replay `signature`/`redactedData` in `providerMetadata`. Copy them across so
 * the next request can replay the reasoning block. Existing `providerOptions`
 * values win.
 */
function toReasoningProviderOptions(block: ContentReasoning): ProviderOptions | undefined {
	const metadata = getRecord(block.providerMetadata?.anthropic);
	const signature = metadata?.signature;
	const redactedData = metadata?.redactedData;
	if (typeof signature !== 'string' && typeof redactedData !== 'string') {
		return block.providerOptions;
	}

	return {
		...block.providerOptions,
		anthropic: {
			...(typeof signature === 'string' && { signature }),
			...(typeof redactedData === 'string' && { redactedData }),
			...getRecord(block.providerOptions?.anthropic),
		},
	};
}

/** Convert a single n8n MessageContent block to an AI SDK content part. */
function toAiContent(block: MessageContent): AiContentPart | undefined {
	let base: AiContentPart | undefined;
	if (isText(block)) {
		base = { type: 'text', text: block.text };
	} else if (isFile(block)) {
		base = {
			type: 'file',
			data: block.data,
			mediaType: block.mediaType ?? 'application/octet-stream',
		};
	} else if (isToolCall(block)) {
		base = {
			type: 'tool-call',
			toolCallId: block.toolCallId ?? '',
			toolName: block.toolName,
			input: toToolInputObject(block.input),
			providerExecuted: block.providerExecuted,
		};
	} else if (isReasoning(block)) {
		base = { type: 'reasoning', text: block.text };
	}

	if (base) {
		// Provider metadata can be required for replay. Gemini attaches
		// `google.thoughtSignature` to function-call parts, and the next request
		// is rejected if that signature is dropped from conversation history.
		const providerOptions = isReasoning(block)
			? toReasoningProviderOptions(block)
			: block.providerOptions;

		return {
			...base,
			...(block.providerMetadata && { providerMetadata: block.providerMetadata }),
			...(providerOptions && { providerOptions }),
		} as AiContentPart;
	}
	return base;
}

/** Build an AI SDK ToolResultPart from a resolved/rejected ContentToolCall. */
function toolCallToResultPart(
	block: ContentToolCall & { state: 'resolved' | 'rejected' },
): ToolResultPart {
	if (block.state === 'resolved') {
		return {
			type: 'tool-result',
			toolCallId: block.toolCallId,
			toolName: block.toolName,
			output: isContentToolResultOutput(block.output)
				? block.output
				: { type: 'json', value: block.output },
		};
	}
	// rejected
	const errorValue = block.error;
	if (typeof errorValue === 'string') {
		return {
			type: 'tool-result',
			toolCallId: block.toolCallId,
			toolName: block.toolName,
			output: { type: 'error-text', value: errorValue },
		};
	}
	return {
		type: 'tool-result',
		toolCallId: block.toolCallId,
		toolName: block.toolName,
		output: { type: 'error-json', value: errorValue as JSONValue },
	};
}

/** Convert a single AI SDK content part to an n8n MessageContent block. */
function fromAiContent(part: AiContentPart): MessageContent | undefined {
	const providerMetadata = getRecord(
		'providerMetadata' in part ? part.providerMetadata : undefined,
	);
	const providerOptions = 'providerOptions' in part ? part.providerOptions : undefined;

	let base: MessageContent | undefined;
	switch (part.type) {
		case 'text':
			base = { type: 'text', text: part.text };
			break;
		case 'file': {
			const data =
				part.data instanceof URL ? part.data.toString() : (part.data as ContentFile['data']);
			base = { type: 'file', data, mediaType: part.mediaType };
			break;
		}
		case 'image': {
			const data =
				part.image instanceof URL ? part.image.toString() : (part.image as ContentFile['data']);
			base = { type: 'file', data, mediaType: part.mediaType };
			break;
		}
		case 'reasoning':
			base = { type: 'reasoning', text: part.text };
			break;
		case 'tool-call': {
			const normalizedInput = normalizeToolInputForModel(part.input);
			base = {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: normalizedInput.input,
				providerExecuted: part.providerExecuted,
				...(normalizedInput.ok
					? { state: 'pending' as const }
					: { state: 'rejected' as const, error: normalizedInput.error }),
			};
			break;
		}
		case 'tool-result':
			return undefined;
		// Ignore these types, because HITL is handled by our runtime
		case 'tool-approval-request':
		case 'tool-approval-response':
		default:
			return undefined;
	}

	if (base) {
		// Keep provider metadata on persisted content parts so provider-specific
		// replay data, such as Gemini thought signatures, survives memory/checkpoints.
		if (providerMetadata) base.providerMetadata = providerMetadata;
		if (providerOptions) base.providerOptions = providerOptions;
	}
	return base;
}

/**
 * Convert a single n8n Message to one or more AI SDK ModelMessages.
 *
 * For assistant messages with resolved/rejected tool-call blocks, this emits:
 *  1. The assistant ModelMessage (tool-call parts only, no result fields)
 *  2. One tool ModelMessage per settled tool-call block (resolved or rejected)
 *
 * Pending tool-call blocks are silently skipped (defense-in-depth; the strip
 * step should already have removed them before forLlm() calls toAiMessages).
 */
function toAiMessageList(msg: Message): ModelMessage[] {
	switch (msg.role) {
		case 'system': {
			const text = msg.content
				.filter(isText)
				.map((b) => b.text)
				.join('');
			const base: ModelMessage = { role: 'system', content: text };
			return [msg.providerOptions ? { ...base, providerOptions: msg.providerOptions } : base];
		}

		case 'user': {
			const parts = msg.content
				.map(toAiContent)
				.filter((p): p is TextPart | FilePart => p?.type === 'text' || p?.type === 'file');
			const base: ModelMessage = { role: 'user', content: parts };
			return [msg.providerOptions ? { ...base, providerOptions: msg.providerOptions } : base];
		}

		case 'assistant': {
			const assistantParts: AiContentPart[] = [];
			const resultMessages: ModelMessage[] = [];

			for (const block of msg.content) {
				if (block.type === 'tool-call') {
					if (!('state' in block)) {
						// Legacy DB block - skip it
						continue;
					}
					if (block.state === 'pending') {
						// Skip pending blocks — defense-in-depth (strip step removes them first)
						continue;
					}
					// Emit tool-call part (without result fields)
					const toolCallPart: ToolCallPart = {
						type: 'tool-call',
						toolCallId: block.toolCallId,
						toolName: block.toolName,
						input: toToolInputObject(block.input),
						providerExecuted: block.providerExecuted,
					};
					// Replayed settled tool calls still need their original provider
					// metadata. Gemini validates thought signatures on historical
					// function-call parts, even after the tool result is available.
					assistantParts.push({
						...toolCallPart,
						...(block.providerMetadata && { providerMetadata: block.providerMetadata }),
						...(block.providerOptions && { providerOptions: block.providerOptions }),
					} as ToolCallPart);
					// Emit corresponding tool-result message immediately after
					const resultPart = toolCallToResultPart(block);
					resultMessages.push({ role: 'tool', content: [resultPart] });
				} else {
					const part = toAiContent(block);
					if (part) assistantParts.push(part);
				}
			}

			const transformedMessages: ModelMessage[] = [];

			if (assistantParts.length > 0) {
				const assistantBase: ModelMessage = {
					role: 'assistant',
					content: assistantParts as Array<
						TextPart | ReasoningPart | ToolCallPart | ToolResultPart | FilePart
					>,
				};
				const assistantMsg: ModelMessage = msg.providerOptions
					? { ...assistantBase, providerOptions: msg.providerOptions }
					: assistantBase;
				transformedMessages.push(assistantMsg);
			}
			if (resultMessages.length > 0) {
				transformedMessages.push(...resultMessages);
			}

			return transformedMessages;
		}

		case 'tool': {
			// Legacy role: 'tool' messages (from old DB rows). Don't emit them.
			return [];
		}

		default:
			throw new Error(`Unknown role: ${msg.role as string}`);
	}
}

/** Convert n8n Messages to AI SDK ModelMessages for passing to stream/generateText. */
export function toAiMessages(messages: Message[]): ModelMessage[] {
	return messages.flatMap(toAiMessageList);
}

/**
 * Convert AI SDK ModelMessages to n8n AgentMessages.
 *
 * This is a stateful walk: when a role:'tool' ModelMessage is encountered,
 * the matching tool-call block on the preceding assistant message is mutated
 * to 'resolved' or 'rejected'. The tool message itself is not emitted as a
 * separate n8n message.
 *
 * If a tool-result references a toolCallId not in the index (orphan), it is
 * silently dropped.
 */
export function fromAiMessages(messages: ModelMessage[]): AgentMessage[] {
	// Map from toolCallId → ContentToolCall block (mutable ref inside the n8n message)
	const toolCallIndex = new Map<string, ContentToolCall>();
	const result: AgentMessage[] = [];

	for (const msg of messages) {
		if (msg.role === 'tool') {
			// Merge tool results back into the matching tool-call blocks
			const toolParts = msg.content as ToolResultPart[];
			for (const part of toolParts) {
				const block = toolCallIndex.get(part.toolCallId);
				if (!block) continue; // orphan — drop

				const { output } = part;
				if (output.type === 'json' || output.type === 'text') {
					const mutableBlock = block as Extract<ContentToolCall, { state: 'resolved' }>;
					mutableBlock.state = 'resolved';
					mutableBlock.output = output.value as JSONValue;
				} else if (output.type === 'content') {
					const mutableBlock = block as Extract<ContentToolCall, { state: 'resolved' }>;
					mutableBlock.state = 'resolved';
					mutableBlock.output = output as JSONValue;
				} else if (output.type === 'error-json') {
					const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
					mutableBlock.state = 'rejected';
					mutableBlock.error = JSON.stringify(output.value);
				} else if (output.type === 'error-text') {
					const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
					mutableBlock.state = 'rejected';
					mutableBlock.error = output.value;
				} else {
					const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
					mutableBlock.state = 'rejected';
					mutableBlock.error = JSON.stringify(output);
				}
			}
			// Do not emit a separate n8n message for tool results
			continue;
		}

		const rawContent = msg.content;
		const content: MessageContent[] =
			typeof rawContent === 'string'
				? [{ type: 'text', text: rawContent }]
				: rawContent.map(fromAiContent).filter((p): p is MessageContent => p !== undefined);

		const agentMsg: AgentMessage = { role: msg.role, content };
		if ('providerOptions' in msg && msg.providerOptions) {
			agentMsg.providerOptions = msg.providerOptions;
		}
		result.push(agentMsg);

		// Index any tool-call blocks for later merging with tool-result messages
		if (msg.role === 'assistant') {
			for (const block of content) {
				if (block.type === 'tool-call' && block.toolCallId) {
					toolCallIndex.set(block.toolCallId, block);
				}
			}
		}
	}

	return result;
}

export function fromAiFinishReason(reason: AiFinishReason): FinishReason {
	switch (reason) {
		case 'stop':
			return 'stop';
		case 'length':
			return 'length';
		case 'content-filter':
			return 'content-filter';
		case 'tool-calls':
			return 'tool-calls';
		case 'error':
			return 'error';
		case 'other':
			return 'other';
	}
}
