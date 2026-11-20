import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent } from 'vue';

import { getToolOutputAttachments } from '@/features/agents/utils/tool-output-files';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ChatMessageAttachment, ToolCall } from '@/features/ai/shared/agentsChat/types';

/** The Assistant tool that gives files of its sandbox to the user. */
export const ASSISTANT_SHARE_FILES_TOOL = 'share-files';

/** A path that a `share-files` call could not share. */
export interface ShareFileError {
	path: string;
	error: string;
}

/** The files that a finished `share-files` call gave to the user. */
export function getSharedFiles(
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): ChatMessageAttachment[] {
	if (toolCall.tool !== ASSISTANT_SHARE_FILES_TOOL) return [];
	return getToolOutputAttachments(toolCall.output);
}

/** The paths that a finished `share-files` call could not share. */
export function getShareErrors(toolCall: Pick<ToolCall, 'tool' | 'output'>): ShareFileError[] {
	if (toolCall.tool !== ASSISTANT_SHARE_FILES_TOOL) return [];
	const { output } = toolCall;
	if (!isRecord(output) || !Array.isArray(output.errors)) return [];
	return output.errors.filter(
		(entry): entry is ShareFileError =>
			isRecord(entry) && typeof entry.path === 'string' && typeof entry.error === 'string',
	);
}

/**
 * Shows the shared files in the reply in place of the "Share files" step, so
 * they stay visible when the tool steps collapse. The paths that failed in the
 * same call show under the files, because the step no longer shows them. A call
 * that shared no file stays a step, so that its errors show there.
 */
export const assistantSharedFilesExtension: AgentsChatInteractionExtension = {
	key: 'assistant_shared_files',
	matchToolResult: (toolCall) => getSharedFiles(toolCall).length > 0,
	resultComponent: defineAsyncComponent(async () => await import('./AssistantSharedFiles.vue')),
};
