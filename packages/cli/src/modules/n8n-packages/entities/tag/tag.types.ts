import type { TagConflictPolicy, TagMissingMode } from '../../n8n-packages.types';
import type { PackageTagRequirement } from '../../spec/requirements.schema';

export interface WorkflowTagUsage {
	workflowId: string;
	tag: { id: string; name: string };
}

/** Locale pinned so package output is byte-stable across environments. */
export const compareTagsByName = (
	a: { id: string; name: string },
	b: { id: string; name: string },
) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en');

export interface TagRef {
	id: string;
	name: string;
}

export interface TagRename {
	id: string;
	from: string;
	to: string;
}

export type TagResolutionFailureKind =
	| 'rename-drift'
	| 'name-collision'
	| 'invalid-name'
	| 'invalid-id'
	| 'permission-denied';

export type TagResolutionFailure = {
	kind: TagResolutionFailureKind;
	/** Absent for `permission-denied`, which is import-wide rather than per-tag. */
	sourceId?: string;
	/** Trimmed; absent for `permission-denied`. */
	name?: string;
	/** Only set for `permission-denied`. */
	missingScope?: 'tag:create' | 'tag:update';
	/** The tag currently holding the wanted name. */
	existingTagId?: string;
	/** For `rename-drift`: the current name of the same-id target tag. */
	existingName?: string;
	usedByWorkflows: string[];
};

export interface TagImportRequest {
	requirements: PackageTagRequirement[] | undefined;
	missingMode: TagMissingMode;
	conflictPolicy: TagConflictPolicy;
}

export interface TagImportPlan {
	/** Exact same-id, same-name matches: attach only. */
	matched: TagRef[];
	/** Created on the target with their source id and name. */
	creations: TagRef[];
	/** Same-id target tags renamed to the package name. */
	renames: TagRename[];
	/** Neither created, renamed, nor attached (`skip` / `do-nothing`). */
	dropped: TagRef[];
	failures: TagResolutionFailure[];
}

/** Tag ids the workflow importer must strip from `tagIds` before attaching. */
export function droppedTagIds(plan: TagImportPlan): ReadonlySet<string> {
	return new Set(plan.dropped.map(({ id }) => id));
}
