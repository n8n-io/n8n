import type { PromotionDirection, PromotionPreview, PromotionResource } from '@n8n/api-types';

import { isContainer } from './promotionPreview.tree';

/**
 * Selection rules of the promotion preview pages. Users select resources directly. The
 * operation includes the other resources for them.
 */

export type ResourceKey = string;

export type SelectionGraph = {
	direction: PromotionDirection;
	resources: ReadonlyMap<ResourceKey, PromotionResource>;
	/** Dependencies that the operation carries with the dependent resource. */
	requires: ReadonlyMap<ResourceKey, readonly ResourceKey[]>;
	requiredBy: ReadonlyMap<ResourceKey, readonly ResourceKey[]>;
	/** References that the operation does not carry, such as sub-workflows. */
	calls: ReadonlyMap<ResourceKey, readonly ResourceKey[]>;
	calledBy: ReadonlyMap<ResourceKey, readonly ResourceKey[]>;
};

export type InclusionReason =
	| { kind: 'selected' }
	/** `by` holds the selected resources that need this one. */
	| { kind: 'required'; by: ResourceKey[] }
	/**
	 * A changed project or folder that the operation writes. `by` holds the selected resources
	 * in it.
	 */
	| { kind: 'container'; by: ResourceKey[] }
	/** Referenced by a selected resource, but the operation does not include it. */
	| { kind: 'calledOnly'; by: ResourceKey[] };

export type Inclusion = {
	included: ReadonlySet<ResourceKey>;
	reasons: ReadonlyMap<ResourceKey, InclusionReason>;
};

/**
 * `default` follows the preview: every selectable resource is selected after each load.
 * `custom` keeps what the user chose, so a refresh or a cleared selection is not overwritten.
 */
export type SelectionState = {
	mode: 'default' | 'custom';
	selected: ReadonlySet<ResourceKey>;
};

export const initialSelectionState: SelectionState = { mode: 'default', selected: new Set() };

/** Blocked workflows. Users cannot add them to the selection, but they can always remove them. */
export type DisabledKeys = ReadonlySet<ResourceKey>;

const noKeys: DisabledKeys = new Set();

function addTo(map: Map<ResourceKey, ResourceKey[]>, key: ResourceKey, value: ResourceKey) {
	const list = map.get(key);
	if (!list) map.set(key, [value]);
	else if (!list.includes(value)) list.push(value);
}

export function buildSelectionGraph(
	preview: Pick<PromotionPreview, 'resources' | 'dependencies'>,
	direction: PromotionDirection,
): SelectionGraph {
	const resources = new Map(preview.resources.map((resource) => [resource.key, resource]));
	const requires = new Map<ResourceKey, ResourceKey[]>();
	const requiredBy = new Map<ResourceKey, ResourceKey[]>();
	const calls = new Map<ResourceKey, ResourceKey[]>();
	const calledBy = new Map<ResourceKey, ResourceKey[]>();

	for (const { workflowKey, resourceKey, included } of preview.dependencies) {
		if (!resources.has(workflowKey) || !resources.has(resourceKey)) continue;
		if (included) {
			addTo(requires, workflowKey, resourceKey);
			addTo(requiredBy, resourceKey, workflowKey);
		} else {
			addTo(calls, workflowKey, resourceKey);
			addTo(calledBy, resourceKey, workflowKey);
		}
	}

	return { direction, resources, requires, requiredBy, calls, calledBy };
}

function canSelect(graph: SelectionGraph, key: ResourceKey): boolean {
	return graph.resources.get(key)?.selectable === true;
}

export function selectableKeys(graph: SelectionGraph): ResourceKey[] {
	return [...graph.resources.values()]
		.filter((resource) => resource.selectable)
		.map((resource) => resource.key);
}

/** The selectable resources that users can add now. */
export function availableKeys(graph: SelectionGraph, disabled: DisabledKeys = noKeys) {
	return selectableKeys(graph).filter((key) => !disabled.has(key));
}

/** Projects and folders above the resource, nearest first. */
function ancestorsOf(graph: SelectionGraph, key: ResourceKey): ResourceKey[] {
	const ancestors: ResourceKey[] = [];
	const seen = new Set([key]);
	let parentKey = graph.resources.get(key)?.parentKey ?? null;
	while (parentKey !== null && !seen.has(parentKey) && graph.resources.has(parentKey)) {
		ancestors.push(parentKey);
		seen.add(parentKey);
		parentKey = graph.resources.get(parentKey)?.parentKey ?? null;
	}
	return ancestors;
}

/** Resources that `key` needs, directly or through other required resources. */
function requiredClosure(graph: SelectionGraph, key: ResourceKey): ResourceKey[] {
	const reached: ResourceKey[] = [];
	const seen = new Set([key]);
	const queue = [key];
	for (let index = 0; index < queue.length; index++) {
		for (const next of graph.requires.get(queue[index]) ?? []) {
			if (seen.has(next)) continue;
			seen.add(next);
			reached.push(next);
			queue.push(next);
		}
	}
	return reached;
}

export function resolveInclusion(
	graph: SelectionGraph,
	selected: ReadonlySet<ResourceKey>,
): Inclusion {
	const reasons = new Map<ResourceKey, InclusionReason>();
	const required = new Map<ResourceKey, ResourceKey[]>();
	const containers = new Map<ResourceKey, ResourceKey[]>();
	const called = new Map<ResourceKey, ResourceKey[]>();

	for (const key of selected) {
		if (!graph.resources.has(key)) continue;
		reasons.set(key, { kind: 'selected' });
		for (const dependency of requiredClosure(graph, key)) addTo(required, dependency, key);
		for (const ancestor of ancestorsOf(graph, key)) {
			if (graph.resources.get(ancestor)?.change !== 'unchanged') addTo(containers, ancestor, key);
		}
		for (const reference of graph.calls.get(key) ?? []) addTo(called, reference, key);
	}

	// Apply creates every new folder of the project, also one without a selected workflow. It
	// moves or renames a folder only with a selected workflow inside it. It runs only with at
	// least one selected workflow.
	if (graph.direction === 'apply' && reasons.size > 0) {
		for (const { key, type, change } of graph.resources.values()) {
			if (type === 'folder' && change === 'added' && !containers.has(key)) {
				containers.set(key, []);
			}
		}
	}

	// Direct selection wins over a derived reason, and inclusion wins over a reference.
	for (const [key, by] of required)
		if (!reasons.has(key)) reasons.set(key, { kind: 'required', by });
	for (const [key, by] of containers) {
		if (!reasons.has(key)) reasons.set(key, { kind: 'container', by });
	}
	for (const [key, by] of called) {
		if (!reasons.has(key)) reasons.set(key, { kind: 'calledOnly', by });
	}

	const included = new Set(
		[...reasons].filter(([, reason]) => reason.kind !== 'calledOnly').map(([key]) => key),
	);
	return { included, reasons };
}

/** Included resources that the operation changes. */
export function includedChangeCount(graph: SelectionGraph, { included }: Inclusion): number {
	return [...included].filter((key) => graph.resources.get(key)?.change !== 'unchanged').length;
}

/** The included changes when every selectable resource is selected. */
export function totalChangeCount(graph: SelectionGraph): number {
	return includedChangeCount(graph, resolveInclusion(graph, new Set(selectableKeys(graph))));
}

export function toggleSelection(
	state: SelectionState,
	graph: SelectionGraph,
	key: ResourceKey,
	disabled: DisabledKeys = noKeys,
): SelectionState {
	if (!canSelect(graph, key)) return state;
	const selected = new Set(state.selected);
	if (selected.has(key)) selected.delete(key);
	else if (disabled.has(key)) return state;
	else selected.add(key);
	return { mode: 'custom', selected };
}

/** The selectable resources inside a project or folder, at any depth. */
export function selectableDescendants(graph: SelectionGraph, containerKey: ResourceKey) {
	return selectableKeys(graph).filter((key) => ancestorsOf(graph, key).includes(containerKey));
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

/**
 * A project or folder shows the state of the selectable resources inside it. A disabled
 * resource counts only while it is selected, because users cannot add it.
 */
export function containerCheckState(
	graph: SelectionGraph,
	selected: ReadonlySet<ResourceKey>,
	containerKey: ResourceKey,
	disabled: DisabledKeys = noKeys,
): CheckState {
	const keys = selectableDescendants(graph, containerKey).filter(
		(key) => !disabled.has(key) || selected.has(key),
	);
	const count = keys.filter((key) => selected.has(key)).length;
	if (count === 0) return 'unchecked';
	return count === keys.length ? 'checked' : 'indeterminate';
}

export type SelectionCheck = { checked: boolean; indeterminate: boolean; disabled: boolean };

/**
 * The checkbox of a resource in the tree and on its change card. Workflows toggle themselves,
 * projects and folders toggle the workflows inside them, and dependencies stay read-only: they
 * are checked while a selected workflow needs them.
 */
export function selectionCheck(
	graph: SelectionGraph,
	resource: PromotionResource,
	state: {
		selected: ReadonlySet<ResourceKey>;
		inclusion: Inclusion;
		disabled: DisabledKeys;
		locked: boolean;
	},
): SelectionCheck {
	const { selected, inclusion, disabled, locked } = state;
	if (resource.selectable) {
		const checked = selected.has(resource.key);
		return {
			checked,
			indeterminate: false,
			// A blocked workflow can still be cleared.
			disabled: locked || (!checked && disabled.has(resource.key)),
		};
	}
	if (isContainer(resource)) {
		const check = containerCheckState(graph, selected, resource.key, disabled);
		const canAdd = selectableDescendants(graph, resource.key).some((key) => !disabled.has(key));
		return {
			checked: check === 'checked',
			indeterminate: check === 'indeterminate',
			disabled: locked || (!canAdd && check === 'unchecked'),
		};
	}
	return { checked: inclusion.included.has(resource.key), indeterminate: false, disabled: true };
}

/**
 * Selects every resource inside a project or folder that users can add, or clears them all when
 * those are selected. The container itself never becomes selected; it only gives structure.
 */
export function toggleContainer(
	state: SelectionState,
	graph: SelectionGraph,
	containerKey: ResourceKey,
	disabled: DisabledKeys = noKeys,
): SelectionState {
	const keys = selectableDescendants(graph, containerKey);
	const available = keys.filter((key) => !disabled.has(key));
	const selected = new Set(state.selected);
	if (available.every((key) => selected.has(key))) {
		for (const key of keys) selected.delete(key);
	} else {
		for (const key of available) selected.add(key);
	}
	return { mode: 'custom', selected };
}

/** Adds every resource that users can add. Selected disabled resources stay selected. */
export function selectAll(
	state: SelectionState,
	graph: SelectionGraph,
	disabled: DisabledKeys = noKeys,
): SelectionState {
	const kept = [...state.selected].filter((key) => canSelect(graph, key));
	return { mode: 'custom', selected: new Set([...kept, ...availableKeys(graph, disabled)]) };
}

export function clearSelection(): SelectionState {
	return { mode: 'custom', selected: new Set() };
}

/**
 * Applies a newly loaded preview. A default selection follows the preview: it holds every
 * resource that users can add, and keeps a selected resource that became disabled, so the page
 * never removes a selected workflow on its own. A custom selection keeps the keys that are still
 * selectable and reports the others.
 */
export function applyPreview(
	state: SelectionState,
	graph: SelectionGraph,
	disabled: DisabledKeys = noKeys,
): { state: SelectionState; dropped: ResourceKey[] } {
	if (state.mode === 'default') {
		const selected = selectableKeys(graph).filter(
			(key) => !disabled.has(key) || state.selected.has(key),
		);
		return { state: { mode: 'default', selected: new Set(selected) }, dropped: [] };
	}
	const kept = [...state.selected].filter((key) => canSelect(graph, key));
	const dropped = [...state.selected].filter((key) => !canSelect(graph, key));
	return { state: { mode: 'custom', selected: new Set(kept) }, dropped };
}
