import type { BinaryData } from './types';

export { assertDir, exists } from '@n8n/backend-common';

const STORED_MODES = ['filesystem', 'filesystem-v2', 's3', 'azure', 'database'] as const;

export function isStoredMode(mode: string): mode is BinaryData.StoredMode {
	return STORED_MODES.includes(mode as BinaryData.StoredMode);
}

export const FileLocation = {
	ofExecution: (workflowId: string, executionId: string): BinaryData.FileLocation => ({
		type: 'execution',
		workflowId,
		executionId,
	}),

	/**
	 * Create a location for a binary file at a custom path,
	 * e.g. ["chat-hub", "sessions", "abc", "messages", "def"] -> "chat-hub/sessions/abc/messages/def"
	 */
	ofCustom: ({
		pathSegments,
		sourceType,
		sourceId,
	}: {
		pathSegments: string[];
		sourceType?: string;
		sourceId?: string;
	}): BinaryData.FileLocation => ({
		type: 'custom',
		pathSegments,
		sourceType,
		sourceId,
	}),
};
