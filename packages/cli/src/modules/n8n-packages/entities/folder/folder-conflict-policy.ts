import type { FolderConflictPolicy } from '../../n8n-packages.types';

/**
 * A conflict policy's verdict for a folder that already exists in the target project
 * *at the position the package places it*. `merge` reuses it as-is (children merge in via
 * id reuse); `fail` blocks. Position/ownership mismatches (different parent, or id owned by
 * another project) are always blocked regardless of policy and are decided before this runs.
 */
export interface MatchedFolderDecision {
	blocked: boolean;
}

const FOLDER_CONFLICT_POLICIES: Record<FolderConflictPolicy, MatchedFolderDecision> = {
	merge: { blocked: false },
	fail: { blocked: true },
};

export function decideMatchedFolder(policy: FolderConflictPolicy): MatchedFolderDecision {
	return FOLDER_CONFLICT_POLICIES[policy];
}
