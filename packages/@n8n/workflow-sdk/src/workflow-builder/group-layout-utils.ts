import dagre from '@dagrejs/dagre';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from 'n8n-workflow';

import { STICKY_NODE_TYPE } from './constants';
import { isAnchoredStickyNote, type GraphNode } from '../types/base';

export interface LayoutNodeGroup {
	name: string;
	memberKeys: string[];
}

interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface GroupLayoutGeometry {
	compositeBoundingBox: (boxes: BoundingBox[]) => BoundingBox;
	snapToGrid: (value: number) => number;
}

interface GroupStickyGeometry {
	declaresOwnWidth: (graphNode: GraphNode) => boolean;
	declaresOwnHeight: (graphNode: GraphNode) => boolean;
	wrappingBoxFor: (anchorBoxes: BoundingBox[]) => BoundingBox | undefined;
}

export interface EligibleLayoutGroup {
	chipId: string;
	name: string;
	memberKeys: Set<string>;
	nonStickyMemberKeys: string[];
	stickyMemberKeys: string[];
	interiorBoxesByNodeId: Map<string, BoundingBox>;
}

// ---------------------------------------------------------------------------
// Group chip substitution
// ---------------------------------------------------------------------------
//
// New groups open collapsed in the editor. Server-side layout has no rendered
// group chip yet, so it substitutes a temporary chip-sized node before dagre
// layout, then writes the hidden member positions back under that chip.
//
// Frontend counterpart: useCanvasLayout keeps collapsed CanvasGroupNodes in
// the dagre graph and moves their hidden members by the chip delta afterwards.

/**
 * Converts a collapsed group chip position into the member origin that yields that chip.
 */
function memberRectOriginForChip(chipTopLeft: { x: number; y: number }): { x: number; y: number } {
	return {
		x: chipTopLeft.x + GROUP_PADDING_X,
		y: chipTopLeft.y + GROUP_HEADER_HEIGHT + GROUP_PADDING_Y_TOP,
	};
}

/**
 * Collects each AI parent plus its connected AI config nodes in the parent graph.
 * Frontend counterpart: useCanvasLayout's getAllConnectedAiConfigNodes.
 */
function getAiSubtreeNodeIds(
	parentGraph: dagre.graphlib.Graph,
	aiParentNames: Set<string>,
	getAiConfigNodeIds: (aiParentName: string) => string[],
): Array<Set<string>> {
	return [...aiParentNames]
		.filter((aiParentName) => parentGraph.hasNode(aiParentName))
		.map((aiParentName) => new Set([aiParentName, ...getAiConfigNodeIds(aiParentName)]));
}

/**
 * Checks whether a candidate group would replace only part of an AI subtree.
 */
function splitsAiSubtree(memberKeys: Set<string>, aiSubtreeNodeIds: Array<Set<string>>): boolean {
	for (const subtree of aiSubtreeNodeIds) {
		let membersInside = 0;
		for (const nodeId of subtree) {
			if (memberKeys.has(nodeId)) membersInside++;
		}

		if (membersInside > 0 && membersInside < subtree.size) return true;
	}

	return false;
}

/**
 * Counts resolved non-sticky group memberships so overlapping groups degrade together.
 */
function countNonStickyGroupMemberships(
	groups: readonly LayoutNodeGroup[] | undefined,
	nodes: ReadonlyMap<string, GraphNode>,
	nonStickySet: Set<string>,
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const group of groups ?? []) {
		const groupNonStickyMembers = new Set(
			group.memberKeys.filter((memberKey) => nodes.has(memberKey) && nonStickySet.has(memberKey)),
		);

		for (const memberKey of groupNonStickyMembers) {
			counts.set(memberKey, (counts.get(memberKey) ?? 0) + 1);
		}
	}
	return counts;
}

/**
 * Re-bases an isolated group member layout so its top-left corner starts at group-local origin.
 */
function normalizeGroupInteriorBoxes(
	boxesByNodeId: Map<string, BoundingBox>,
	compositeBoundingBox: (boxes: BoundingBox[]) => BoundingBox,
): Map<string, BoundingBox> {
	if (boxesByNodeId.size === 0) return boxesByNodeId;

	const boundingBox = compositeBoundingBox([...boxesByNodeId.values()]);
	return new Map(
		[...boxesByNodeId].map(([nodeId, box]) => [
			nodeId,
			{ ...box, x: box.x - boundingBox.x, y: box.y - boundingBox.y },
		]),
	);
}

/**
 * Lays out a group's non-sticky members in isolation and normalizes them to group-local space.
 */
function layoutGroupInterior(
	memberKeys: string[],
	getGroupInteriorBoxes: (memberKeys: string[]) => Map<string, BoundingBox>,
	compositeBoundingBox: (boxes: BoundingBox[]) => BoundingBox,
): Map<string, BoundingBox> {
	return normalizeGroupInteriorBoxes(getGroupInteriorBoxes(memberKeys), compositeBoundingBox);
}

/**
 * Creates a temporary dagre node id for a synthetic collapsed group chip.
 * Frontend counterpart: createCanvasGroupNodeId, but it uses real persisted group ids.
 */
function createGroupChipId(index: number, parentGraph: dagre.graphlib.Graph): string {
	// Synthetic ids must not collide with authored node names in the layout graph.
	let chipId = `__n8n_group_chip_${index}__`;
	while (parentGraph.hasNode(chipId)) {
		chipId = `_${chipId}`;
	}
	return chipId;
}

/**
 * Selects groups that can safely enter dagre as collapsed chips and precomputes their interiors.
 * Frontend counterpart: getTargetData already receives collapsed group chip nodes from view state.
 */
export function resolveEligibleLayoutGroups({
	groups,
	nodes,
	nonStickySet,
	parentGraph,
	aiParentNames,
	getAiConfigNodeIds,
	getGroupInteriorBoxes,
	compositeBoundingBox,
}: {
	groups: readonly LayoutNodeGroup[] | undefined;
	nodes: ReadonlyMap<string, GraphNode>;
	nonStickySet: Set<string>;
	parentGraph: dagre.graphlib.Graph;
	aiParentNames: Set<string>;
	getAiConfigNodeIds: (aiParentName: string) => string[];
	getGroupInteriorBoxes: (memberKeys: string[]) => Map<string, BoundingBox>;
	compositeBoundingBox: (boxes: BoundingBox[]) => BoundingBox;
}): EligibleLayoutGroup[] {
	const membershipCounts = countNonStickyGroupMemberships(groups, nodes, nonStickySet);
	const aiSubtreeNodeIds = getAiSubtreeNodeIds(parentGraph, aiParentNames, getAiConfigNodeIds);
	const eligibleGroups: EligibleLayoutGroup[] = [];

	for (const [index, group] of (groups ?? []).entries()) {
		const memberKeys = new Set(group.memberKeys.filter((memberKey) => nodes.has(memberKey)));
		const nonStickyMemberKeys = [...memberKeys].filter((memberKey) => nonStickySet.has(memberKey));
		if (nonStickyMemberKeys.length === 0) continue;

		const hasOverlappingMember = nonStickyMemberKeys.some(
			(memberKey) => (membershipCounts.get(memberKey) ?? 0) > 1,
		);
		// Invalid overlapping groups fall back together. Picking one would move the shared node.
		if (hasOverlappingMember) continue;

		const hasExplicitlyPositionedMember = nonStickyMemberKeys.some(
			(memberKey) => nodes.get(memberKey)?.instance.config?.position !== undefined,
		);
		if (hasExplicitlyPositionedMember) continue;

		if (splitsAiSubtree(new Set(nonStickyMemberKeys), aiSubtreeNodeIds)) continue;

		const interiorBoxesByNodeId = layoutGroupInterior(
			nonStickyMemberKeys,
			getGroupInteriorBoxes,
			compositeBoundingBox,
		);
		if (interiorBoxesByNodeId.size === 0) continue;

		eligibleGroups.push({
			chipId: createGroupChipId(index, parentGraph),
			name: group.name,
			memberKeys,
			nonStickyMemberKeys,
			stickyMemberKeys: [...memberKeys].filter(
				(memberKey) => nodes.get(memberKey)?.instance.type === STICKY_NODE_TYPE,
			),
			interiorBoxesByNodeId,
		});
	}

	return eligibleGroups;
}

/**
 * Builds the dagre parent graph with eligible group members replaced by chip placeholders.
 * Frontend counterparts: getTargetData and remapCollapsedGroupConnections.
 */
export function createGroupedParentGraph(
	parentGraph: dagre.graphlib.Graph,
	eligibleGroups: EligibleLayoutGroup[],
): dagre.graphlib.Graph {
	if (eligibleGroups.length === 0) return parentGraph;

	const graph = new dagre.graphlib.Graph();
	graph.setGraph(parentGraph.graph());
	graph.setDefaultEdgeLabel(() => ({}));

	const chipIdByMember = new Map<string, string>();
	for (const group of eligibleGroups) {
		for (const memberKey of group.nonStickyMemberKeys) {
			chipIdByMember.set(memberKey, group.chipId);
		}
	}

	for (const nodeId of parentGraph.nodes()) {
		if (chipIdByMember.has(nodeId)) continue;
		graph.setNode(nodeId, parentGraph.node(nodeId));
	}

	for (const group of eligibleGroups) {
		graph.setNode(group.chipId, {
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: GROUP_HEADER_HEIGHT,
		});
	}

	const emittedEdges = new Set<string>();
	for (const edge of parentGraph.edges()) {
		const source = chipIdByMember.get(edge.v) ?? edge.v;
		const target = chipIdByMember.get(edge.w) ?? edge.w;
		if (source === target || !graph.hasNode(source) || !graph.hasNode(target)) continue;

		const edgeKey = `${source}\0${target}`;
		if (emittedEdges.has(edgeKey)) continue;
		emittedEdges.add(edgeKey);
		graph.setEdge(source, target, parentGraph.edge(edge));
	}

	return graph;
}

/**
 * Moves group member boxes from local group coordinates into final workflow coordinates.
 * Frontend counterpart: useCanvasLayout translates hidden members by the chip delta.
 */
function offsetGroupMemberBoxes(
	boxesByNodeId: ReadonlyMap<string, BoundingBox>,
	offset: { x: number; y: number },
): Map<string, BoundingBox> {
	return new Map(
		[...boxesByNodeId].map(([nodeId, box]) => [
			nodeId,
			{ ...box, x: box.x + offset.x, y: box.y + offset.y },
		]),
	);
}

/**
 * Snaps box origins after chip-to-member translation so the derived group chip stays grid-aligned.
 */
function snapGroupMemberBoxes(
	boxesByNodeId: ReadonlyMap<string, BoundingBox>,
	snapToGrid: (value: number) => number,
): Map<string, BoundingBox> {
	return new Map(
		[...boxesByNodeId].map(([nodeId, box]) => [
			nodeId,
			{ ...box, x: snapToGrid(box.x), y: snapToGrid(box.y) },
		]),
	);
}

/**
 * Predicts member-sticky boxes that depend only on grouped anchors.
 * Frontend counterpart: useCanvasMapping.groups measures real sticky nodes for computeGroupFrameRects.
 */
function deterministicMemberStickyBoxes(
	group: EligibleLayoutGroup,
	nodes: ReadonlyMap<string, GraphNode>,
	nameById: ReadonlyMap<string, string>,
	memberBoxesByNodeId: ReadonlyMap<string, BoundingBox>,
	{ declaresOwnHeight, declaresOwnWidth, wrappingBoxFor }: GroupStickyGeometry,
): BoundingBox[] | undefined {
	const stickyBoxes: BoundingBox[] = [];

	for (const stickyName of group.stickyMemberKeys) {
		const graphNode = nodes.get(stickyName);
		if (!graphNode) continue;

		if (
			graphNode.instance.config?.position !== undefined ||
			declaresOwnWidth(graphNode) ||
			declaresOwnHeight(graphNode) ||
			!isAnchoredStickyNote(graphNode.instance)
		) {
			return undefined;
		}

		const anchorBoxes: BoundingBox[] = [];
		for (const anchorId of graphNode.instance.stickyAnchorIds) {
			const anchorName = nameById.get(anchorId);
			if (!anchorName || !group.memberKeys.has(anchorName)) return undefined;

			const anchorBox = memberBoxesByNodeId.get(anchorName);
			if (!anchorBox) return undefined;

			anchorBoxes.push(anchorBox);
		}

		const stickyBox = wrappingBoxFor(anchorBoxes);
		if (!stickyBox) return undefined;

		stickyBoxes.push(stickyBox);
	}

	return stickyBoxes;
}

/**
 * Replaces synthetic chip boxes with member boxes positioned under each collapsed chip.
 * Frontend counterpart: useCanvasLayout moves hidden group members, then removes the chip box.
 */
export function reExpandLayoutGroups({
	eligibleGroups,
	boundingBoxByNodeId,
	nodes,
	nameById,
	geometry,
	stickyGeometry,
}: {
	eligibleGroups: EligibleLayoutGroup[];
	boundingBoxByNodeId: Map<string, BoundingBox>;
	nodes: ReadonlyMap<string, GraphNode>;
	nameById: ReadonlyMap<string, string>;
	geometry: GroupLayoutGeometry;
	stickyGeometry: GroupStickyGeometry;
}): void {
	const { compositeBoundingBox, snapToGrid } = geometry;

	for (const group of eligibleGroups) {
		const chipBox = boundingBoxByNodeId.get(group.chipId);
		if (!chipBox) continue;

		const memberOrigin = memberRectOriginForChip(chipBox);
		let offset = memberOrigin;

		const memberBoxesAtOrigin = offsetGroupMemberBoxes(group.interiorBoxesByNodeId, memberOrigin);
		const snappedMemberBoxesAtOrigin = snapGroupMemberBoxes(memberBoxesAtOrigin, snapToGrid);
		const stickyBoxes = deterministicMemberStickyBoxes(
			group,
			nodes,
			nameById,
			snappedMemberBoxesAtOrigin,
			stickyGeometry,
		);

		if (stickyBoxes && stickyBoxes.length > 0) {
			const inclusiveBox = compositeBoundingBox([
				...snappedMemberBoxesAtOrigin.values(),
				...stickyBoxes,
			]);
			// Align the snapped, sticky-inclusive bbox with the member origin the chip expects.
			offset = {
				x: memberOrigin.x + snapToGrid(memberOrigin.x) - inclusiveBox.x,
				y: memberOrigin.y + snapToGrid(memberOrigin.y) - inclusiveBox.y,
			};
		}

		for (const [memberKey, box] of group.interiorBoxesByNodeId) {
			boundingBoxByNodeId.set(memberKey, {
				...box,
				x: box.x + offset.x,
				y: box.y + offset.y,
			});
		}

		boundingBoxByNodeId.delete(group.chipId);
	}
}
