import type { FolderConflictPolicy } from '../../n8n-packages.types';

/**
 * A conflict policy's verdict for a folder that already exists in the target project
 * *at the position the package places it*. Position/ownership mismatches (different
 * parent, or id owned by another project) are always blocked regardless of policy and
 * are decided before this runs.
 */
export interface MatchedFolderDecision {
	action: 'update' | 'skip';
	blocked: boolean;
}

/* eslint-disable @typescript-eslint/naming-convention -- API folder conflict policy keys */
const FOLDER_CONFLICT_POLICIES: Record<FolderConflictPolicy, MatchedFolderDecision> = {
	'new-version': { action: 'update', blocked: false },
	fail: { action: 'skip', blocked: true },
	skip: { action: 'skip', blocked: false },
};
/* eslint-enable @typescript-eslint/naming-convention */

export function decideMatchedFolderAction(policy: FolderConflictPolicy): MatchedFolderDecision {
	return FOLDER_CONFLICT_POLICIES[policy];
}
