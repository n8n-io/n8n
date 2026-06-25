import { computed, getCurrentScope, onScopeDispose, ref, type InjectionKey } from 'vue';
import { jsonParse } from 'n8n-workflow';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import { LOCAL_STORAGE_CANVAS_GROUP_EXPANDED } from '@/app/constants/localStorage';
import { isStringArrayRecord } from '@/app/utils/objectUtils';
import { applyOffset } from '../canvas.utils';
import {
	aggregateNodeGroupLayoutOffsets,
	computeNodeGroupLayoutPushes,
	getOffsetForComponent,
	mapNodeIdsToComponentIds,
	type NodeGroupLayoutComponent,
} from './useCanvasNodeGroupLayout';

export interface UseCanvasNodeGroupViewDeps {
	workflowId: () => string;
	getCurrentGroupIds: () => string[];
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
	isGroupingEnabled: () => boolean;
	// Show every group expanded and leave persisted view state untouched
	forceAllGroupsExpanded: () => boolean;
}

export interface NodeGroupNodePosition {
	id: string;
	position: { x: number; y: number };
}

export type GetNodePositionById = (nodeId: string) => [number, number] | undefined;

export type CanvasNodeGroupView = ReturnType<typeof useCanvasNodeGroupView>;

export const NodeGroupViewKey: InjectionKey<CanvasNodeGroupView> = Symbol('nodeGroupView');

// workflowId -> ordered expanded group ids.
type ExpandedGroupStore = Record<string, string[]>;

function readStore(): ExpandedGroupStore {
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED) ?? '';
		const parsed = jsonParse<unknown>(raw, { fallbackValue: {} });
		return isStringArrayRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(store: ExpandedGroupStore) {
	try {
		localStorage.setItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED, JSON.stringify(store));
	} catch {
		// Failure is not critical, as collapse state is a view preference
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
 *
 * The expanded ids are persisted to localStorage per workflow as an ordered
 * array, ordered by expansion recency (most recently expanded last), so a
 * reload restores the groups the user had open.
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	// Source of truth for expand state: group ids in expansion order
	// (oldest first). Everything not listed is collapsed.
	const expandedGroupIdOrder = ref<string[]>([]);
	const expandedIds = computed(() => new Set(expandedGroupIdOrder.value));
	const disabledPushSourceGroupIds = ref<Set<string>>(new Set());
	const layoutComponents = ref<NodeGroupLayoutComponent[]>([]);
	const nodeIdToComponentId = computed(() => mapNodeIdsToComponentIds(layoutComponents.value));
	// Nodes whose push offset is already baked into the store —
	// prevents pushing them a second time.
	const ignoredNodeIdsBySourceGroup = ref<Map<string, Set<string>>>(new Map());

	const pushSourceGroupIds = computed(
		() =>
			new Set(
				[...expandedIds.value].filter((groupId) => !disabledPushSourceGroupIds.value.has(groupId)),
			),
	);

	const pushEntries = computed(() =>
		computeNodeGroupLayoutPushes({
			components: layoutComponents.value,
			expandedGroupIds: pushSourceGroupIds.value,
			expandedGroupIdOrder: expandedGroupIdOrder.value,
			ignoredNodeIdsBySourceGroup: ignoredNodeIdsBySourceGroup.value,
		}),
	);
	const componentOffsets = computed(() => aggregateNodeGroupLayoutOffsets(pushEntries.value));

	function persist() {
		if (deps.forceAllGroupsExpanded()) return;
		writeStore({ ...readStore(), [deps.workflowId()]: [...expandedGroupIdOrder.value] });
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
		persist();
	}

	// Seed the expanded set on (re)load: all groups when forced, otherwise
	// the persisted ids. Drop any id whose group no longer exists.
	function restore(presentIds: Set<string>) {
		const stored = deps.forceAllGroupsExpanded()
			? [...presentIds]
			: (readStore()[deps.workflowId()] ?? []);
		expandedGroupIdOrder.value = stored.filter((id) => presentIds.has(id));
		disabledPushSourceGroupIds.value = new Set();
		ignoredNodeIdsBySourceGroup.value = new Map();

		const groupsLoaded = presentIds.size > 0;
		if (groupsLoaded) persist();
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
		persist();
	}

	const isGroupCollapsed = (id: string) => deps.isGroupingEnabled() && !expandedIds.value.has(id);

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
			pushEntries.value
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
			computeNodeGroupLayoutPushes({
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
				const offset = getOffsetForComponent(componentOffsets.value, component.id);
				if (offset.x === 0 && offset.y === 0) continue;
				const settledOffset = getOffsetForComponent(settledOffsets, component.id);
				if (settledOffset.x === offset.x && settledOffset.y === offset.y) continue;
				for (const nodeId of component.nodeIds) {
					// Moved nodes already carry their final visual position in `events`;
					// baking them from the not-yet-updated store would revert the drag.
					if (movedNodeIds.has(nodeId)) continue;
					const position = getNodePositionById(nodeId);
					if (!position) continue;
					bakedMoves.push({
						id: nodeId,
						position: applyOffset(position, offset),
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
					position: applyOffset(position, offset),
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
	// replacement) restores the persisted expanded state; ADD (new group)
	// starts expanded, unless flagged `startCollapsed` (imported/pasted
	// groups, whose stored positions describe the collapsed layout); DELETE
	// removes the id; UPDATE leaves collapse state alone.
	function handleNodeGroupsChange(event: NodeGroupChangeEvent) {
		if (event.action === CHANGE_ACTION.SET) {
			restore(new Set(event.payload.groups.map((group) => group.id)));
		} else if (event.action === CHANGE_ACTION.ADD && !event.payload.startCollapsed) {
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
	}

	let subscription: { off: () => void } | undefined;

	// Bind to the current document and seed from its groups; re-run when a
	// persistent canvas swaps documents (e.g. switching history versions).
	function reinitialize() {
		subscription?.off();
		subscription = deps.onNodeGroupsChange(handleNodeGroupsChange);
		restore(new Set(deps.getCurrentGroupIds()));
	}

	reinitialize();

	// Release the subscription with the surrounding scope so the handler
	// doesn't outlive its owner.
	if (getCurrentScope()) {
		onScopeDispose(() => subscription?.off());
	}

	return {
		reinitialize,
		isGroupCollapsed,
		toggleCollapsed,
		syncLayoutComponents,
		getVisualOffsetForComponent,
		getVisualOffsetForNode,
		settleManualNodePositions,
		commitMovedPushSourceEffects,
	};
}
