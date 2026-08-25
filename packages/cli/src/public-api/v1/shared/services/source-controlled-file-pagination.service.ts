import type { SourceControlledFile } from '@n8n/api-types';

import { paginateArray } from './pagination.service';

/**
 * Sorting function for SourceControlledFile objects. Sorts by type, then file name (git path), then ID.
 */
function sortSourceControlledFiles(a: SourceControlledFile, b: SourceControlledFile): number {
	if (a.type !== b.type) return a.type < b.type ? -1 : 1;
	if (a.file !== b.file) return a.file < b.file ? -1 : 1;
	if (a.id !== b.id) return a.id < b.id ? -1 : 1;
	return 0;
}

export function paginateSourceControlledFiles(
	files: SourceControlledFile[],
	query: { offset: number; limit: number },
): { data: SourceControlledFile[]; nextCursor: string | null } {
	// Sorting is required to ensure stable pagination.
	const sortedFiles = [...files].sort(sortSourceControlledFiles);

	return paginateArray(sortedFiles, query);
}
