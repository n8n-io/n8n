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

import type { FinishReason } from '../types';
import type {
	AgentMessage,
	ContentFile,
	ContentReasoning,
	ContentText,
	ContentToolCall,
	ContentToolResult,
	Message,
	MessageContent,
} from '../types/sdk/message';
import type { JSONValue } from '../types/utils/json';

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

function isToolResult(block: MessageContent): block is ContentToolResult {
	return block.type === 'tool-result';
}

/**
 * Parse a JSONValue that may be a stringified JSON object back into
 * its parsed form. Non-string values pass through unchanged.
 */
function parseJsonValue(value: JSONValue): unknown {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}
	return value;
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
			input: parseJsonValue(block.input),
			providerExecuted: block.providerExecuted,
		};
	}
	if (isToolResult(block)) {
		if (block.isError) {
			if (typeof block.result === 'string') {
				base = {
					type: 'tool-result',
					toolCallId: block.toolCallId,
					toolName: block.toolName,
					output: { type: 'error-text', value: block.result },
				};
			} else {
				base = {
					type: 'tool-result',
					toolCallId: block.toolCallId,
					toolName: block.toolName,
					output: { type: 'error-json', value: block.result },
				};
			}
		} else {
			base = {
				type: 'tool-result',
				toolCallId: block.toolCallId,
				toolName: block.toolName,
				output: { type: 'json', value: block.result },
			};
		}
	} else if (isReasoning(block)) {
		base = { type: 'reasoning', text: block.text };
	}

	if (base && block.providerOptions) {
		return { ...base, providerOptions: block.providerOptions } as AiContentPart;
	}
	return base;
}

/** Convert a single AI SDK content part to an n8n MessageContent block. */
function fromAiContent(part: AiContentPart): MessageContent | undefined {
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
		case 'tool-call':
			base = {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: part.input as JSONValue,
				providerExecuted: part.providerExecuted,
			};
			break;
		case 'tool-result': {
			const { output } = part;
			let result: JSONValue;
			let isError: boolean | undefined;
			if (output.type === 'json') {
				result = output.value;
			} else if (output.type === 'text') {
				result = output.value;
			} else if (output.type === 'error-json') {
				result = output.value;
				isError = true;
			} else if (output.type === 'error-text') {
				result = output.value;
				isError = true;
			} else {
				result = null;
				isError = true;
			}
			base = {
				type: 'tool-result',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				result,
				isError,
			};
			break;
		}
		// Ignore these types, because HITL is handled by our runtime
		case 'tool-approval-request':
		case 'tool-approval-response':
		default:
			return undefined;
	}

	if (base && providerOptions) {
		return { ...base, providerOptions };
	}
	return base;
}

/** Convert a single n8n Message to an AI SDK ModelMessage. */
export function toAiMessage(msg: Message): ModelMessage {
	let base: ModelMessage;
	switch (msg.role) {
		case 'system': {
			const text = msg.content
				.filter(isText)
				.map((b) => b.text)
				.join('');
			base = { role: 'system', content: text };
			break;
		}

		case 'user': {
			const parts = msg.content
				.map(toAiContent)
				.filter((p): p is TextPart | FilePart => p?.type === 'text' || p?.type === 'file');
			base = { role: 'user', content: parts };
			break;
		}

		case 'assistant': {
			const parts = msg.content
				.map(toAiContent)
				.filter(
					(p): p is TextPart | ReasoningPart | ToolCallPart | ToolResultPart | FilePart =>
						p?.type === 'text' ||
						p?.type === 'reasoning' ||
						p?.type === 'tool-call' ||
						p?.type === 'tool-result' ||
						p?.type === 'file',
				);
			base = { role: 'assistant', content: parts };
			break;
		}

		case 'tool': {
			const parts = msg.content
				.map(toAiContent)
				.filter((p): p is ToolResultPart => p?.type === 'tool-result');
			base = { role: 'tool', content: parts };
			break;
		}

		default:
			throw new Error(`Unknown role: ${msg.role as string}`);
	}

	if (msg.providerOptions) {
		return { ...base, providerOptions: msg.providerOptions };
	}
	return base;
}

/** Convert n8n Messages to AI SDK ModelMessages for passing to stream/generateText. */
export function toAiMessages(messages: Message[]): ModelMessage[] {
	return messages.map(toAiMessage);
}

/** Convert a single AI SDK ModelMessage to an n8n AgentDbMessage (with a generated id). */
export function fromAiMessage(msg: ModelMessage): AgentMessage {
	const rawContent = msg.content;
	const content: MessageContent[] =
		typeof rawContent === 'string'
			? [{ type: 'text', text: rawContent }]
			: rawContent.map(fromAiContent).filter((p): p is MessageContent => p !== undefined);
	const message: AgentMessage = { role: msg.role, content };
	if ('providerOptions' in msg && msg.providerOptions) {
		message.providerOptions = msg.providerOptions;
	}
	return message;
}

/** Convert AI SDK ModelMessages to n8n AgentDbMessages (each with a generated id). */
export function fromAiMessages(messages: ModelMessage[]): AgentMessage[] {
	return messages.map(fromAiMessage);
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
