import dagre from '@dagrejs/dagre';

import {
	GRID_SIZE,
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from './constants';
import type { GraphNode } from '../types/base';
import type { ResolvedNodeGroup } from './plugins/types';

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

interface FoldNodeGroupsDependencies {
	createSubGraph: (nodeIds: string[], parent: dagre.graphlib.Graph) => dagre.graphlib.Graph;
}

interface PlaceGroupMembersDependencies {
	boundingBoxFromGraph: (graph: dagre.graphlib.Graph) => BoundingBox;
	snapToGrid: (value: number) => number;
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
	return graphNode?.instance.type === 'n8n-nodes-base.stickyNote';
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
		// A partial chip would make the visible group frame disagree with its
		// persisted membership, so an unresolved member invalidates the group.
		if (memberKey === undefined || !nodes.has(memberKey)) return undefined;
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
): boolean {
	if (conflictingIndexes.has(group.index)) return false;
	// Sticky members remain on the existing sticky-placement path until the
	// derived anchored-sticky policy is enabled in a separate change.
	if (group.regularMemberKeys.length === 0 || group.stickyMemberKeys.length > 0) return false;

	return group.regularMemberKeys.every(
		(memberKey) => parentGraph.hasNode(memberKey) && !ungroupableKeys.has(memberKey),
	);
}

function createSyntheticGroupId(index: number, takenKeys: Set<string>): string {
	let graphId = `${GROUP_GRAPH_ID_PREFIX}${index}`;
	while (takenKeys.has(graphId)) graphId += ':';
	return graphId;
}

/**
 * Fold each group's members into a single parent-graph node the size of the
 * collapsed chip, so the layout reserves the space the canvas actually draws.
 * Mutates `parentGraph`; returns one entry per folded group.
 *
 * Groups that overlap the AI cluster machinery, hold a sticky, or share a member
 * with an earlier group are left alone, since those members are already laid out
 * by a mechanism of their own.
 */
export function collapseNodeGroups(
	parentGraph: dagre.graphlib.Graph,
	nodeGroups: readonly ResolvedNodeGroup[],
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
	excludedKeys: ReadonlySet<string>,
	{ createSubGraph }: FoldNodeGroupsDependencies,
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
		if (!isEligibleGroup(group, conflictingIndexes, parentGraph, excludedKeys)) continue;

		const memberKeySet = new Set(group.regularMemberKeys);

		// Capture the edges crossing the group boundary before the members go away.
		const crossingEdges = parentGraph
			.edges()
			.filter((edge) => memberKeySet.has(edge.v) !== memberKeySet.has(edge.w));

		const graph = createSubGraph(group.regularMemberKeys, parentGraph);
		dagre.layout(graph, { disableOptimalOrderHeuristic: true });

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

const GROUP_GRAPH_ID_PREFIX = '__nodeGroup__:';

/** Vertical drop from a group's title bar to the top of its members. */
const GROUP_HEADER_TO_MEMBERS_Y = GROUP_PADDING_Y_TOP + GROUP_HEADER_HEIGHT;

/**
 * Unfold a group: place its members below and right of where the layout put the
 * chip, at the offsets the canvas expects the frame to sit at.
 */
export function placeGroupMembers(
	group: CollapsedGroup,
	headerBox: BoundingBox,
	boundingBoxByNodeId: Record<string, BoundingBox>,
	{ boundingBoxFromGraph, snapToGrid }: PlaceGroupMembersDependencies,
): void {
	const memberBox = boundingBoxFromGraph(group.graph);
	const offsetX = memberOriginFor(headerBox.x, GROUP_PADDING_X, snapToGrid) - memberBox.x;
	const offsetY = memberOriginFor(headerBox.y, GROUP_HEADER_TO_MEMBERS_Y, snapToGrid) - memberBox.y;

	for (const key of group.graph.nodes()) {
		const member = group.graph.node(key);
		boundingBoxByNodeId[key] = {
			x: member.x - member.width / 2 + offsetX,
			y: member.y - member.height / 2 + offsetY,
			width: member.width,
			height: member.height,
		};
	}
}
