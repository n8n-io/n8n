import type { FolderResolutionFailure } from '@n8n/instance-ai';

/** Folders one project contributes to a resolution scan. Folders are an
 *  organisational layer, not a corpus. Past this, a miss is reported, not guessed. */
export const FOLDER_SCAN_LIMIT = 200;

/** Folder paths offered back on a failed lookup: enough to choose from without
 *  turning an error into an inventory dump. */
export const FOLDER_CANDIDATE_LIMIT = 20;

/** Projects one instance-wide folder request will scan. Past this the caller is
 *  asked to name a project rather than the instance paying N queries. */
export const FOLDER_SCAN_PROJECT_LIMIT = 20;

export interface FolderInScope {
	id: string;
	name: string;
	/** Root-relative, "/"-joined folder names. */
	path: string;
	projectId: string;
}

/** Lower-case, trimmed, with surrounding and repeated slashes removed. */
export function normalizeFolderPath(path: string): string {
	return path
		.trim()
		.split('/')
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0)
		.join('/')
		.toLowerCase();
}

export function listCandidatePaths(folders: FolderInScope[]): string[] {
	return folders
		.map((folder) => folder.path)
		.sort((a, b) => a.localeCompare(b))
		.slice(0, FOLDER_CANDIDATE_LIMIT);
}

/**
 * Resolve a folder the caller named to exactly one folder id.
 *
 * Staged and strict: exact path → exact folder name → last requested segment as
 * folder name → "/"-boundary path suffix. It never falls back to a fuzzy or
 * partial match. The failure this exists to remove is a folder request that
 * quietly becomes a wider set, so an unresolved name comes back as unresolved
 * with the real folders listed.
 *
 * A user's path often starts with the PROJECT ("personal/logsearch"), which is
 * not part of a folder path, so the trailing segments are tried on their own.
 */
export function resolveRequestedFolder(
	requested: { folderPath?: string; folderId?: string },
	foldersInScope: FolderInScope[] | undefined,
): { folderId: string } | Omit<FolderResolutionFailure, 'requested'> {
	if (!foldersInScope) return { reason: 'unsupported', candidates: [] };

	const candidates = listCandidatePaths(foldersInScope);

	// Presence decides precedence, not truthiness: an explicit id, even an empty
	// one, must not fall through to whatever the path would select.
	if (requested.folderId !== undefined) {
		const byId = foldersInScope.find((folder) => folder.id === requested.folderId);
		return byId ? { folderId: byId.id } : { reason: 'not-found', candidates };
	}

	const wanted = normalizeFolderPath(requested.folderPath ?? '');
	if (wanted.length === 0) return { reason: 'not-found', candidates };
	const wantedLeaf = wanted.split('/').at(-1) ?? wanted;

	const stages: Array<(folder: FolderInScope) => boolean> = [
		(folder) => normalizeFolderPath(folder.path) === wanted,
		(folder) => folder.name.trim().toLowerCase() === wanted,
		(folder) => folder.name.trim().toLowerCase() === wantedLeaf,
		(folder) => normalizeFolderPath(folder.path).endsWith(`/${wanted}`),
	];

	for (const matches of stages) {
		const hits = foldersInScope.filter(matches);
		if (hits.length === 1) return { folderId: hits[0].id };
		if (hits.length > 1) {
			return { reason: 'ambiguous', candidates: listCandidatePaths(hits) };
		}
	}

	return { reason: 'not-found', candidates };
}
