import { isRecord } from '@n8n/utils/is-record';
import { isToolOutputFile } from '@/features/ai/shared/agentsChat/replyFiles';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';

/** Read the `files` that a workflow or node tool lists in its output. */
export function getToolOutputAttachments(output: unknown): ChatMessageAttachment[] {
	if (!isRecord(output) || !Array.isArray(output.files)) return [];
	return output.files.filter(isToolOutputFile);
}
