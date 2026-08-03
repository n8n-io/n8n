import type { FolderConflictPolicy } from '../../n8n-packages.types';

export interface MatchedFolderDecision {
	blocked: boolean;
}

const FOLDER_CONFLICT_POLICIES: Record<FolderConflictPolicy, MatchedFolderDecision> = {
	// Merge folders into any pre-existing parents
	merge: { blocked: false },
	// Fail the import if a folder exists already
	fail: { blocked: true },
};

export function decideMatchedFolder(policy: FolderConflictPolicy): MatchedFolderDecision {
	return FOLDER_CONFLICT_POLICIES[policy];
}
