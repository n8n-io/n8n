import type { AgentToolOutputFile } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';

function isToolOutputFile(value: unknown): value is AgentToolOutputFile {
	return (
		isRecord(value) &&
		typeof value.fileId === 'string' &&
		typeof value.fileName === 'string' &&
		typeof value.mimeType === 'string' &&
		typeof value.sizeBytes === 'number'
	);
}

/** Read the `files` that a workflow or node tool lists in its output. */
export function getToolOutputAttachments(output: unknown): ChatMessageAttachment[] {
	if (!isRecord(output) || !Array.isArray(output.files)) return [];
	return output.files.filter(isToolOutputFile);
}
