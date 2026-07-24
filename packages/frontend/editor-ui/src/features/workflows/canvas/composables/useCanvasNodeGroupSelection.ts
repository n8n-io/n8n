import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { IWorkflowGroup } from 'n8n-workflow';
import { isPresent } from '@/app/utils/typesUtils';
import {
	createCanvasGroupNodeId,
	isCanvasGroupNode,
	parseCanvasGroupNodeId,
	type BoundingBox,
	type CanvasGroupNodeData,
} from '../canvas.types';
import { computeGroupFrameRects } from './useCanvasMapping.groups';

export interface UseCanvasNodeGroupSelectionDeps {
	canvasId?: string;
	isEnabled: MaybeRefOrGetter<boolean>;
	getGroupById: (groupId: string) => IWorkflowGroup | undefined;
	getGroupForNode: (nodeId: string) => IWorkflowGroup | undefined;
	isGroupCollapsed: (groupId: string) => boolean;
}

/**
 * Keeps the VueFlow selection consistent for expanded node groups, so a group
 * and its member nodes select as one unit:
 * - selecting the title bar selects every member node;
 * - deselecting the title bar of a fully selected group deselects the members;
 * - selecting every member selects the title bar;
 * - breaking a full selection (deselecting a member) deselects the title bar;
 * - a title bar mounting around a fully selected member set selects itself
 *   (grouping the current selection via toolbar/shortcut/context menu).
 *
 * Collapsed groups are left alone: their members are hidden, so the title bar
 * stands in for them and bulk operations expand membership at operation time
 * (see `selectedNodeIdsWithGroupMembers` in Canvas.vue).
 */
export function useCanvasNodeGroupSelection(deps: UseCanvasNodeGroupSelectionDeps) {
	const {
		getSelectedNodes,
		addSelectedNodes,
		removeSelectedNodes,
		findNode,
		userSelectionActive,
		nodesSelectionActive,
		nodes,
	} = useVueFlow(deps.canvasId);

	// Selection snapshot from the last reconciliation — diffing against it
	// tells user-driven changes apart from our own.
	let lastSelectedIds = new Set<string>();

	const selectedIds = computed(() => new Set(getSelectedNodes.value.map((node) => node.id)));

	const mountedGroupNodeIdsKey = computed(() =>
		nodes.value
			.filter(isCanvasGroupNode)
			.map((node) => node.id)
			.sort()
			.join('|'),
	);

	function expandedGroupOfGroupNode(id: string): IWorkflowGroup | undefined {
		const groupId = parseCanvasGroupNodeId(id);
		if (groupId === undefined || deps.isGroupCollapsed(groupId)) return undefined;
		const group = deps.getGroupById(groupId);
		return group && group.nodeIds.length > 0 ? group : undefined;
	}

	function expandedGroupOfMember(nodeId: string): IWorkflowGroup | undefined {
		if (parseCanvasGroupNodeId(nodeId) !== undefined) return undefined;
		const group = deps.getGroupForNode(nodeId);
		return group && !deps.isGroupCollapsed(group.id) ? group : undefined;
	}

	/** The selection the current one should become to satisfy the invariant. */
	function reconcile(currentIds: Set<string>): Set<string> {
		const added = [...currentIds].filter((id) => !lastSelectedIds.has(id));
		const removed = [...lastSelectedIds].filter((id) => !currentIds.has(id));
		const target = new Set(currentIds);

		// Selecting a title bar selects the group's members.
		for (const id of added) {
			const group = expandedGroupOfGroupNode(id);
			for (const memberId of group?.nodeIds ?? []) target.add(memberId);
		}

		// Deselecting a title bar while the members remained selected is a
		// group-level deselect — drop the members too. If members left the
		// selection alongside it, the selection was replaced; leave it as-is.
		for (const id of removed) {
			const group = expandedGroupOfGroupNode(id);
			if (!group?.nodeIds.every((memberId) => currentIds.has(memberId))) continue;
			for (const memberId of group.nodeIds) target.delete(memberId);
		}

		// Title bars sync to "all members selected". Checked for every group
		// the target selection touches — not just changed ids — so the
		// invariant also holds when a title bar mounts around an
		// already-selected member set (grouping the current selection).
		const groupsToCheck = new Map<string, IWorkflowGroup>();
		for (const id of target) {
			const group = expandedGroupOfMember(id) ?? expandedGroupOfGroupNode(id);
			if (group) groupsToCheck.set(group.id, group);
		}
		for (const group of groupsToCheck.values()) {
			const groupNodeId = createCanvasGroupNodeId(group.id);
			if (group.nodeIds.every((memberId) => target.has(memberId))) {
				target.add(groupNodeId);
			} else {
				target.delete(groupNodeId);
			}
		}

		return target;
	}

	function applySelection(target: Set<string>, currentIds: Set<string>) {
		const targetNodes = [...target].map((id) => findNode(id)).filter(isPresent);
		if (targetNodes.length === 0) {
			removeSelectedNodes(getSelectedNodes.value);
			return;
		}
		// addSelectedNodes replaces the selection outside multi-selection mode
		// but only appends within it — the explicit remove covers the latter.
		addSelectedNodes(targetNodes);
		const nodesToRemove = [...currentIds]
			.filter((id) => !target.has(id))
			.map((id) => findNode(id))
			.filter(isPresent)
			.filter((node) => node.selected);
		if (nodesToRemove.length > 0) removeSelectedNodes(nodesToRemove);
	}

	/**
	 * Members of fully selected expanded groups. The group surfaces the
	 * selection as a whole, so these skip their individual selection ring.
	 */
	const fullySelectedGroupMemberIds = computed<Set<string>>(() => {
		const result = new Set<string>();
		if (!toValue(deps.isEnabled)) return result;
		const ids = selectedIds.value;
		for (const id of ids) {
			const group = expandedGroupOfGroupNode(id);
			if (!group?.nodeIds.every((memberId) => ids.has(memberId))) continue;
			for (const memberId of group.nodeIds) result.add(memberId);
		}
		return result;
	});

	/**
	 * Number of distinct elements in the selection, where a fully selected
	 * group counts as one element in place of its members. Drives whether the
	 * selection box is worth showing (a single element surfaces itself).
	 */
	const selectedElementCount = computed(() => {
		const memberIdsFoldedIntoGroups = fullySelectedGroupMemberIds.value;
		let count = 0;
		for (const node of getSelectedNodes.value) {
			if (!memberIdsFoldedIntoGroups.has(node.id)) count++;
		}
		return count;
	});

	watch([selectedIds, userSelectionActive, mountedGroupNodeIdsKey], () => {
		if (!toValue(deps.isEnabled)) {
			lastSelectedIds = selectedIds.value;
			return;
		}
		// Rubber-band selection updates continuously while the box is drawn;
		// reconcile once it settles so additions don't fight the box contents.
		if (userSelectionActive.value) return;

		const currentIds = selectedIds.value;
		const target = reconcile(currentIds);
		const isInSync =
			target.size === currentIds.size && [...target].every((id) => currentIds.has(id));
		if (!isInSync) applySelection(target, currentIds);

		// Snapshot the applied state (not the computed target) so ids that
		// resolved to no node don't get re-processed as removals.
		lastSelectedIds = new Set(getSelectedNodes.value.map((node) => node.id));

		// A selection that folds into a single element (one node, or one whole
		// group) surfaces itself — drop VueFlow's selection box.
		if (nodesSelectionActive.value && selectedElementCount.value <= 1) {
			nodesSelectionActive.value = false;
		}
	});

	/**
	 * Bounding box of the selection in flow coordinates, sized to full visual
	 * footprints: expanded groups contribute their whole frame, not just the
	 * VueFlow node (the title bar). For group-less selections this equals the
	 * native VueFlow selection box. Undefined when nothing is selected.
	 */
	const selectionBoxBounds = computed<BoundingBox | undefined>(() => {
		const selectedNodes = getSelectedNodes.value;
		if (selectedNodes.length === 0) return undefined;

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const node of selectedNodes) {
			const { x, y } = node.computedPosition;
			let { width, height } = node.dimensions;
			if (isCanvasGroupNode(node)) {
				const data = node.data as CanvasGroupNodeData;
				if (!data.isCollapsed) {
					const { expanded } = computeGroupFrameRects(data.nodesRect);
					width = Math.max(width, expanded.width);
					height = Math.max(height, expanded.height);
				}
			}
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x + width > maxX) maxX = x + width;
			if (y + height > maxY) maxY = y + height;
		}

		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	});

	return {
		fullySelectedGroupMemberIds,
		selectedElementCount,
		selectionBoxBounds,
	};
}
