import dagre from '@dagrejs/dagre';

import { GRID_SIZE, GROUP_HEADER_HEIGHT, GROUP_HEADER_WIDTH_COLLAPSED } from './constants';
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
}

interface FoldNodeGroupsDependencies {
	createSubGraph: (nodeIds: string[], parent: dagre.graphlib.Graph) => dagre.graphlib.Graph;
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
	keyByNodeId: ReadonlyMap<string, string>,
	excludedKeys: ReadonlySet<string>,
	{ createSubGraph }: FoldNodeGroupsDependencies,
): CollapsedGroup[] {
	const collapsed: CollapsedGroup[] = [];
	const claimed = new Set<string>();
	// Node keys come from node names, so a node could already be called
	// `__nodeGroup__:0`. Snapshot them before any folding and step around a clash,
	// otherwise the synthetic node would overwrite the real one.
	const takenKeys = new Set(parentGraph.nodes());

	nodeGroups.forEach((group, index) => {
		const memberKeys: string[] = [];
		for (const memberId of group.memberIds) {
			const key = keyByNodeId.get(memberId);
			// An unresolvable member is dropped by the serializer too, so the group
			// the canvas receives will not contain it either.
			if (key === undefined) continue;
			// One member the layout must not move means the whole group has to stay
			// where it is, since the canvas derives the chip from every member.
			if (excludedKeys.has(key) || claimed.has(key)) return;
			if (!parentGraph.hasNode(key)) continue;
			if (!memberKeys.includes(key)) memberKeys.push(key);
		}

		if (memberKeys.length === 0) return;

		const memberKeySet = new Set(memberKeys);
		let graphId = `${GROUP_GRAPH_ID_PREFIX}${index}`;
		while (takenKeys.has(graphId)) graphId += ':';
		takenKeys.add(graphId);

		// Capture the edges crossing the group boundary before the members go away.
		const crossingEdges = parentGraph
			.edges()
			.filter((edge) => memberKeySet.has(edge.v) !== memberKeySet.has(edge.w));

		const graph = createSubGraph(memberKeys, parentGraph);
		dagre.layout(graph, { disableOptimalOrderHeuristic: true });

		memberKeys.forEach((key) => parentGraph.removeNode(key));
		memberKeys.forEach((key) => claimed.add(key));

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

		collapsed.push({ graphId, graph });
	});

	return collapsed;
}

const GROUP_GRAPH_ID_PREFIX = '__nodeGroup__:';
