import { N8N_CHAT_ACTION_TOOL_NAME, type AgentToolOutputFile } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { ChatMessage, ChatMessageAttachment, ToolCall } from './types';

export function isToolOutputFile(value: unknown): value is AgentToolOutputFile {
	return (
		isRecord(value) &&
		typeof value.fileId === 'string' &&
		typeof value.fileName === 'string' &&
		typeof value.mimeType === 'string' &&
		typeof value.sizeBytes === 'number'
	);
}

function readFiles(result: unknown): AgentToolOutputFile[] {
	if (!isRecord(result) || result.ok !== true) return [];
	if (Array.isArray(result.files)) return result.files.filter(isToolOutputFile);
	// Batched action calls nest each result under `results`.
	if (!Array.isArray(result.results)) return [];
	return result.results.flatMap((entry) => (isRecord(entry) ? readFiles(entry.result) : []));
}

/** The files that the agent sent with its reply through the n8n Chat `respond` action. */
export function getReplyAttachments(
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): ChatMessageAttachment[] {
	return toolCall.tool === N8N_CHAT_ACTION_TOOL_NAME ? readFiles(toolCall.output) : [];
}

/** Add the reply files of a tool call to the message. A file shows one time. */
export function addReplyAttachments(
	message: Pick<ChatMessage, 'attachments'>,
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): void {
	const known = new Set(message.attachments?.map((attachment) => attachment.fileId));
	const added = getReplyAttachments(toolCall).filter((file) => !known.has(file.fileId));
	if (added.length > 0) message.attachments = [...(message.attachments ?? []), ...added];
}
