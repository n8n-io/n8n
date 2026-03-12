import type { FilePart, ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai';

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

/** Reasoning content part — mirrors @ai-sdk/provider-utils ReasoningPart (not re-exported by 'ai'). */
type ReasoningPart = { type: 'reasoning'; text: string };

type AiContentPart = TextPart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart;

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
		case 'reasoning':
			return { type: 'reasoning', text: part.text };
		case 'tool-call':
			return {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: part.input as JSONValue,
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
					(p): p is TextPart | ReasoningPart | ToolCallPart =>
						p?.type === 'text' || p?.type === 'reasoning' || p?.type === 'tool-call',
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
	let message: AgentMessage;
	switch (msg.role) {
		case 'system':
			message = { role: 'system', content: [{ type: 'text', text: msg.content }] };
			break;

		case 'user': {
			const rawContent = msg.content;
			if (typeof rawContent === 'string') {
				message = { role: 'user', content: [{ type: 'text', text: rawContent }] };
				break;
			}
			const content = rawContent
				.filter((p): p is TextPart | FilePart => p.type === 'text' || p.type === 'file')
				.map(fromAiContent)
				.filter((p): p is MessageContent => p !== undefined);
			message = { role: 'user', content };
			break;
		}

		case 'assistant': {
			const rawContent = msg.content;
			if (typeof rawContent === 'string') {
				message = { role: 'assistant', content: [{ type: 'text', text: rawContent }] };
				break;
			}
			const content = rawContent
				.filter(
					(p): p is TextPart | ReasoningPart | ToolCallPart =>
						p.type === 'text' || p.type === 'reasoning' || p.type === 'tool-call',
				)
				.map(fromAiContent)
				.filter((p): p is MessageContent => p !== undefined);
			message = { role: 'assistant', content };
			break;
		}

		case 'tool': {
			const content = msg.content
				.filter((p): p is ToolResultPart => p.type === 'tool-result')
				.map(fromAiContent)
				.filter((p): p is MessageContent => p !== undefined);
			message = { role: 'tool', content };
			break;
		}
	}
	return toDbMessage(message);
}

/** Convert AI SDK ModelMessages to n8n AgentDbMessages (each with a generated id). */
export function fromAiMessages(messages: ModelMessage[]): AgentDbMessage[] {
	return messages.map(fromAiMessage);
}
