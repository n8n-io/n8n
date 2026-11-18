import { defineAsyncComponent } from 'vue';

import { getToolOutputAttachments } from '@/features/agents/utils/tool-output-files';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ChatMessageAttachment, ToolCall } from '@/features/ai/shared/agentsChat/types';

/** The Assistant tool that gives files of its sandbox to the user. */
export const ASSISTANT_SHARE_FILES_TOOL = 'share-files';

/** The files that a finished `share-files` call gave to the user. */
export function getSharedFiles(
	toolCall: Pick<ToolCall, 'tool' | 'output'>,
): ChatMessageAttachment[] {
	if (toolCall.tool !== ASSISTANT_SHARE_FILES_TOOL) return [];
	return getToolOutputAttachments(toolCall.output);
}

/**
 * Shows the shared files in the reply in place of the "Share files" step, so
 * they stay visible when the tool steps collapse. A call that shared no file
 * stays a step, so that its errors show there.
 */
export const assistantSharedFilesExtension: AgentsChatInteractionExtension = {
	key: 'assistant_shared_files',
	matchToolResult: (toolCall) => getSharedFiles(toolCall).length > 0,
	resultComponent: defineAsyncComponent(async () => await import('./AssistantSharedFiles.vue')),
};
