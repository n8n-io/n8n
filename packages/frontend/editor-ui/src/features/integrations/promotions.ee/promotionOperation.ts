import type {
	ApplyCheckResult,
	PromotionBindingConflict,
	PromotionBindingConsumer,
	PromotionResource,
	PromotionVariableScope,
} from '@n8n/api-types';

import type { ResourceKey, SelectionGraph } from './promotionPreview.selection';

/**
 * The request and the blockers of a promote or an apply from the preview page.
 */

/** The workflows that users selected. The server adds their dependencies. */
export function toOperationRequest(
	graph: SelectionGraph,
	selected: ReadonlySet<ResourceKey>,
): { workflowIds: string[] } {
	const workflowIds = new Set<string>();
	for (const key of selected) {
		const resource = graph.resources.get(key);
		if (resource?.type === 'workflow') workflowIds.add(resource.id);
	}
	return { workflowIds: [...workflowIds].sort() };
}

/**
 * `missing`, `access`, `conflict`, `moved` (to another project) and `location` (another folder
 * in the project) stop the apply of their workflows. A `destructive` data table change needs a
 * confirmation. A `warning` only informs.
 */
export type BlockerKind =
	| 'missing'
	| 'access'
	| 'conflict'
	| 'moved'
	| 'location'
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

/**
 * Keeps the blockers of workflows that the preview lists. The check also covers unchanged
 * workflows, which users cannot select, so their blockers stop nothing on the page.
 */
export function scopeCheck(check: ApplyCheckResult, graph: SelectionGraph): ApplyCheckResult {
	const listed = (id: string) => graph.resources.has(workflowKey(id));
	const scope = <Entry extends { consumers: PromotionBindingConsumer[] }>(entries: Entry[]) =>
		entries.flatMap((entry) => {
			const consumers = entry.consumers.flatMap((consumer) => {
				const workflows = consumer.workflows.filter(({ id }) => listed(id));
				return workflows.length > 0 ? [{ ...consumer, workflows }] : [];
			});
			return consumers.length > 0 ? [{ ...entry, consumers }] : [];
		});
	const { preflight } = check;
	return {
		...check,
		preflight: {
			...preflight,
			missingBindings: scope(preflight.missingBindings),
			accessRequirements: scope(preflight.accessRequirements),
			conflicts: preflight.conflicts.flatMap((conflict): PromotionBindingConflict[] => {
				if ('consumers' in conflict) return scope([conflict]);
				if (conflict.code === 'project-not-team') {
					return conflict.workflows.some(({ id }) => listed(id)) ? [conflict] : [];
				}
				return [conflict];
			}),
			warnings: scope(preflight.warnings),
		},
		movedWorkflows: check.movedWorkflows.filter(({ id }) => listed(id)),
	};
}

export function listBlockers({ preflight, movedWorkflows }: ApplyCheckResult): Blocker[] {
	const blockers: Blocker[] = [];
	for (const binding of preflight.missingBindings) {
		blockers.push({
			kind: 'missing',
			resourceKey:
				binding.kind === 'credential'
					? `credential:${binding.sourceId}`
					: variableKey(binding.name, binding.scope),
			workflowKeys: consumerKeys(binding.consumers),
		});
	}
	for (const access of preflight.accessRequirements) {
		blockers.push({
			kind: 'access',
			resourceKey: `credential:${access.sourceId}`,
			workflowKeys: consumerKeys(access.consumers),
		});
	}
	for (const conflict of preflight.conflicts) {
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
		} else if (conflict.kind === 'variable') {
			// The reference names no scope, so no preview row matches it.
			blockers.push({
				kind: 'conflict',
				resourceKey: null,
				workflowKeys: consumerKeys(conflict.consumers),
			});
		}
		// A selection never deletes a project, so the check reports no `project-deletion`.
	}
	for (const warning of preflight.warnings) {
		blockers.push({
			kind: 'warning',
			resourceKey: variableKey(warning.name, warning.scope),
			workflowKeys: consumerKeys(warning.consumers),
		});
	}
	for (const { id } of movedWorkflows) {
		blockers.push({ kind: 'moved', resourceKey: workflowKey(id), workflowKeys: [workflowKey(id)] });
	}
	return blockers;
}

export type BlockerIndex = {
	byWorkflow: ReadonlyMap<ResourceKey, Blocker[]>;
	byResource: ReadonlyMap<ResourceKey, Blocker[]>;
	/** Workflows that cannot be applied until their blockers are resolved. */
	blocked: ReadonlySet<ResourceKey>;
};

export const emptyBlockerIndex: BlockerIndex = {
	byWorkflow: new Map(),
	byResource: new Map(),
	blocked: new Set(),
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

/**
 * Folders and workflows that the branch holds under another parent. Apply cannot move them on
 * this instance. A folder stops the import for every selection. A workflow stops its own apply.
 */
export function locationConflicts(graph: SelectionGraph) {
	return [...graph.resources.values()].filter(
		({ type, previousParentKey }) =>
			(type === 'folder' || type === 'workflow') && previousParentKey !== undefined,
	);
}

export const locationBlocker = ({ key, type }: PromotionResource): Blocker => ({
	kind: 'location',
	resourceKey: key,
	workflowKeys: type === 'workflow' ? [key] : [],
});

/** True when the apply of these workflows removes data table values. */
export function touchesDestructiveChange(index: BlockerIndex, keys: Iterable<ResourceKey>) {
	for (const key of keys) {
		if (index.byWorkflow.get(key)?.some(({ kind }) => kind === 'destructive')) return true;
	}
	return false;
}
