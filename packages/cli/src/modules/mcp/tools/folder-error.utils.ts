import { FolderNotFoundError } from '@/errors/folder-not-found.error';

/**
 * Formats a folder-operation failure for MCP output, pointing unknown folder
 * ids at search_folders so agents can recover without guessing.
 */
export function describeFolderError(error: unknown): string {
	if (error instanceof FolderNotFoundError) {
		return `${error.message}. Use search_folders to look up a valid folder id.`;
	}
	return error instanceof Error ? error.message : String(error);
}
