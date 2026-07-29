import { FolderConflictPolicy } from '../../n8n-packages.types';

export interface MatchedFolderDecision {
	blocked: boolean;
}

const FOLDER_CONFLICT_POLICIES: Record<FolderConflictPolicy, MatchedFolderDecision> = {
	// Merge folders into any pre-existing parents
	merge: { blocked: false },
	// Fail the import if a folder exists already
	fail: { blocked: true },
	// Reuse pre-existing folders as `merge` does; the difference is scope-level pruning below
	overwrite: { blocked: false },
};

export function decideMatchedFolder(policy: FolderConflictPolicy): MatchedFolderDecision {
	return FOLDER_CONFLICT_POLICIES[policy];
}

/**
 * Whether the package is authoritative for the scopes it defines, so a workflow the package does
 * not contain is archived. A folder carries no state of its own worth overwriting, so this — not
 * the matched-folder decision — is what sets `overwrite` apart.
 */
export function prunesUnpackagedWorkflows(policy: FolderConflictPolicy): boolean {
	return policy === FolderConflictPolicy.Overwrite;
}
