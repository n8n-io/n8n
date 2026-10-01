import dagre from '@dagrejs/dagre';

import {
	GRID_SIZE,
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	STICKY_NODE_TYPE,
} from './constants';
import { isAnchoredStickyNote, type GraphNode } from '../types/base';
import type { ResolvedNodeGroup } from './plugins/types';

const GROUP_GRAPH_ID_PREFIX = '__nodeGroup__:';

/** Vertical drop from a group's title bar to its members. */
const GROUP_HEADER_TO_MEMBERS_Y = GROUP_PADDING_Y_TOP + GROUP_HEADER_HEIGHT;

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CollapsedGroup {
	/** Id this group occupies in the parent graph while its members are folded away. */
	graphId: string;
	/** Internal left-to-right layout of the members, so expanding the group looks tidy. */
	graph: dagre.graphlib.Graph;
	/** The regular member keys removed from the parent graph. */
	regularMemberKeys: string[];
	/** Sticky member keys kept on their normal placement path. */
	stickyMemberKeys: string[];
}

interface CollapsedNodeGroupsDependencies {
	createSubGraph: (nodeIds: string[], parent: dagre.graphlib.Graph) => dagre.graphlib.Graph;
	/** Layout the complete member set before the parent graph replaces it with a chip. */
	layoutSubGraph?: (nodeIds: string[], parent: dagre.graphlib.Graph) => dagre.graphlib.Graph;
	/** Reject groups that another layout owner cannot represent safely. */
	canCollapseMembers?: (nodeIds: readonly string[], parent: dagre.graphlib.Graph) => boolean;
}

interface PlaceGroupMembersDependencies {
	boundingBoxFromGraph: (graph: dagre.graphlib.Graph) => BoundingBox;
	compositeBoundingBox: (boxes: BoundingBox[]) => BoundingBox;
	keyByNodeId: ReadonlyMap<string, string>;
	nodes: ReadonlyMap<string, GraphNode>;
	snapToGrid: (value: number) => number;
	wrappingBoxFor: (anchorBoxes: BoundingBox[]) => BoundingBox | undefined;
}

interface ResolvedGroup {
	index: number;
	memberKeys: string[];
	regularMemberKeys: string[];
	stickyMemberKeys: string[];
}

/**
 * The canvas derives a group's title bar from its members' bounding rect and snaps
 * it to the grid (titleBarFromNodesRect), so placing the bar takes working backwards
 * from the members. Neither GROUP_PADDING_X nor GROUP_HEADER_TO_MEMBERS_Y is a
 * multiple of GRID_SIZE, so pick whichever grid-aligned member origin round-trips
 * closest to where the layout put the group.
 */
export function memberOriginFor(
	headerCoordinate: number,
	padding: number,
	snapToGrid: (value: number) => number,
): number {
	const base = snapToGrid(headerCoordinate + padding);
	let best = base;
	let bestError = Infinity;

	for (const candidate of [base - GRID_SIZE, base, base + GRID_SIZE]) {
		const error = Math.abs(snapToGrid(candidate - padding) - headerCoordinate);
		if (error < bestError) {
			bestError = error;
			best = candidate;
		}
	}

	return best;
}

function isStickyNode(graphNode: GraphNode | undefined): boolean {
	return graphNode?.instance.type === STICKY_NODE_TYPE;
}

function resolveGroup(
	group: ResolvedNodeGroup,
	index: number,
	keyByNodeId: ReadonlyMap<string, string>,
	nodes: ReadonlyMap<string, GraphNode>,
): ResolvedGroup | undefined {
	const memberKeys: string[] = [];
	for (const memberId of group.memberIds) {
		const memberKey = keyByNodeId.get(memberId);
		// Keep the resolved members that serialization will emit. A group with no
		// surviving members is discarded below.
		if (memberKey === undefined || !nodes.has(memberKey)) continue;
		if (!memberKeys.includes(memberKey)) memberKeys.push(memberKey);
	}

	if (memberKeys.length === 0) return undefined;

	return {
		index,
		memberKeys,
		regularMemberKeys: memberKeys.filter((key) => !isStickyNode(nodes.get(key))),
		stickyMemberKeys: memberKeys.filter((key) => isStickyNode(nodes.get(key))),
	};
}

function hasExplicitPosition(graphNode: GraphNode | undefined): boolean {
	return graphNode?.instance.config?.position !== undefined;
}

function hasExplicitStickySize(graphNode: GraphNode): boolean {
	const parameters = graphNode.instance.config?.parameters;
	return typeof parameters?.width === 'number' || typeof parameters?.height === 'number';
}

function hasDeterministicStickyGeometry(
	stickyKey: string,
	group: ResolvedGroup,
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
): boolean {
	const graphNode = nodes.get(stickyKey);
	if (!graphNode || hasExplicitPosition(graphNode) || hasExplicitStickySize(graphNode)) {
		return false;
	}
	if (
		!isAnchoredStickyNote(graphNode.instance) ||
		graphNode.instance.stickyAnchorIds.length === 0
	) {
		return false;
	}

	const regularMemberKeys = new Set(group.regularMemberKeys);
	return graphNode.instance.stickyAnchorIds.every((anchorId) => {
		const anchorKey = keyByNodeId.get(anchorId);
		return anchorKey !== undefined && regularMemberKeys.has(anchorKey);
	});
}

function findConflictingGroupIndexes(groups: readonly ResolvedGroup[]): ReadonlySet<number> {
	const indexesByMemberKey = new Map<string, number[]>();

	for (const group of groups) {
		for (const memberKey of group.memberKeys) {
			const indexes = indexesByMemberKey.get(memberKey) ?? [];
			indexes.push(group.index);
			indexesByMemberKey.set(memberKey, indexes);
		}
	}

	const conflictingIndexes = new Set<number>();
	for (const indexes of indexesByMemberKey.values()) {
		if (indexes.length < 2) continue;
		for (const index of indexes) conflictingIndexes.add(index);
	}

	return conflictingIndexes;
}

function isEligibleGroup(
	group: ResolvedGroup,
	conflictingIndexes: ReadonlySet<number>,
	parentGraph: dagre.graphlib.Graph,
	ungroupableKeys: ReadonlySet<string>,
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
): boolean {
	if (conflictingIndexes.has(group.index)) return false;
	if (group.regularMemberKeys.length === 0) return false;

	if (
		!group.regularMemberKeys.every(
			(memberKey) => parentGraph.hasNode(memberKey) && !ungroupableKeys.has(memberKey),
		)
	) {
		return false;
	}

	return group.stickyMemberKeys.every((stickyKey) =>
		hasDeterministicStickyGeometry(stickyKey, group, nodes, keyByNodeId),
	);
}

function createSyntheticGroupId(index: number, takenKeys: Set<string>): string {
	let graphId = `${GROUP_GRAPH_ID_PREFIX}${index}`;
	while (takenKeys.has(graphId)) graphId += ':';
	return graphId;
}

function graphBoxesAtOrigin(
	group: CollapsedGroup,
	memberOrigin: { x: number; y: number },
	boundingBoxFromGraph: (graph: dagre.graphlib.Graph) => BoundingBox,
): Map<string, BoundingBox> {
	const memberBox = boundingBoxFromGraph(group.graph);

	return new Map(
		group.graph.nodes().map((nodeId) => {
			const node = group.graph.node(nodeId);
			return [
				nodeId,
				{
					x: node.x - node.width / 2 + memberOrigin.x - memberBox.x,
					y: node.y - node.height / 2 + memberOrigin.y - memberBox.y,
					width: node.width,
					height: node.height,
				},
			] as const;
		}),
	);
}

function derivedStickyBoxesAtOrigin(
	group: CollapsedGroup,
	memberBoxes: ReadonlyMap<string, BoundingBox>,
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
	wrappingBoxFor: (anchorBoxes: BoundingBox[]) => BoundingBox | undefined,
): BoundingBox[] {
	return group.stickyMemberKeys.flatMap((stickyKey) => {
		const sticky = nodes.get(stickyKey);
		if (!sticky || !isAnchoredStickyNote(sticky.instance)) return [];

		const anchorBoxes = sticky.instance.stickyAnchorIds
			.map((anchorId) => keyByNodeId.get(anchorId))
			.filter((anchorKey): anchorKey is string => anchorKey !== undefined)
			.map((anchorKey) => memberBoxes.get(anchorKey))
			.filter((box): box is BoundingBox => box !== undefined);
		const wrappingBox = wrappingBoxFor(anchorBoxes);
		return wrappingBox ? [wrappingBox] : [];
	});
}

/**
 * Fold each group's members into a single parent-graph node the size of the
 * collapsed chip, so the layout reserves the space the canvas actually draws.
 * Mutates `parentGraph`; returns one entry per folded group.
 *
 * Groups that overlap the AI cluster machinery, hold a protected sticky, or share
 * a member with another group are left alone, since those members are already
 * laid out by a mechanism of their own. Deterministic anchored auto-sized
 * stickies are represented while the group is expanded.
 */
export function collapseNodeGroups(
	parentGraph: dagre.graphlib.Graph,
	nodeGroups: readonly ResolvedNodeGroup[],
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
	excludedKeys: ReadonlySet<string>,
	{ canCollapseMembers, createSubGraph, layoutSubGraph }: CollapsedNodeGroupsDependencies,
): CollapsedGroup[] {
	const collapsed: CollapsedGroup[] = [];
	const resolvedGroups = nodeGroups
		.map((group, index) => resolveGroup(group, index, keyByNodeId, nodes))
		.filter((group): group is ResolvedGroup => group !== undefined);
	const conflictingIndexes = findConflictingGroupIndexes(resolvedGroups);
	// Node keys come from node names, so a node could already be called
	// `__nodeGroup__:0`. Snapshot them before any folding and step around a clash,
	// otherwise the synthetic node would overwrite the real one.
	const takenKeys = new Set(parentGraph.nodes());

	for (const group of resolvedGroups) {
		if (
			!isEligibleGroup(group, conflictingIndexes, parentGraph, excludedKeys, nodes, keyByNodeId) ||
			(canCollapseMembers !== undefined && !canCollapseMembers(group.memberKeys, parentGraph))
		) {
			continue;
		}

		const memberKeySet = new Set(group.regularMemberKeys);

		// Capture the edges crossing the group boundary before the members go away.
		const crossingEdges = parentGraph
			.edges()
			.filter((edge) => memberKeySet.has(edge.v) !== memberKeySet.has(edge.w));

		const graph = layoutSubGraph
			? layoutSubGraph(group.regularMemberKeys, parentGraph)
			: createSubGraph(group.regularMemberKeys, parentGraph);
		if (!layoutSubGraph) dagre.layout(graph, { disableOptimalOrderHeuristic: true });

		group.regularMemberKeys.forEach((key) => parentGraph.removeNode(key));

		const graphId = createSyntheticGroupId(group.index, takenKeys);
		takenKeys.add(graphId);

		parentGraph.setNode(graphId, {
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: GROUP_HEADER_HEIGHT,
		});

		for (const edge of crossingEdges) {
			const source = memberKeySet.has(edge.v) ? graphId : edge.v;
			const target = memberKeySet.has(edge.w) ? graphId : edge.w;
			// A group reached from its own members means a non-member sits between
			// two members; there is no rank to give that, so leave it unwired.
			if (source !== target) parentGraph.setEdge(source, target);
		}

		collapsed.push({
			graphId,
			graph,
			regularMemberKeys: group.regularMemberKeys,
			stickyMemberKeys: group.stickyMemberKeys,
		});
	}

	return collapsed;
}

/**
 * Unfold a group: place its members below and right of where the layout put the
 * chip, at the offsets the canvas expects the frame to sit at.
 */
export function placeGroupMembers(
	group: CollapsedGroup,
	headerBox: BoundingBox,
	boundingBoxByNodeId: Record<string, BoundingBox>,
	{
		boundingBoxFromGraph,
		compositeBoundingBox,
		keyByNodeId,
		nodes,
		snapToGrid,
		wrappingBoxFor,
	}: PlaceGroupMembersDependencies,
): void {
	const memberOrigin = {
		x: memberOriginFor(headerBox.x, GROUP_PADDING_X, snapToGrid),
		y: memberOriginFor(headerBox.y, GROUP_HEADER_TO_MEMBERS_Y, snapToGrid),
	};

	if (group.stickyMemberKeys.length === 0) {
		const memberBox = boundingBoxFromGraph(group.graph);
		const offsetX = memberOrigin.x - memberBox.x;
		const offsetY = memberOrigin.y - memberBox.y;

		for (const key of group.graph.nodes()) {
			const member = group.graph.node(key);
			boundingBoxByNodeId[key] = {
				x: member.x - member.width / 2 + offsetX,
				y: member.y - member.height / 2 + offsetY,
				width: member.width,
				height: member.height,
			};
		}
		return;
	}

	const memberBoxes = graphBoxesAtOrigin(group, memberOrigin, boundingBoxFromGraph);
	const stickyBoxes = derivedStickyBoxesAtOrigin(
		group,
		memberBoxes,
		nodes,
		keyByNodeId,
		wrappingBoxFor,
	);
	const inclusiveBox = compositeBoundingBox([...memberBoxes.values(), ...stickyBoxes]);
	const offset = {
		x: memberOrigin.x - inclusiveBox.x,
		y: memberOrigin.y - inclusiveBox.y,
	};

	for (const [memberKey, box] of memberBoxes) {
		boundingBoxByNodeId[memberKey] = {
			...box,
			x: box.x + offset.x,
			y: box.y + offset.y,
		};
	}
}
