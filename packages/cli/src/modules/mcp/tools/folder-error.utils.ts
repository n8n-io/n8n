import { ensureError } from '@n8n/utils/errors/ensure-error';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { UserCalledMCPToolEventPayload } from '../mcp.types';

/**
 * Formats a folder-operation failure for MCP output, pointing unknown folder
 * ids at search_folders so agents can recover without guessing.
 */
export function describeFolderError(error: unknown): string {
	if (error instanceof FolderNotFoundError) {
		return `${error.message}. Use search_folders to look up a valid folder id.`;
	}
	return ensureError(error).message;
}

/**
 * Builds the shared failure path for the folder tools: tracks the failed call
 * and returns the MCP error envelope.
 */
export const createFailHandler =
	(telemetry: Telemetry, telemetryPayload: UserCalledMCPToolEventPayload) => (error: string) => {
		telemetryPayload.results = { success: false, error };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
		const output = { error };
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(output) }],
			structuredContent: output,
			isError: true,
		};
	};
