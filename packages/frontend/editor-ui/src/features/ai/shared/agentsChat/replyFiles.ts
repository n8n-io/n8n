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

/** The reply files of a tool call that are not in `known` yet. Each file comes one time. */
export function newReplyAttachments(
	known: readonly ChatMessageAttachment[] | undefined,
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): ChatMessageAttachment[] {
	const seen = new Set(known?.map((attachment) => attachment.fileId));
	return getReplyAttachments(toolCall).filter((file) => {
		if (seen.has(file.fileId)) return false;
		seen.add(file.fileId);
		return true;
	});
}

/** Add the reply files of a tool call to the message. */
export function addReplyAttachments(
	message: Pick<ChatMessage, 'attachments'>,
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): void {
	const added = newReplyAttachments(message.attachments, toolCall);
	if (added.length > 0) message.attachments = [...(message.attachments ?? []), ...added];
}
