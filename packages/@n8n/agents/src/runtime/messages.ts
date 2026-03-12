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

import type { JSONValue } from '../json';
import type {
	AgentDbMessage,
	AgentMessage,
	ContentFile,
	ContentReasoning,
	ContentText,
	ContentToolCall,
	ContentToolResult,
	Message,
	MessageContent,
} from '../message';
import { toDbMessage } from '../message';
import type { FinishReason } from '../types';

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
	if (isText(block)) {
		return { type: 'text', text: block.text };
	}
	if (isFile(block)) {
		return {
			type: 'file',
			data: block.data,
			mediaType: block.mediaType ?? 'application/octet-stream',
		};
	}
	if (isToolCall(block)) {
		return {
			type: 'tool-call',
			toolCallId: block.toolCallId ?? '',
			toolName: block.toolName,
			input: parseJsonValue(block.input),
			providerExecuted: block.providerExecuted,
		};
	}
	if (isToolResult(block)) {
		return {
			type: 'tool-result',
			toolCallId: block.toolCallId,
			toolName: block.toolName,
			output: { type: 'json', value: block.result },
		};
	}
	if (isReasoning(block)) {
		return { type: 'reasoning', text: block.text };
	}
	return undefined;
}

/** Convert a single AI SDK content part to an n8n MessageContent block. */
function fromAiContent(part: AiContentPart): MessageContent | undefined {
	switch (part.type) {
		case 'text':
			return { type: 'text', text: part.text };
		case 'file': {
			const data =
				part.data instanceof URL ? part.data.toString() : (part.data as ContentFile['data']);
			return { type: 'file', data, mediaType: part.mediaType };
		}
		case 'image': {
			const data =
				part.image instanceof URL ? part.image.toString() : (part.image as ContentFile['data']);
			return { type: 'file', data, mediaType: part.mediaType };
		}
		case 'reasoning':
			return { type: 'reasoning', text: part.text };
		case 'tool-call':
			return {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: part.input as JSONValue,
				providerExecuted: part.providerExecuted,
			};
		case 'tool-result': {
			const { output } = part;
			let result: JSONValue;
			let isError: boolean | undefined;
			if (output.type === 'json') {
				result = output.value;
			} else if (output.type === 'text') {
				result = output.value;
			} else {
				result = 'reason' in output ? (output.reason ?? null) : null;
				isError = true;
			}
			return {
				type: 'tool-result',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				result,
				input: null,
				isError,
			};
		}
		// Ignore these types, because HITL is handled by our runtime
		case 'tool-approval-request':
		case 'tool-approval-response':
		default:
			return undefined;
	}
}

/** Convert a single n8n Message to an AI SDK ModelMessage. */
export function toAiMessage(msg: Message): ModelMessage {
	switch (msg.role) {
		case 'system': {
			const text = msg.content
				.filter(isText)
				.map((b) => b.text)
				.join('');
			return { role: 'system', content: text };
		}

		case 'user': {
			const parts = msg.content
				.map(toAiContent)
				.filter((p): p is TextPart | FilePart => p?.type === 'text' || p?.type === 'file');
			return { role: 'user', content: parts };
		}

		case 'assistant': {
			const parts = msg.content
				.map(toAiContent)
				.filter(
					(p): p is TextPart | ReasoningPart | ToolCallPart | ToolResultPart | FilePart =>
						p?.type === 'text' ||
						p?.type === 'reasoning' ||
						p?.type === 'tool-call' ||
						p?.type === 'file' ||
						p?.type === 'tool-result',
				);
			return { role: 'assistant', content: parts };
		}

		case 'tool': {
			const parts = msg.content
				.map(toAiContent)
				.filter((p): p is ToolResultPart => p?.type === 'tool-result');
			return { role: 'tool', content: parts };
		}
	}
}

/** Convert n8n Messages to AI SDK ModelMessages for passing to stream/generateText. */
export function toAiMessages(messages: Message[]): ModelMessage[] {
	return messages.map(toAiMessage);
}

/** Convert a single AI SDK ModelMessage to an n8n AgentDbMessage (with a generated id). */
export function fromAiMessage(msg: ModelMessage): AgentDbMessage {
	const rawContent = msg.content;
	const content: MessageContent[] =
		typeof rawContent === 'string'
			? [{ type: 'text', text: rawContent }]
			: rawContent.map(fromAiContent).filter((p): p is MessageContent => p !== undefined);
	const message: AgentMessage = { role: msg.role, content };
	return toDbMessage(message);
}

/** Convert AI SDK ModelMessages to n8n AgentDbMessages (each with a generated id). */
export function fromAiMessages(messages: ModelMessage[]): AgentDbMessage[] {
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
