import { FolderConflictPolicy, ProjectConflictPolicy } from '../../n8n-packages.types';
import type { ImportFolderProperties, ImportProjectProperties } from '../../n8n-packages.types';

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
export function removesUnpackagedWorkflows(policy: FolderConflictPolicy): boolean {
	return policy === FolderConflictPolicy.Overwrite;
}

/**
 * The folder policy the import runs under: what the caller asked for, or the project policy they
 * already stated. A workflow package defines no projects, so its project policy is meaningless and
 * folder handling falls back to `merge`.
 */
export function resolveFolderConflictPolicy(
	request: ImportProjectProperties & ImportFolderProperties,
	packageShape: 'project' | 'workflow',
): FolderConflictPolicy {
	if (request.folderConflictPolicy !== undefined) return request.folderConflictPolicy;
	return packageShape === 'project' ? request.projectConflictPolicy : FolderConflictPolicy.Merge;
}

/**
 * Why the requested folder policy cannot run against this package shape, or `undefined` when it
 * can. The dispatcher turns a rejection into a 400 before any importer runs.
 */
export function folderPolicyRejection(
	request: ImportProjectProperties & ImportFolderProperties,
	packageShape: 'project' | 'workflow',
): string | undefined {
	if (packageShape === 'project') {
		// Removing workflows is the most destructive thing an import can do, so it takes both
		// policies saying `overwrite`. Only an explicit mismatch gets here — an omitted folder
		// policy inherits the project's — and rejecting it beats guessing which half was meant.
		return request.folderConflictPolicy === FolderConflictPolicy.Overwrite &&
			request.projectConflictPolicy !== ProjectConflictPolicy.Overwrite
			? `folderConflictPolicy=overwrite removes workflows the package does not contain, so it requires projectConflictPolicy=overwrite (got "${request.projectConflictPolicy}").`
			: undefined;
	}

	// A workflow package describes only the workflows it carries, not the whole target scope, so
	// it cannot tell an unpackaged workflow apart from one that was never meant to be in scope.
	return resolveFolderConflictPolicy(request, packageShape) === FolderConflictPolicy.Overwrite
		? 'folderConflictPolicy=overwrite is only supported for project packages, which describe the whole project scope. Use merge or fail.'
		: undefined;
}
