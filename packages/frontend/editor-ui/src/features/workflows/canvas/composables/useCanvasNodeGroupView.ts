import { computed, getCurrentScope, onScopeDispose, ref, type InjectionKey, type Ref } from 'vue';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import type { IWorkflowGroup } from 'n8n-workflow';
import { LOCAL_STORAGE_CANVAS_EXPANDED_GROUP_IDS } from '@/app/constants/localStorage';
import {
	aggregateNodeGroupLayoutOffsets,
	computeNodeGroupLayoutOffsetEntries,
	getOffsetForComponent,
	mapNodeIdsToComponentIds,
	type NodeGroupLayoutComponent,
} from './useCanvasNodeGroupLayout';

export interface UseCanvasNodeGroupViewDeps {
	allGroups: Ref<IWorkflowGroup[]>;
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
	isGroupingEnabled?: () => boolean;
}

export interface NodeGroupNodePosition {
	id: string;
	position: { x: number; y: number };
}

export type GetNodePositionById = (nodeId: string) => [number, number] | undefined;

export type CanvasNodeGroupView = ReturnType<typeof useCanvasNodeGroupView>;

export const NodeGroupViewKey: InjectionKey<CanvasNodeGroupView> = Symbol('nodeGroupView');

/** Persisted expand order, restricted to ids present in `groups`. */
function readPersistedExpandedGroupIdOrder(groups: IWorkflowGroup[]): string[] {
	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(LOCAL_STORAGE_CANVAS_EXPANDED_GROUP_IDS) ?? '[]',
		);
		if (!Array.isArray(value)) return [];
		const groupIds = new Set(groups.map((group) => group.id));
		return value.filter(
			(groupId): groupId is string => typeof groupId === 'string' && groupIds.has(groupId),
		);
	} catch {
		return [];
	}
}

/** Copy of `ignored` with `nodeIds` added to the set of every group in `groupIds`. */
function withIgnoredNodes(
	ignored: Map<string, Set<string>>,
	groupIds: Iterable<string>,
	nodeIds: Iterable<string>,
): Map<string, Set<string>> {
	const next = new Map(ignored);
	for (const groupId of groupIds) {
		const ignoredNodeIds = new Set(next.get(groupId));
		for (const nodeId of nodeIds) {
			ignoredNodeIds.add(nodeId);
		}
		next.set(groupId, ignoredNodeIds);
	}
	return next;
}

/**
 * Canvas view-state for group collapse/expand. Lives separately from the
 * workflow document store because collapse is not workflow data — it does
 * not dirty the document, does not enter undo, and is not serialized.
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	// Source of truth for expand state: group ids in expansion order
	// (oldest first). Everything not listed is collapsed.
	const expandedGroupIdOrder = ref<string[]>(
		readPersistedExpandedGroupIdOrder(deps.allGroups.value),
	);
	const expandedIds = computed(() => new Set(expandedGroupIdOrder.value));
	const disabledPushSourceGroupIds = ref<Set<string>>(new Set());
	const layoutComponents = ref<NodeGroupLayoutComponent[]>([]);
	const nodeIdToComponentId = computed(() => mapNodeIdsToComponentIds(layoutComponents.value));
	const ignoredNodeIdsBySourceGroup = ref<Map<string, Set<string>>>(new Map());

	const pushSourceGroupIds = computed(
		() =>
			new Set(
				[...expandedIds.value].filter((groupId) => !disabledPushSourceGroupIds.value.has(groupId)),
			),
	);

	const offsetEntries = computed(() =>
		computeNodeGroupLayoutOffsetEntries({
			components: layoutComponents.value,
			expandedGroupIds: pushSourceGroupIds.value,
			expandedGroupIdOrder: expandedGroupIdOrder.value,
			ignoredNodeIdsBySourceGroup: ignoredNodeIdsBySourceGroup.value,
		}),
	);
	const componentOffsets = computed(() => aggregateNodeGroupLayoutOffsets(offsetEntries.value));

	function persistExpandedGroupIds() {
		try {
			localStorage.setItem(
				LOCAL_STORAGE_CANVAS_EXPANDED_GROUP_IDS,
				JSON.stringify(expandedGroupIdOrder.value),
			);
		} catch {}
	}

	function clearIgnoredNodesForSourceGroup(id: string) {
		if (!ignoredNodeIdsBySourceGroup.value.has(id)) return;
		const next = new Map(ignoredNodeIdsBySourceGroup.value);
		next.delete(id);
		ignoredNodeIdsBySourceGroup.value = next;
	}

	function removeDeletedGroup(id: string) {
		expandedGroupIdOrder.value = expandedGroupIdOrder.value.filter((groupId) => groupId !== id);
		disabledPushSourceGroupIds.value = new Set(
			[...disabledPushSourceGroupIds.value].filter((groupId) => groupId !== id),
		);
		clearIgnoredNodesForSourceGroup(id);
		persistExpandedGroupIds();
	}

	function applyPersistedExpandedState(groups: IWorkflowGroup[]) {
		expandedGroupIdOrder.value = readPersistedExpandedGroupIdOrder(groups);
		disabledPushSourceGroupIds.value = new Set();
		ignoredNodeIdsBySourceGroup.value = new Map();
		persistExpandedGroupIds();
	}

	function setGroupExpanded(id: string, value: boolean) {
		if (expandedIds.value.has(id) === value) return;

		if (value) {
			expandedGroupIdOrder.value = [...expandedGroupIdOrder.value, id];
		} else {
			clearIgnoredNodesForSourceGroup(id);
			expandedGroupIdOrder.value = expandedGroupIdOrder.value.filter((groupId) => groupId !== id);
		}

		disabledPushSourceGroupIds.value = new Set(
			[...disabledPushSourceGroupIds.value].filter((groupId) => groupId !== id),
		);
		persistExpandedGroupIds();
	}

	const isGroupingEnabled = () => deps.isGroupingEnabled?.() ?? true;

	const isGroupCollapsed = (id: string) => isGroupingEnabled() && !expandedIds.value.has(id);

	function toggleCollapsed(id: string) {
		setGroupExpanded(id, isGroupCollapsed(id));
	}

	function syncLayoutComponents(components: NodeGroupLayoutComponent[]) {
		layoutComponents.value = components;
	}

	function getVisualOffsetForComponent(componentId: string) {
		return getOffsetForComponent(componentOffsets.value, componentId);
	}

	function getVisualOffsetForNode(nodeId: string) {
		const componentId = nodeIdToComponentId.value.get(nodeId);
		return componentId ? getVisualOffsetForComponent(componentId) : { x: 0, y: 0 };
	}

	function ignoreNodesForSourceGroups(nodeIds: string[], sourceGroupIds?: string[]) {
		const groupIds = sourceGroupIds ?? [...expandedIds.value];
		if (nodeIds.length === 0 || groupIds.length === 0) return;
		ignoredNodeIdsBySourceGroup.value = withIgnoredNodes(
			ignoredNodeIdsBySourceGroup.value,
			groupIds,
			nodeIds,
		);
	}

	function getPushedNodeIdsFromSourceGroups(groupIds: string[]) {
		const groupIdSet = new Set(groupIds);
		const componentIds = new Set(
			offsetEntries.value
				.filter((entry) => groupIdSet.has(entry.sourceGroupId))
				.map((entry) => entry.componentId),
		);
		const nodeIds = new Set<string>();

		for (const component of layoutComponents.value) {
			if (!componentIds.has(component.id)) continue;
			for (const nodeId of component.nodeIds) {
				nodeIds.add(nodeId);
			}
		}

		return [...nodeIds];
	}

	function disablePushSourceGroups(groupIds: string[]) {
		const next = new Set(disabledPushSourceGroupIds.value);
		for (const groupId of groupIds) {
			if (expandedIds.value.has(groupId)) {
				next.add(groupId);
			}
		}
		disabledPushSourceGroupIds.value = next;
	}

	// What the offsets would become if `movedNodeIds` no longer participated
	// in any push.
	function getSettledPushOffsets(movedNodeIds: Set<string>) {
		return aggregateNodeGroupLayoutOffsets(
			computeNodeGroupLayoutOffsetEntries({
				components: layoutComponents.value,
				expandedGroupIds: pushSourceGroupIds.value,
				expandedGroupIdOrder: expandedGroupIdOrder.value,
				ignoredNodeIdsBySourceGroup: withIgnoredNodes(
					ignoredNodeIdsBySourceGroup.value,
					expandedIds.value,
					movedNodeIds,
				),
			}),
		);
	}

	function settleManualNodePositions(
		events: NodeGroupNodePosition[],
		getNodePositionById?: GetNodePositionById,
	) {
		// No expanded groups → no live pushes; nothing to settle or bake.
		if (expandedIds.value.size === 0) return events;

		const movedNodeIds = new Set(events.map(({ id }) => id));
		const bakedMoves: NodeGroupNodePosition[] = [];

		if (getNodePositionById && movedNodeIds.size > 0) {
			// Ignoring the moved nodes can remove the very overlap that triggered a
			// push lane, snapping the other components in that lane back. Bake the
			// current visual position of every component whose offset would change
			// so they stay put (same principle as commitMovedPushSourceEffects);
			// components whose push is still triggered stay live.
			const settledOffsets = getSettledPushOffsets(movedNodeIds);
			for (const component of layoutComponents.value) {
				if (component.nodeIds.some((nodeId) => movedNodeIds.has(nodeId))) continue;
				const offset = getOffsetForComponent(componentOffsets.value, component.id);
				if (offset.x === 0 && offset.y === 0) continue;
				const settledOffset = getOffsetForComponent(settledOffsets, component.id);
				if (settledOffset.x === offset.x && settledOffset.y === offset.y) continue;
				for (const nodeId of component.nodeIds) {
					const position = getNodePositionById(nodeId);
					if (!position) continue;
					bakedMoves.push({
						id: nodeId,
						position: { x: position[0] + offset.x, y: position[1] + offset.y },
					});
				}
			}
		}

		ignoreNodesForSourceGroups([...movedNodeIds, ...bakedMoves.map(({ id }) => id)]);
		return [...events, ...bakedMoves];
	}

	function commitMovedPushSourceEffects(
		sourceGroupIds: string[],
		getNodePositionById: GetNodePositionById,
	) {
		const pushedNodeIds = getPushedNodeIdsFromSourceGroups(sourceGroupIds);
		const pushedNodeMoves = pushedNodeIds.flatMap<NodeGroupNodePosition>((nodeId) => {
			const position = getNodePositionById(nodeId);
			if (!position) return [];

			const offset = getVisualOffsetForNode(nodeId);
			return [
				{
					id: nodeId,
					position: {
						x: position[0] + offset.x,
						y: position[1] + offset.y,
					},
				},
			];
		});

		if (pushedNodeMoves.length > 0) {
			ignoreNodesForSourceGroups(pushedNodeMoves.map(({ id }) => id));
		}
		disablePushSourceGroups(sourceGroupIds);

		return pushedNodeMoves;
	}

	// Default collapse state per change action: SET (workflow load /
	// replacement) collapses every group; ADD (new group) starts expanded;
	// DELETE removes the id; UPDATE leaves collapse state alone.
	const subscription = deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			applyPersistedExpandedState(event.payload.groups);
		} else if (event.action === CHANGE_ACTION.ADD) {
			setGroupExpanded(event.payload.group.id, true);
			// New groups open expanded, but creating one shouldn't shove existing
			// nodes/groups around. Keep it out of the active push sources for now —
			// a page reload re-enables pushing via the persisted expanded state.
			disabledPushSourceGroupIds.value = new Set([
				...disabledPushSourceGroupIds.value,
				event.payload.group.id,
			]);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			removeDeletedGroup(event.payload.id);
		}
	});

	// Release the subscription with the surrounding scope so the handler
	// doesn't outlive its owner.
	if (getCurrentScope()) {
		onScopeDispose(() => subscription.off());
	}

	return {
		isGroupCollapsed,
		toggleCollapsed,
		syncLayoutComponents,
		getVisualOffsetForComponent,
		getVisualOffsetForNode,
		settleManualNodePositions,
		commitMovedPushSourceEffects,
	};
}
