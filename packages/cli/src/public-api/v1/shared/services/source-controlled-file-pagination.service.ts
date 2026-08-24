import type { SourceControlledFile } from '@n8n/api-types';

import { paginateArray } from './pagination.service';

/**
 * Total order over a source-control diff. `getStatus` concatenates several
 * per-resource-type arrays whose internal order comes from unordered DB reads, so without an
 * explicit sort, paging through the same diff twice can return items in a different order —
 * which breaks offset pagination (repeats/skips across pages). `(type, id)` is already treated
 * as the identity of a file elsewhere (e.g. `pushWorkfolder`'s allowlist check), and both are
 * required non-null strings, so this key is stable and unique.
 */
export function sortSourceControlledFiles(files: SourceControlledFile[]): SourceControlledFile[] {
	return [...files].sort((a, b) => {
		if (a.type !== b.type) return a.type < b.type ? -1 : 1;
		if (a.file !== b.file) return a.file < b.file ? -1 : 1;
		if (a.id !== b.id) return a.id < b.id ? -1 : 1;
		return 0;
	});
}

/**
 * The single entry point for paginating a source-controlled-file list on the public API.
 * `status` uses this today; API-165 (paginating `pull`) should point at the same function
 * rather than reimplementing the sort + envelope.
 */
export function paginateSourceControlledFiles(
	files: SourceControlledFile[],
	query: { offset: number; limit: number },
): { data: SourceControlledFile[]; nextCursor: string | null } {
	return paginateArray(sortSourceControlledFiles(files), query);
}
