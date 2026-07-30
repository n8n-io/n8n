import type { TagConflictPolicy, TagMissingMode } from '../../n8n-packages.types';
import type { PackageTagRequirement } from '../../spec/requirements.schema';
import type { PreparedWorkflow } from '../workflow/workflow-import.types';

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

export interface TagReconcile {
	/** The package (source) id the existing target tag is re-keyed to. */
	id: string;
	name: string;
	/** The existing target tag's current id. */
	oldId: string;
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
	/** Existing target tags re-keyed to the package (source) id; mappings follow. */
	reconciles: TagReconcile[];
	/** Neither created, renamed, nor attached (`skip` / `do-nothing`). */
	dropped: TagRef[];
	failures: TagResolutionFailure[];
}

export type ReferencingWorkflow = Pick<PreparedWorkflow, 'sourceWorkflowId' | 'tagIds'>;

/** Tag ids the workflow importer must strip from `tagIds` before attaching. */
export function droppedTagIds(plan: TagImportPlan): ReadonlySet<string> {
	return new Set(plan.dropped.map(({ id }) => id));
}

export function sortedUnique(values: string[]): string[] {
	return [...new Set(values)].sort();
}

/**
 * Gates package tags that lay contradictory claims on one target tag row.
 * Example: the package carries tag X `prod` (project A) and tag H `staging`
 * (project B), while the target's tag H was manually renamed to `prod`.
 * Alone, each plan is fine: A reconciles X onto H's row, B renames H. Applied
 * together, A re-keys the row first and B's rename and attach find it gone,
 * failing the import halfway. Runs over ALL scopes' plans because each
 * project's plan only resolves the tags its own workflows reference, so no
 * single plan sees the pair; gating here keeps apply unable to fail after the
 * gate. Identical reconciles in several scopes are the multi-scope union case
 * and stay allowed.
 */
export function contestedReconcileTargetFailures(
	scopes: Array<{ tagPlan: TagImportPlan; workflows: ReferencingWorkflow[] }>,
): TagResolutionFailure[] {
	const reconcilesByKey = new Map<string, TagReconcile>();
	for (const { tagPlan } of scopes) {
		for (const reconcile of tagPlan.reconciles) {
			reconcilesByKey.set(JSON.stringify([reconcile.id, reconcile.oldId]), reconcile);
		}
	}
	if (reconcilesByKey.size === 0) return [];
	const reconciles = [...reconcilesByKey.values()];

	const claimedTargetIds = new Set(
		scopes.flatMap(({ tagPlan }) => [
			...tagPlan.matched.map(({ id }) => id),
			...tagPlan.renames.map(({ id }) => id),
		]),
	);
	const oldIdCounts = new Map<string, number>();
	for (const { oldId } of reconciles) {
		oldIdCounts.set(oldId, (oldIdCounts.get(oldId) ?? 0) + 1);
	}

	const sourceWorkflowIdsReferencing = (tagId: string) =>
		scopes.flatMap(({ workflows }) =>
			workflows
				.filter(({ tagIds }) => tagIds?.includes(tagId))
				.map(({ sourceWorkflowId }) => sourceWorkflowId),
		);

	return reconciles
		.filter(({ oldId }) => claimedTargetIds.has(oldId) || (oldIdCounts.get(oldId) ?? 0) > 1)
		.map(({ id, name, oldId }) => ({
			kind: 'name-collision',
			sourceId: id,
			name,
			existingTagId: oldId,
			usedByWorkflows: sortedUnique(sourceWorkflowIdsReferencing(id)),
		}));
}
