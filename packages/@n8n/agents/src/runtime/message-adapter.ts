import type { MastraDBMessage } from '@mastra/core/agent';
import type {
	FilePart,
	ReasoningPart,
	TextPart,
	ToolCallPart,
	ToolResultPart,
} from '@mastra/core/dist/_types/@internal_ai-sdk-v4/dist';
import type { CoreMessage } from '@mastra/core/llm';

import type {
	Message,
	MessageContent,
	ContentText,
	ContentReasoning,
	ContentFile,
	ContentToolCall,
	ContentToolResult,
	ContentInvalidToolCall,
} from '../message';

// --- Type guards for our MessageContent blocks ---

function isContentText(block: MessageContent): block is ContentText {
	return block.type === 'text';
}

function isContentReasoning(block: MessageContent): block is ContentReasoning {
	return block.type === 'reasoning';
}

function isContentFile(block: MessageContent): block is ContentFile {
	return block.type === 'file';
}

function isContentToolCall(block: MessageContent): block is ContentToolCall {
	return block.type === 'tool-call';
}

function isContentToolResult(block: MessageContent): block is ContentToolResult {
	return block.type === 'tool-result';
}

function isContentInvalidToolCall(block: MessageContent): block is ContentInvalidToolCall {
	return block.type === 'invalid-tool-call';
}

function tryParseJson(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		return input;
	}
}

type MastraContentPart = TextPart | ReasoningPart | FilePart | ToolCallPart | ToolResultPart;
/**
 * Map n8n MessageContent blocks to Mastra content parts.
 */
export function toMastraContent(content: MessageContent[]): MastraContentPart[] {
	return content.flatMap((block): MastraContentPart[] => {
		if (isContentText(block)) {
			return [{ type: 'text', text: block.text }];
		}
		if (isContentReasoning(block)) {
			return [{ type: 'reasoning', text: block.text }];
		}
		if (isContentFile(block)) {
			return [
				{
					type: 'file',
					data: block.data,
					mimeType: block.mediaType ?? 'application/octet-stream',
				},
			];
		}
		if (isContentToolCall(block)) {
			return [
				{
					type: 'tool-call',
					toolCallId: block.toolCallId ?? '',
					toolName: block.toolName,
					args: tryParseJson(block.input),
				},
			];
		}
		if (isContentToolResult(block)) {
			return [
				{
					type: 'tool-result',
					toolCallId: block.toolCallId,
					toolName: block.toolName,
					result: block.result,
					isError: block.isError,
				},
			];
		}
		if (isContentInvalidToolCall(block)) {
			return [
				{
					type: 'tool-result',
					toolCallId: block.toolCallId ?? '',
					toolName: block.name ?? 'unknown',
					result: block.error ?? 'Invalid tool call',
					isError: true,
				},
			];
		}

		// TODO: citation, provider, and other unknown types: no Mastra equivalent, convert to closest equivalent
		return [];
	});
}

export function toMastraMessage(msg: Message): CoreMessage {
	const parts = toMastraContent(msg.content);

	switch (msg.role) {
		case 'system': {
			const text = parts
				.filter(isMastraTextPart)
				.map((p) => p.text)
				.join('');
			return { role: 'system', content: text };
		}

		case 'user':
			return {
				role: 'user',
				content: parts.filter(
					(p): p is TextPart | FilePart => p.type === 'text' || p.type === 'file',
				),
			};
		case 'assistant': {
			return {
				role: msg.role,
				content: parts.filter(
					(p): p is TextPart | FilePart | ToolCallPart | ReasoningPart =>
						p.type === 'text' ||
						p.type === 'file' ||
						p.type === 'tool-call' ||
						p.type === 'reasoning',
				),
			};
		}

		case 'tool': {
			return {
				role: 'tool',
				content: parts.filter((p): p is ToolResultPart => p.type === 'tool-result'),
			};
		}
	}
}

/**
 * Convert an array of n8n Messages to Mastra CoreMessage array.
 */
export function toMastraMessages(messages: Message[]): CoreMessage[] {
	return messages.map(toMastraMessage);
}

// --- Type guards for Mastra MastraDBMessage parts ---

function isMastraTextPart(part: unknown): part is TextPart {
	return typeof part === 'object' && part !== null && (part as { type: string }).type === 'text';
}

function isMastraReasoningPart(part: unknown): part is ReasoningPart {
	return (
		typeof part === 'object' && part !== null && (part as { type: string }).type === 'reasoning'
	);
}

function isMastraToolCallPart(part: unknown): part is ToolCallPart {
	if (
		typeof part !== 'object' ||
		part === null ||
		(part as { type: string }).type !== 'tool-call'
	) {
		return false;
	}
	return true;
}

function isMastraToolResultPart(part: unknown): part is ToolResultPart {
	if (
		typeof part !== 'object' ||
		part === null ||
		(part as { type: string }).type !== 'tool-result'
	) {
		return false;
	}
	return true;
}

function isMastraFilePart(part: unknown): part is FilePart {
	return typeof part === 'object' && part !== null && (part as { type: string }).type === 'file';
}

/**
 * Convert a Mastra MastraDBMessage to an n8n Message.
 *
 * MastraDBMessage uses a UIMessage format (V2 content with parts) where tool
 * invocations are stored within the assistant message rather than as a separate
 * 'tool' role message. A completed tool invocation (state: 'result') is expanded
 * into both a ContentToolCall and a ContentToolResult within the same message.
 */
export function fromMastraMessage(msg: MastraDBMessage): Message {
	const parts = msg.content.parts;
	const content: MessageContent[] = [];

	for (const part of parts) {
		if (isMastraTextPart(part)) {
			content.push({ type: 'text', text: part.text });
		} else if (isMastraReasoningPart(part)) {
			content.push({ type: 'reasoning', text: part.text });
		} else if (isMastraToolCallPart(part)) {
			content.push({
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: JSON.stringify(part.args),
			});
		} else if (isMastraToolResultPart(part)) {
			content.push({
				type: 'tool-result',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				result: part.result,
			});
		} else if (isMastraFilePart(part)) {
			const data = part.data instanceof URL ? part.data.toString() : part.data;
			content.push({ type: 'file', mediaType: part.mimeType, data });
		}
	}

	return {
		role: msg.role,
		content,
		id: msg.id,
	};
}

/**
 * Convert an array of Mastra MastraDBMessages to n8n Messages.
 */
export function fromMastraMessages(messages: MastraDBMessage[]): Message[] {
	return messages.map(fromMastraMessage);
}
