import type { PromotableResource } from '@n8n/api-types';

export type SelectionState = 'checked' | 'mixed' | 'unchecked';

/** Ids of the changes above `change`, nearest first. */
function ancestorIds(
	change: PromotableResource,
	byId: ReadonlyMap<string, PromotableResource>,
): string[] {
	const ids: string[] = [];
	const seen = new Set<string>();
	let parentId = change.parentId;
	while (parentId && !seen.has(parentId) && byId.has(parentId)) {
		seen.add(parentId);
		ids.push(parentId);
		parentId = byId.get(parentId)?.parentId ?? null;
	}
	return ids;
}

/**
 * Keeps each search match with the renamed containers above it.
 * A match on a container also keeps everything inside it.
 */
export function filterPromotionChanges(
	changes: readonly PromotableResource[],
	search: string,
): PromotableResource[] {
	const term = search.toLowerCase();
	if (!term) return [...changes];

	const byId = new Map(changes.map((change) => [change.id, change]));
	const include = new Set<string>();

	function includeDescendants(rootId: string) {
		for (const change of changes) {
			if (change.parentId !== rootId || include.has(change.id)) continue;
			include.add(change.id);
			includeDescendants(change.id);
		}
	}

	for (const change of changes) {
		if (!change.name.toLowerCase().includes(term)) continue;
		include.add(change.id);
		if (change.type !== 'workflow') includeDescendants(change.id);
		for (const id of ancestorIds(change, byId)) include.add(id);
	}

	return changes.filter((change) => include.has(change.id));
}

/** Lists each renamed container before the rows inside it. Relative order inside a group stays. */
export function orderPromotionChanges(
	changes: readonly PromotableResource[],
): PromotableResource[] {
	const ids = new Set(changes.map((change) => change.id));
	const byParent = new Map<string | null, PromotableResource[]>();
	for (const change of changes) {
		const parentId = change.parentId && ids.has(change.parentId) ? change.parentId : null;
		const group = byParent.get(parentId) ?? [];
		group.push(change);
		byParent.set(parentId, group);
	}

	const ordered: PromotableResource[] = [];
	const visit = (parentId: string | null) => {
		for (const change of byParent.get(parentId) ?? []) {
			ordered.push(change);
			visit(change.id);
		}
	};
	visit(null);
	return ordered;
}

export function promotionChangeDepth(
	change: PromotableResource,
	byId: ReadonlyMap<string, PromotableResource>,
): number {
	return ancestorIds(change, byId).length;
}

/**
 * Maps each container to the workflows inside it, at any depth.
 * Only containers present in `changes` get an entry.
 */
export function workflowIdsByContainer(
	changes: readonly PromotableResource[],
): Map<string, string[]> {
	const byId = new Map(changes.map((change) => [change.id, change]));
	const result = new Map<string, string[]>();
	for (const change of changes) {
		if (change.type !== 'workflow') continue;
		for (const id of ancestorIds(change, byId)) {
			const list = result.get(id) ?? [];
			list.push(change.id);
			result.set(id, list);
		}
	}
	return result;
}

/** A container is checked when all its workflows are, and mixed when only some are. */
export function containerSelectionState(
	workflowIds: readonly string[],
	selectedWorkflowIds: ReadonlySet<string>,
): SelectionState {
	const selected = workflowIds.filter((id) => selectedWorkflowIds.has(id)).length;
	if (selected === 0) return 'unchecked';
	return selected === workflowIds.length ? 'checked' : 'mixed';
}

/**
 * The nearest container above `change` that has a selected workflow inside it.
 * Its directory moves, and so does everything else inside that directory.
 */
export function movingContainer(
	change: PromotableResource,
	byId: ReadonlyMap<string, PromotableResource>,
	workflowsByContainer: ReadonlyMap<string, readonly string[]>,
	selectedWorkflowIds: ReadonlySet<string>,
): PromotableResource | undefined {
	for (const id of ancestorIds(change, byId)) {
		const workflowIds = workflowsByContainer.get(id) ?? [];
		if (workflowIds.some((workflowId) => selectedWorkflowIds.has(workflowId))) {
			return byId.get(id);
		}
	}
	return undefined;
}
