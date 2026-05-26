import { computed, reactive, type ComputedRef } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import {
	computeDisplacements,
	type DisplacementCandidate,
	type Offset,
	type Rect,
} from './computeDisplacements';
import {
	COLLAPSED_GROUP_WIDTH,
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';

export interface UseCanvasGroupCollapseDeps {
	allGroups: ComputedRef<IWorkflowGroup[]>;
	allNodeIds: ComputedRef<string[]>;
	getCanonicalNodeRect: (nodeId: string) => Rect | undefined;
}

const ZERO_OFFSET: Offset = { dx: 0, dy: 0 };

function collapsedBoxRectFor(rect: Rect): Rect {
	return {
		x: rect.x,
		y: rect.y,
		width: COLLAPSED_GROUP_WIDTH,
		height: GROUP_HEADER_HEIGHT,
	};
}

export function useCanvasGroupCollapse(deps: UseCanvasGroupCollapseDeps) {
	const collapsedGroupIds = reactive(new Set<string>());
	const expansionOffsets = reactive(new Map<string, Map<string, Offset>>());

	const groupByMemberId = computed(() => {
		const map = new Map<string, string>();
		for (const group of deps.allGroups.value) {
			for (const nodeId of group.nodeIds) {
				map.set(nodeId, group.id);
			}
		}
		return map;
	});

	function isCollapsed(groupId: string): boolean {
		return collapsedGroupIds.has(groupId);
	}

	function isNodeHidden(nodeId: string): boolean {
		if (collapsedGroupIds.size === 0) return false;
		const owningGroupId = groupByMemberId.value.get(nodeId);
		return owningGroupId !== undefined && collapsedGroupIds.has(owningGroupId);
	}

	function getRenderedOffset(nodeId: string): Offset {
		if (expansionOffsets.size === 0) return ZERO_OFFSET;
		let dx = 0;
		let dy = 0;
		for (const perNode of expansionOffsets.values()) {
			const off = perNode.get(nodeId);
			if (off) {
				dx += off.dx;
				dy += off.dy;
			}
		}
		return dx === 0 && dy === 0 ? ZERO_OFFSET : { dx, dy };
	}

	function getGroupOffset(group: IWorkflowGroup): Offset {
		if (group.nodeIds.length === 0) return ZERO_OFFSET;
		return getRenderedOffset(group.nodeIds[0]);
	}

	function canonicalGroupRect(group: IWorkflowGroup): Rect | undefined {
		if (group.nodeIds.length === 0) return undefined;
		const rects: Rect[] = [];
		for (const memberId of group.nodeIds) {
			const r = deps.getCanonicalNodeRect(memberId);
			if (r) rects.push(r);
		}
		if (rects.length === 0) return undefined;
		const minX = Math.min(...rects.map((r) => r.x));
		const minY = Math.min(...rects.map((r) => r.y));
		const maxX = Math.max(...rects.map((r) => r.x + r.width));
		const maxY = Math.max(...rects.map((r) => r.y + r.height));
		return {
			x: minX - GROUP_PADDING_X,
			y: minY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
			width: maxX - minX + 2 * GROUP_PADDING_X,
			height: maxY - minY + GROUP_HEADER_HEIGHT + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		};
	}

	function expandedGroupRect(group: IWorkflowGroup): Rect | undefined {
		const base = canonicalGroupRect(group);
		if (!base) return undefined;
		const offset = getGroupOffset(group);
		return {
			x: base.x + offset.dx,
			y: base.y + offset.dy,
			width: base.width,
			height: base.height,
		};
	}

	function effectiveGroupRect(groupId: string): Rect | undefined {
		const group = deps.allGroups.value.find((g) => g.id === groupId);
		if (!group) return undefined;
		const expanded = expandedGroupRect(group);
		if (!expanded) return undefined;
		if (collapsedGroupIds.has(groupId)) {
			return collapsedBoxRectFor(expanded);
		}
		return expanded;
	}

	function getCollapsedBoxRect(groupId: string): Rect | undefined {
		if (!collapsedGroupIds.has(groupId)) return undefined;
		return effectiveGroupRect(groupId);
	}

	const collapsedBoxes = computed(() => {
		const out: Array<{ id: string; title: string; rect: Rect; memberIds: string[] }> = [];
		for (const groupId of collapsedGroupIds) {
			const group = deps.allGroups.value.find((g) => g.id === groupId);
			if (!group) continue;
			const rect = getCollapsedBoxRect(groupId);
			if (!rect) continue;
			out.push({ id: groupId, title: group.name, rect, memberIds: [...group.nodeIds] });
		}
		return out;
	});

	function collapse(groupId: string): void {
		if (collapsedGroupIds.has(groupId)) return;
		expansionOffsets.delete(groupId);
		collapsedGroupIds.add(groupId);
	}

	function expand(groupId: string): void {
		if (!collapsedGroupIds.has(groupId)) return;
		const group = deps.allGroups.value.find((g) => g.id === groupId);
		collapsedGroupIds.delete(groupId);
		if (!group) return;

		const sourceRect = expandedGroupRect(group);
		if (!sourceRect) return;

		const memberSet = new Set(group.nodeIds);
		const candidates: DisplacementCandidate[] = [];

		for (const other of deps.allGroups.value) {
			if (other.id === groupId) continue;
			const otherRect = effectiveGroupRect(other.id);
			if (!otherRect) continue;
			candidates.push({
				id: `group:${other.id}`,
				rect: otherRect,
				memberIds: [...other.nodeIds],
			});
		}

		for (const nodeId of deps.allNodeIds.value) {
			if (memberSet.has(nodeId)) continue;
			if (groupByMemberId.value.has(nodeId)) continue;
			const r = deps.getCanonicalNodeRect(nodeId);
			if (!r) continue;
			const off = getRenderedOffset(nodeId);
			candidates.push({
				id: nodeId,
				rect: { x: r.x + off.dx, y: r.y + off.dy, width: r.width, height: r.height },
				memberIds: [nodeId],
			});
		}

		const offsets = computeDisplacements(sourceRect, candidates);
		if (offsets.size > 0) {
			expansionOffsets.set(groupId, offsets);
		}
	}

	function toggle(groupId: string): void {
		if (collapsedGroupIds.has(groupId)) {
			expand(groupId);
		} else {
			collapse(groupId);
		}
	}

	return {
		collapsedGroupIds,
		expansionOffsets,
		collapsedBoxes,
		isCollapsed,
		isNodeHidden,
		getRenderedOffset,
		getCollapsedBoxRect,
		collapse,
		expand,
		toggle,
	};
}

export type UseCanvasGroupCollapseReturn = ReturnType<typeof useCanvasGroupCollapse>;
