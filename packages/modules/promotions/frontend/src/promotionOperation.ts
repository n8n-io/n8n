import type {
	PromotionBindingConflict,
	PromotionBindingConsumer,
	PromotionMissingDependency,
	PromotionResource,
	PromotionVariableScope,
} from '@n8n/api-types';

import type { ApplyCheckResult } from './promotions.types';
import type { ResourceKey, SelectionGraph } from './promotionPreview.selection';

/**
 * The request and the blockers of a promote or an apply from the preview page.
 */

export type OperationSelection = {
	workflowIds: string[];
	folderIds: string[];
	/** Credentials that the project owns. Only Promote sends them. */
	credentialIds: string[];
};

/**
 * What users selected. The server adds the project, the dependencies and the folders above, so
 * a selection of only the project sends no ids.
 */
export function toOperationRequest(
	graph: SelectionGraph,
	selected: ReadonlySet<ResourceKey>,
): OperationSelection {
	const workflowIds = new Set<string>();
	const folderIds = new Set<string>();
	const credentialIds = new Set<string>();
	for (const key of selected) {
		const resource = graph.resources.get(key);
		if (resource?.type === 'workflow') workflowIds.add(resource.id);
		if (resource?.type === 'folder') folderIds.add(resource.id);
		// Other credentials come with the workflows that use them.
		if (resource?.type === 'credential' && resource.selectable) credentialIds.add(resource.id);
	}
	return {
		workflowIds: [...workflowIds].sort(),
		folderIds: [...folderIds].sort(),
		credentialIds: [...credentialIds].sort(),
	};
}

/**
 * `missing`, `access`, `conflict`, `moved` (between projects) and `outside` (a dependency that
 * only someone else can resolve) stop the operation for their workflows. A moved folder stops
 * Apply for every workflow. A `destructive` data table change needs a confirmation. A `warning`
 * only informs.
 */
export type BlockerKind =
	| 'missing'
	| 'access'
	| 'conflict'
	| 'moved'
	| 'outside'
	| 'destructive'
	| 'warning';

export type Blocker = {
	kind: BlockerKind;
	/** The preview row of the resource. `null` when no row matches, as for a nameless reference. */
	resourceKey: ResourceKey | null;
	workflowKeys: ResourceKey[];
};

export const isBlocking = ({ kind }: Blocker) => kind !== 'destructive' && kind !== 'warning';

const workflowKey = (id: string) => `workflow:${id}`;

// The same keys as the preview rows.
function variableKey(name: string, scope: PromotionVariableScope) {
	const encoded = encodeURIComponent(name);
	return scope.kind === 'global'
		? `variable:global:${encoded}`
		: `variable:project:${scope.project.id}:${encoded}`;
}

const consumerKeys = (consumers: PromotionBindingConsumer[]) =>
	consumers.flatMap(({ workflows }) => workflows.map(({ id }) => workflowKey(id)));

type UsedByWorkflows = { consumers: PromotionBindingConsumer[] };

/** Keeps the entries that a kept workflow uses, with only the kept workflows as their consumers. */
function scopeConsumers<Entry extends UsedByWorkflows>(
	entries: Entry[],
	keep: (workflowId: string) => boolean,
): Entry[] {
	return entries.flatMap((entry) => {
		const consumers = entry.consumers.flatMap((consumer) => {
			const workflows = consumer.workflows.filter(({ id }) => keep(id));
			return workflows.length > 0 ? [{ ...consumer, workflows }] : [];
		});
		return consumers.length > 0 ? [{ ...entry, consumers }] : [];
	});
}

/**
 * Keeps the missing dependencies and warnings of a Promote that a selected workflow uses. The
 * preview lists them for every workflow of the project, and Promote sends only the selection.
 */
export function scopeToSelection<Entry extends UsedByWorkflows>(
	entries: Entry[],
	selected: ReadonlySet<ResourceKey>,
): Entry[] {
	return scopeConsumers(entries, (id) => selected.has(workflowKey(id)));
}

/** The entries that each workflow uses, by workflow key. */
export function indexByWorkflow<Entry extends UsedByWorkflows>(
	entries: Entry[],
): Map<ResourceKey, Entry[]> {
	const byWorkflow = new Map<ResourceKey, Entry[]>();
	for (const entry of entries) {
		for (const key of consumerKeys(entry.consumers)) {
			byWorkflow.set(key, [...(byWorkflow.get(key) ?? []), entry]);
		}
	}
	return byWorkflow;
}

/**
 * The missing dependencies of an Apply that the page lists and counts for one selection. This is
 * the only place that decides it.
 * - The other lists of the check already detail a credential or a variable that the user can
 *   resolve, so those entries are left out.
 * - An entry with a `condition` holds only when the selection includes its target workflow
 *   (`target-selected`), or only when it does not (`target-not-selected`). Only the Apply preview
 *   of a project sends a `condition`.
 *
 * The user accepts the ones that do not stop the Apply in its confirmation. The others are
 * blockers: see `listDependencyBlockers`.
 */
export const listOnlyDependencies = (
	missingDependencies: PromotionMissingDependency[],
	selected: ReadonlySet<ResourceKey>,
) =>
	missingDependencies.filter(({ group, kind, condition, id }) => {
		if (group === 'needs-action' && kind !== 'workflow') return false;
		if (condition === undefined || id === undefined) return true;
		return selected.has(workflowKey(id)) === (condition === 'target-selected');
	});

/** An entry of `listOnlyDependencies` that only warns. The Issues tab lists it under "Warnings". */
export const isWarningDependency = ({ group }: PromotionMissingDependency) =>
	group === 'needs-action';

/**
 * The blockers of the missing dependencies that stop the Apply. `dependencies` is the list of
 * `listOnlyDependencies`, so the blockers follow the selection as the Issues tab does. The user
 * cannot resolve these dependencies on the page.
 */
export const listDependencyBlockers = (dependencies: PromotionMissingDependency[]) =>
	dependencies.flatMap(({ blocking, kind, id, consumers }): Blocker[] =>
		blocking
			? [
					{
						kind: 'outside',
						// Only a credential has a preview row to mark.
						resourceKey: kind === 'credential' && id !== undefined ? `credential:${id}` : null,
						workflowKeys: consumerKeys(consumers),
					},
				]
			: [],
	);

/**
 * Narrows the list of `listOnlyDependencies` to the selection of a project Apply. An entry that
 * does not stop the Apply shows only for the selected workflows that use it. An entry that stops
 * the Apply stays whole: its workflows cannot be selected, and the user must see why.
 */
export const scopeNonBlockingToSelection = (
	dependencies: PromotionMissingDependency[],
	selected: ReadonlySet<ResourceKey>,
) =>
	dependencies.flatMap((dependency) =>
		dependency.blocking ? [dependency] : scopeToSelection([dependency], selected),
	);

/**
 * Keeps the blockers of workflows that the preview lists. The check also covers unchanged
 * workflows, which users cannot select, so their blockers stop nothing on the page.
 */
export function scopeCheck(check: ApplyCheckResult, graph: SelectionGraph): ApplyCheckResult {
	const listed = (id: string) => graph.resources.has(workflowKey(id));
	const scope = <Entry extends UsedByWorkflows>(entries: Entry[]) =>
		scopeConsumers(entries, listed);
	return {
		...check,
		missingBindings: scope(check.missingBindings),
		accessRequirements: scope(check.accessRequirements),
		conflicts: check.conflicts.flatMap((conflict): PromotionBindingConflict[] => {
			if ('consumers' in conflict) return scope([conflict]);
			if (conflict.code === 'project-not-team') {
				return conflict.workflows.some(({ id }) => listed(id)) ? [conflict] : [];
			}
			return [conflict];
		}),
		warnings: scope(check.warnings),
		missingDependencies: scope(check.missingDependencies),
		movedWorkflows: check.movedWorkflows.filter(({ id }) => listed(id)),
		// A folder that moved into the project stops the import for every selection, so keep all.
		movedFolders: check.movedFolders,
	};
}

/** The blockers of the check. A project-wide conflict blocks every key in `listedKeys`. */
export function listBlockers(
	{
		missingBindings,
		accessRequirements,
		conflicts,
		warnings,
		movedWorkflows,
		movedFolders,
	}: ApplyCheckResult,
	listedKeys: ResourceKey[],
): Blocker[] {
	const blockers: Blocker[] = [];
	for (const binding of missingBindings) {
		blockers.push({
			kind: 'missing',
			resourceKey:
				binding.kind === 'credential'
					? `credential:${binding.sourceId}`
					: variableKey(binding.name, binding.scope),
			workflowKeys: consumerKeys(binding.consumers),
		});
	}
	for (const access of accessRequirements) {
		blockers.push({
			kind: 'access',
			resourceKey: `credential:${access.sourceId}`,
			workflowKeys: consumerKeys(access.consumers),
		});
	}
	for (const conflict of conflicts) {
		// Moves come from `movedWorkflows` and `movedFolders` below.
		if (conflict.code === 'moved') continue;
		if (conflict.code === 'destructive-change') {
			blockers.push({
				kind: 'destructive',
				resourceKey: `dataTable:${conflict.id}`,
				workflowKeys: consumerKeys(conflict.consumers),
			});
		} else if (conflict.code === 'project-not-team') {
			blockers.push({
				kind: 'conflict',
				resourceKey: `project:${conflict.project.id}`,
				workflowKeys: conflict.workflows.map(({ id }) => workflowKey(id)),
			});
		} else if (conflict.kind === 'credential') {
			blockers.push({
				kind: 'conflict',
				resourceKey: conflict.sourceId === null ? null : `credential:${conflict.sourceId}`,
				workflowKeys: consumerKeys(conflict.consumers),
			});
		} else if (conflict.kind === 'variable' || conflict.kind === 'workflow') {
			// No preview row matches these, so the blocker marks only the workflows.
			blockers.push({
				kind: 'conflict',
				resourceKey: null,
				workflowKeys: consumerKeys(conflict.consumers),
			});
		} else if (conflict.kind === 'data-table' || conflict.kind === 'tag') {
			const type = conflict.kind === 'tag' ? 'tag' : 'dataTable';
			blockers.push({
				kind: 'conflict',
				resourceKey: conflict.id === undefined ? null : `${type}:${conflict.id}`,
				workflowKeys: consumerKeys(conflict.consumers),
			});
		} else if (conflict.code !== 'project-deletion') {
			blockers.push({
				kind: 'conflict',
				resourceKey: `project:${conflict.project.id}`,
				workflowKeys: listedKeys,
			});
		}
	}
	for (const warning of warnings) {
		// A reference that was broken on the source has no preview row. The Issues tab lists it.
		if (warning.code !== 'variable-shadowed') continue;
		blockers.push({
			kind: 'warning',
			resourceKey: variableKey(warning.name, warning.scope),
			workflowKeys: consumerKeys(warning.consumers),
		});
	}
	for (const { id } of movedWorkflows) {
		blockers.push({ kind: 'moved', resourceKey: workflowKey(id), workflowKeys: [workflowKey(id)] });
	}
	// The page blocks every selection while such a folder exists, so this only marks the folder row.
	for (const { id } of movedFolders) {
		blockers.push({ kind: 'moved', resourceKey: `folder:${id}`, workflowKeys: [] });
	}
	return blockers;
}

/** Workflows that moved between projects on this instance, in either direction. Promote refuses them. */
export function crossProjectMoveBlockers(graph: SelectionGraph): Blocker[] {
	return [...graph.resources.values()].flatMap(({ key, movedToProject, movedFromProject }) =>
		movedToProject || movedFromProject
			? [{ kind: 'moved' as const, resourceKey: key, workflowKeys: [key] }]
			: [],
	);
}

export type BlockerIndex = {
	byWorkflow: ReadonlyMap<ResourceKey, Blocker[]>;
	byResource: ReadonlyMap<ResourceKey, Blocker[]>;
	/** Workflows that cannot be applied until their blockers are resolved. */
	blocked: ReadonlySet<ResourceKey>;
};

function push(map: Map<ResourceKey, Blocker[]>, key: ResourceKey, blocker: Blocker) {
	const list = map.get(key);
	if (!list) map.set(key, [blocker]);
	else if (!list.includes(blocker)) list.push(blocker);
}

export function indexBlockers(blockers: Blocker[]): BlockerIndex {
	const byWorkflow = new Map<ResourceKey, Blocker[]>();
	const byResource = new Map<ResourceKey, Blocker[]>();
	const blocked = new Set<ResourceKey>();
	for (const blocker of blockers) {
		if (blocker.resourceKey !== null) push(byResource, blocker.resourceKey, blocker);
		for (const key of blocker.workflowKeys) {
			push(byWorkflow, key, blocker);
			if (isBlocking(blocker)) blocked.add(key);
		}
	}
	return { byWorkflow, byResource, blocked };
}

/** The blockers that a tree row or a card shows: a workflow shows what stops it. */
export const blockersOf = (index: BlockerIndex, { key, type }: PromotionResource) =>
	type === 'workflow' ? index.byWorkflow.get(key) : index.byResource.get(key);

/** True when the apply of these workflows removes data table values. */
export function touchesDestructiveChange(index: BlockerIndex, keys: Iterable<ResourceKey>) {
	for (const key of keys) {
		if (index.byWorkflow.get(key)?.some(({ kind }) => kind === 'destructive')) return true;
	}
	return false;
}
