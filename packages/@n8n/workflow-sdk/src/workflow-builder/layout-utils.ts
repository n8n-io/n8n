/**
 * Layout Utility Functions
 *
 * Two layout strategies:
 * 1. BFS layout (calculateNodePositions) — simple left-to-right BFS, used by default toJSON()
 * 2. Dagre layout (calculateNodePositionsDagre) — mirrors the FE's useCanvasLayout algorithm,
 *    used by toJSON({ tidyUp: true })
 */

import dagre from '@dagrejs/dagre';

import {
	GRID_SIZE,
	DEFAULT_NODE_SIZE,
	CONFIGURATION_NODE_SIZE,
	CONFIGURATION_NODE_RADIUS,
	CONFIGURABLE_NODE_SIZE,
	NODE_MIN_INPUT_ITEMS_COUNT,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	SUBGRAPH_SPACING,
	AI_X_SPACING,
	AI_Y_SPACING,
	STICKY_BOTTOM_PADDING,
	STICKY_NODE_TYPE,
	NODE_SPACING_X,
	DEFAULT_Y,
	START_X,
	DEFAULT_STICKY_SIZE,
	STICKY_PADDING,
	STICKY_HEADER_HEIGHT,
	MAX_STICKY_SEPARATION_STEPS,
} from './constants';
import { parseWorkflowJSON } from './workflow-import';
import { isAiRootNodeType } from '../mock-data/ai-root-shapes';
import { isAnchoredStickyNote, type GraphNode, type WorkflowJSON } from '../types/base';

// ===========================================================================
// BFS Layout (default)
// ===========================================================================

/**
 * Calculate positions for nodes using BFS left-to-right layout.
 * Only sets positions for nodes without explicit config.position.
 */
export function calculateNodePositions(
	nodes: ReadonlyMap<string, GraphNode>,
): Map<string, [number, number]> {
	const positions = new Map<string, [number, number]>();

	// Find root nodes (nodes with no incoming connections)
	const hasIncoming = new Set<string>();
	for (const graphNode of nodes.values()) {
		for (const typeConns of graphNode.connections.values()) {
			for (const targets of typeConns.values()) {
				for (const target of targets) {
					hasIncoming.add(target.node);
				}
			}
		}
	}

	const rootNodes = [...nodes.keys()].filter((name) => !hasIncoming.has(name));

	// BFS to assign positions
	const visited = new Set<string>();
	const queue: Array<{ name: string; x: number; y: number }> = [];

	// Initialize queue with root nodes
	let y = DEFAULT_Y;
	for (const rootName of rootNodes) {
		queue.push({ name: rootName, x: START_X, y });
		y += 150; // Offset Y for multiple roots
	}

	while (queue.length > 0) {
		const { name, x, y: nodeY } = queue.shift()!;

		if (visited.has(name)) continue;
		visited.add(name);

		// Only set position if node doesn't have explicit position
		const node = nodes.get(name);
		if (node && !node.instance.config?.position) {
			positions.set(name, [x, nodeY]);
		}

		// Queue connected nodes
		if (node) {
			let branchOffset = 0;
			for (const typeConns of node.connections.values()) {
				for (const targets of typeConns.values()) {
					for (const target of targets) {
						if (!visited.has(target.node)) {
							queue.push({
								name: target.node,
								x: x + NODE_SPACING_X,
								y: nodeY + branchOffset * 150,
							});
							branchOffset++;
						}
					}
				}
			}
		}
	}

	return positions;
}

// ===========================================================================
// Dagre Layout (tidyUp)
// ===========================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

// ---------------------------------------------------------------------------
// Helpers: AI node detection
// ---------------------------------------------------------------------------

function isAiConnectionType(type: string): boolean {
	return type.startsWith('ai_');
}

function getAiParentNames(nodes: ReadonlyMap<string, GraphNode>): Set<string> {
	const parents = new Set<string>();
	for (const graphNode of nodes.values()) {
		for (const [connType, outputMap] of graphNode.connections) {
			if (!isAiConnectionType(connType)) continue;
			for (const targets of outputMap.values()) {
				for (const target of targets) {
					parents.add(target.node);
				}
			}
		}
	}
	return parents;
}

function getAiConfigNames(nodes: ReadonlyMap<string, GraphNode>): Set<string> {
	const configs = new Set<string>();
	for (const [name, graphNode] of nodes) {
		for (const connType of graphNode.connections.keys()) {
			if (isAiConnectionType(connType)) {
				configs.add(name);
				break;
			}
		}
	}
	return configs;
}

function getAllConnectedAiConfigNodes(
	graph: dagre.graphlib.Graph,
	rootId: string,
	aiConfigNames: Set<string>,
): string[] {
	const predecessors = (graph.predecessors(rootId) as unknown as string[]) ?? [];
	return predecessors
		.filter((id) => aiConfigNames.has(id))
		.flatMap((id) => [id, ...getAllConnectedAiConfigNodes(graph, id, aiConfigNames)]);
}

// ---------------------------------------------------------------------------
// Helpers: Node dimensions
// ---------------------------------------------------------------------------

function getMainOutputCount(nodeName: string, nodes: ReadonlyMap<string, GraphNode>): number {
	const graphNode = nodes.get(nodeName);
	if (!graphNode) return 1;
	const mainConns = graphNode.connections.get('main');
	if (!mainConns || mainConns.size === 0) return 1;
	return Math.max(...mainConns.keys()) + 1;
}

function getMainInputCount(nodeName: string, nodes: ReadonlyMap<string, GraphNode>): number {
	let maxIndex = 0;
	for (const graphNode of nodes.values()) {
		const mainConns = graphNode.connections.get('main');
		if (!mainConns) continue;
		for (const targets of mainConns.values()) {
			for (const target of targets) {
				if (target.node === nodeName) {
					maxIndex = Math.max(maxIndex, target.index + 1);
				}
			}
		}
	}
	return Math.max(1, maxIndex);
}

function calculateNodeHeight(mainInputCount: number, mainOutputCount: number): number {
	const maxVerticalHandles = Math.max(mainInputCount, mainOutputCount, 1);
	return DEFAULT_NODE_SIZE[1] + Math.max(0, maxVerticalHandles - 2) * GRID_SIZE * 2;
}

/** Whether a sticky carries its own width, rather than relying on the default. */
function declaresOwnWidth(graphNode: GraphNode): boolean {
	return typeof graphNode.instance.config?.parameters?.width === 'number';
}

/** Whether a sticky carries its own height, rather than relying on the default. */
function declaresOwnHeight(graphNode: GraphNode): boolean {
	return typeof graphNode.instance.config?.parameters?.height === 'number';
}

/**
 * A sticky's own width/height parameters, falling back to the StickyNote node defaults.
 * Sticky notes are sized by their parameters, not by the node-canvas defaults.
 */
function declaredStickySize(graphNode: GraphNode): { width: number; height: number } {
	const parameters = graphNode.instance.config?.parameters;
	const width = parameters?.width;
	const height = parameters?.height;
	return {
		width: typeof width === 'number' ? width : DEFAULT_STICKY_SIZE[0],
		height: typeof height === 'number' ? height : DEFAULT_STICKY_SIZE[1],
	};
}

export function getNodeDimensions(
	nodeName: string,
	aiParentNames: Set<string>,
	aiConfigNames: Set<string>,
	nodes: ReadonlyMap<string, GraphNode>,
	nonMainInputCounts?: ReadonlyMap<string, number>,
): { width: number; height: number } {
	const graphNode = nodes.get(nodeName);
	if (graphNode?.instance.type === STICKY_NODE_TYPE) {
		return declaredStickySize(graphNode);
	}

	if (aiConfigNames.has(nodeName)) {
		return { width: CONFIGURATION_NODE_SIZE[0], height: CONFIGURATION_NODE_SIZE[1] };
	}

	// A resolved slot count from the real node type description (the FE's
	// NodeHelpers.getNodeInputs path, which evaluates expression-valued
	// `inputs` against the node's parameters and version) beats every
	// heuristic below — in both directions: >0 renders wide, 0 renders as a
	// standard card even for types the fallback list would call hosts.
	const resolvedNonMain = nonMainInputCounts?.get(nodeName);
	if (resolvedNonMain !== undefined && resolvedNonMain > 0) {
		const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, resolvedNonMain);
		const width = CONFIGURATION_NODE_RADIUS * 2 + GRID_SIZE * (portCount - 1) * 3;
		return { width, height: CONFIGURABLE_NODE_SIZE[1] };
	}

	// Fallback for callers without node type access (sandbox, standalone SDK):
	// AI hosts (agents, chains, vendor LLM nodes) render as wide configurable
	// nodes even with nothing wired into their sub-inputs — the slots are part
	// of the type, not the wiring — so sizing by connections alone would let
	// the next rank sit flush against the host's rendered box.
	const nodeType = nodes.get(nodeName)?.instance.type;
	if (
		resolvedNonMain === undefined &&
		(aiParentNames.has(nodeName) || (typeof nodeType === 'string' && isAiRootNodeType(nodeType)))
	) {
		const aiInputTypes = new Set<string>();
		for (const graphNode of nodes.values()) {
			for (const [connType, outputMap] of graphNode.connections) {
				if (!isAiConnectionType(connType)) continue;
				for (const targets of outputMap.values()) {
					for (const target of targets) {
						if (target.node === nodeName) {
							aiInputTypes.add(connType);
						}
					}
				}
			}
		}
		const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, aiInputTypes.size);
		const width = CONFIGURATION_NODE_RADIUS * 2 + GRID_SIZE * (portCount - 1) * 3;
		return { width, height: CONFIGURABLE_NODE_SIZE[1] };
	}

	const mainInputCount = getMainInputCount(nodeName, nodes);
	const mainOutputCount = getMainOutputCount(nodeName, nodes);
	return {
		width: DEFAULT_NODE_SIZE[0],
		height: calculateNodeHeight(mainInputCount, mainOutputCount),
	};
}

// ---------------------------------------------------------------------------
// Helpers: Grid & bounding box
// ---------------------------------------------------------------------------

function snapToGrid(value: number): number {
	return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function compositeBoundingBox(boxes: BoundingBox[]): BoundingBox {
	const { minX, minY, maxX, maxY } = boxes.reduce(
		(bbox, node) => ({
			minX: Math.min(bbox.minX, node.x),
			maxX: Math.max(bbox.maxX, node.x + node.width),
			minY: Math.min(bbox.minY, node.y),
			maxY: Math.max(bbox.maxY, node.y + node.height),
		}),
		{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
	);
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function boundingBoxFromDagreNode(node: dagre.Node): BoundingBox {
	return {
		x: node.x - node.width / 2,
		y: node.y - node.height / 2,
		width: node.width,
		height: node.height,
	};
}

function boundingBoxFromGraph(graph: dagre.graphlib.Graph): BoundingBox {
	const nodeIds = graph.nodes();
	if (nodeIds.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}
	return compositeBoundingBox(
		nodeIds.map((nodeId) => boundingBoxFromDagreNode(graph.node(nodeId))),
	);
}

function intersects(container: BoundingBox, target: BoundingBox, padding = 0): boolean {
	const t = {
		x: target.x - padding,
		y: target.y - padding,
		width: target.width + padding * 2,
		height: target.height + padding * 2,
	};
	return !(
		t.x + t.width < container.x ||
		t.x > container.x + container.width ||
		t.y + t.height < container.y ||
		t.y > container.y + container.height
	);
}

function isCoveredBy(parent: BoundingBox, child: BoundingBox): boolean {
	return (
		child.x >= parent.x &&
		child.y >= parent.y &&
		child.x + child.width <= parent.x + parent.width &&
		child.y + child.height <= parent.y + parent.height
	);
}

function centerHorizontally(container: BoundingBox, target: BoundingBox): number {
	return container.x + container.width / 2 - target.width / 2;
}

// ---------------------------------------------------------------------------
// Dagre graph builders
// ---------------------------------------------------------------------------

function createSubGraph(nodeIds: string[], parent: dagre.graphlib.Graph): dagre.graphlib.Graph {
	const subGraph = new dagre.graphlib.Graph();
	subGraph.setGraph({
		rankdir: 'LR',
		edgesep: NODE_Y_SPACING,
		nodesep: NODE_Y_SPACING,
		ranksep: NODE_X_SPACING,
	});
	subGraph.setDefaultEdgeLabel(() => ({}));
	const nodeIdSet = new Set(nodeIds);

	parent
		.nodes()
		.filter((id) => nodeIdSet.has(id))
		.forEach((id) => subGraph.setNode(id, parent.node(id)));

	parent
		.edges()
		.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
		.forEach((edge) => subGraph.setEdge(edge.v, edge.w, parent.edge(edge)));

	return subGraph;
}

function createVerticalGraph(items: Array<{ id: string; box: BoundingBox }>): dagre.graphlib.Graph {
	const graph = new dagre.graphlib.Graph();
	graph.setGraph({
		rankdir: 'TB',
		align: 'UL',
		edgesep: SUBGRAPH_SPACING,
		nodesep: SUBGRAPH_SPACING,
		ranksep: SUBGRAPH_SPACING,
	});
	graph.setDefaultEdgeLabel(() => ({}));

	items.forEach(({ id, box: { x, y, width, height } }) =>
		graph.setNode(id, { x, y, width, height }),
	);
	items.forEach(({ id }, index) => {
		if (items[index + 1]) {
			graph.setEdge(id, items[index + 1].id);
		}
	});

	return graph;
}

function createAiSubGraph(parent: dagre.graphlib.Graph, nodeIds: string[]): dagre.graphlib.Graph {
	const graph = new dagre.graphlib.Graph();
	graph.setGraph({
		rankdir: 'TB',
		edgesep: AI_X_SPACING,
		nodesep: AI_X_SPACING,
		ranksep: AI_Y_SPACING,
	});
	graph.setDefaultEdgeLabel(() => ({}));
	const nodeIdSet = new Set(nodeIds);

	parent
		.nodes()
		.filter((id) => nodeIdSet.has(id))
		.forEach((id) => graph.setNode(id, parent.node(id)));

	// Reverse edges: in the parent graph, edges go config -> parent.
	// For TB layout we want parent at top, so reverse to parent -> config.
	parent
		.edges()
		.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
		.forEach((edge) => graph.setEdge(edge.w, edge.v));

	return graph;
}

// ---------------------------------------------------------------------------
// Sticky note repositioning
// ---------------------------------------------------------------------------

function repositionStickyNotes(
	stickyNames: string[],
	nonStickyNames: string[],
	positionsBefore: Map<string, BoundingBox>,
	positionsAfter: Map<string, BoundingBox>,
	result: Map<string, [number, number]>,
): void {
	for (const stickyName of stickyNames) {
		const stickyBoxBefore = positionsBefore.get(stickyName);
		if (!stickyBoxBefore) continue;

		const coveredNames = nonStickyNames.filter((name) => {
			const nodeBox = positionsBefore.get(name);
			return nodeBox && isCoveredBy(stickyBoxBefore, nodeBox);
		});

		if (coveredNames.length === 0) continue;

		const coveredBoxesAfter = coveredNames
			.map((name) => positionsAfter.get(name))
			.filter((box): box is BoundingBox => box !== undefined);

		if (coveredBoxesAfter.length === 0) continue;

		const coveredAfter = compositeBoundingBox(coveredBoxesAfter);
		const newX = centerHorizontally(coveredAfter, stickyBoxBefore);
		const newY =
			coveredAfter.y + coveredAfter.height - stickyBoxBefore.height + STICKY_BOTTOM_PADDING;

		result.set(stickyName, [snapToGrid(newX), snapToGrid(newY)]);
	}
}

// ---------------------------------------------------------------------------
// Sticky note geometry
// ---------------------------------------------------------------------------

export interface StickyGeometry {
	position: [number, number];
	/**
	 * Only set when this resolver sized the sticky (i.e. it wraps anchors). Stickies that
	 * carry their own size keep it — overwriting would break workflow round-trips.
	 */
	size?: { width: number; height: number };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function toPoint(position?: [number, number]): { x: number; y: number } | undefined {
	return position && { x: position[0], y: position[1] };
}

/** The box that wraps a sticky's anchors, with room above for the note's own text. */
function wrappingBoxFor(anchorBoxes: BoundingBox[]): BoundingBox | undefined {
	if (anchorBoxes.length === 0) return undefined;
	const wrapped = compositeBoundingBox(anchorBoxes);
	return {
		x: snapToGrid(wrapped.x - STICKY_PADDING),
		y: snapToGrid(wrapped.y - STICKY_PADDING - STICKY_HEADER_HEIGHT),
		width: snapToGrid(wrapped.width + STICKY_PADDING * 2),
		height: snapToGrid(wrapped.height + STICKY_PADDING * 2 + STICKY_HEADER_HEIGHT),
	};
}

/** Push a box down until it clears every box already placed. */
function separateFrom(placed: BoundingBox[], box: BoundingBox): BoundingBox {
	let separated = box;
	for (let step = 0; step < MAX_STICKY_SEPARATION_STEPS; step++) {
		const collision = placed.find((placedBox) => boxesOverlap(placedBox, separated));
		if (!collision) break;
		separated = {
			...separated,
			y: snapToGrid(collision.y + collision.height + NODE_Y_SPACING),
		};
	}
	return separated;
}

/**
 * Resolve the final position and size of every sticky note.
 *
 * `sticky(content, [nodes])` can only record which nodes it wraps — when it runs,
 * layout has not happened and the anchors have no positions yet. So the box is
 * computed here, from wherever the anchors actually landed. Stickies that were given
 * an explicit position keep it; the rest are nudged apart so they never stack.
 *
 * @param nodes - the workflow graph, keyed by the name each node is serialized under
 * @param positions - positions chosen by the active layout, keyed the same way
 */
export function resolveStickyGeometry(
	nodes: ReadonlyMap<string, GraphNode>,
	positions: ReadonlyMap<string, [number, number]>,
): Map<string, StickyGeometry> {
	const geometryByName = new Map<string, StickyGeometry>();

	const stickyNames = [...nodes.keys()].filter(
		(name) => nodes.get(name)?.instance.type === STICKY_NODE_TYPE,
	);
	if (stickyNames.length === 0) return geometryByName;

	const aiParentNames = getAiParentNames(nodes);
	const aiConfigNames = getAiConfigNames(nodes);

	// Anchors are recorded by node ID, since a node can be renamed on its way in.
	const nameById = new Map<string, string>();
	for (const [name, graphNode] of nodes) {
		nameById.set(graphNode.instance.id, name);
	}

	const boxOfNode = (name: string): BoundingBox | undefined => {
		const graphNode = nodes.get(name);
		if (!graphNode) return undefined;
		const position = graphNode.instance.config?.position ?? positions.get(name);
		if (!position) return undefined;
		const { width, height } = getNodeDimensions(name, aiParentNames, aiConfigNames, nodes);
		return { x: position[0], y: position[1], width, height };
	};

	const resolved = stickyNames.flatMap((name) => {
		const graphNode = nodes.get(name);
		if (!graphNode) return [];

		const { instance } = graphNode;
		const explicitPosition = instance.config?.position;

		const anchorBoxes = isAnchoredStickyNote(instance)
			? instance.stickyAnchorIds
					.map((id) => nameById.get(id))
					.filter((anchorName): anchorName is string => anchorName !== undefined)
					.map(boxOfNode)
					.filter((box): box is BoundingBox => box !== undefined)
			: [];

		const wrappingBox = wrappingBoxFor(anchorBoxes);

		// Whatever the caller declared wins, dimension by dimension; the anchors only
		// fill in what is missing, so a declared width still gets a wrapping height.
		const declared = declaredStickySize(graphNode);
		const ownWidth = declaresOwnWidth(graphNode);
		const ownHeight = declaresOwnHeight(graphNode);
		const size = {
			width: !ownWidth && wrappingBox ? wrappingBox.width : declared.width,
			height: !ownHeight && wrappingBox ? wrappingBox.height : declared.height,
		};
		const sizedByAnchors = wrappingBox !== undefined && !(ownWidth && ownHeight);

		const origin = toPoint(explicitPosition) ??
			(wrappingBox && { x: wrappingBox.x, y: wrappingBox.y }) ??
			toPoint(positions.get(name)) ?? { x: START_X, y: DEFAULT_Y };

		// A sticky is pinned when the author placed it or when it wraps anchors — moving
		// either one would take it away from the thing it is meant to sit on.
		const pinned = explicitPosition !== undefined || wrappingBox !== undefined;

		return [{ name, box: { ...origin, ...size }, sizedByAnchors, pinned }];
	});

	const record = (name: string, box: BoundingBox, sizedByAnchors: boolean): void => {
		geometryByName.set(name, {
			position: [box.x, box.y],
			...(sizedByAnchors && { size: { width: box.width, height: box.height } }),
		});
	};

	const placed = resolved.filter((sticky) => sticky.pinned).map(({ box }) => box);
	for (const { name, box, sizedByAnchors, pinned } of resolved) {
		if (pinned) {
			record(name, box, sizedByAnchors);
			continue;
		}

		// Free-floating notes have nowhere they need to be, so they give way to
		// everything already placed rather than stacking on it.
		const separated = separateFrom(placed, box);
		placed.push(separated);
		record(name, separated, sizedByAnchors);
	}

	return geometryByName;
}

// ---------------------------------------------------------------------------
// Dagre layout function
// ---------------------------------------------------------------------------

/**
 * Calculate positions for nodes using Dagre hierarchical layout.
 * Mirrors the frontend's useCanvasLayout algorithm.
 *
 * Only sets positions for nodes without explicit config.position.
 */
export function calculateNodePositionsDagre(
	nodes: ReadonlyMap<string, GraphNode>,
	nonMainInputCounts?: ReadonlyMap<string, number>,
): Map<string, [number, number]> {
	const positions = new Map<string, [number, number]>();

	if (nodes.size === 0) return positions;

	// Classify nodes
	const aiParentNames = getAiParentNames(nodes);
	const aiConfigNames = getAiConfigNames(nodes);

	// Separate sticky notes
	const stickyNames: string[] = [];
	const nonStickyNames: string[] = [];
	for (const [name, graphNode] of nodes) {
		if (graphNode.instance.type === STICKY_NODE_TYPE) {
			stickyNames.push(name);
		} else {
			nonStickyNames.push(name);
		}
	}

	if (nonStickyNames.length === 0) return positions;

	// Check if any nodes actually need positioning
	const needsLayout = nonStickyNames.some((name) => {
		const node = nodes.get(name);
		return node && !node.instance.config?.position;
	});

	if (!needsLayout) return positions;

	// Build parent dagre graph with all non-sticky nodes
	const parentGraph = new dagre.graphlib.Graph();
	parentGraph.setGraph({});
	parentGraph.setDefaultEdgeLabel(() => ({}));

	for (const name of nonStickyNames) {
		const { width, height } = getNodeDimensions(
			name,
			aiParentNames,
			aiConfigNames,
			nodes,
			nonMainInputCounts,
		);
		const explicitPosition = nodes.get(name)?.instance.config?.position;
		parentGraph.setNode(name, {
			width,
			height,
			...(explicitPosition ? { x: explicitPosition[0], y: explicitPosition[1] } : {}),
		});
	}

	// Add edges from connections
	const nonStickySet = new Set(nonStickyNames);
	for (const name of nonStickyNames) {
		const graphNode = nodes.get(name)!;
		for (const [, outputMap] of graphNode.connections) {
			for (const targets of outputMap.values()) {
				for (const target of targets) {
					if (nonStickySet.has(target.node)) {
						parentGraph.setEdge(name, target.node);
					}
				}
			}
		}
	}

	// Divide into disconnected subgraphs
	const components = dagre.graphlib.alg.components(parentGraph);

	const subgraphs = components.map((nodeIds) => {
		const subgraph = createSubGraph(nodeIds, parentGraph);

		// Find AI parent nodes in this subgraph
		const aiParentsInSubgraph = subgraph.nodes().filter((id) => aiParentNames.has(id));

		// Process each AI parent: create TB sub-layout, replace with bounding box
		const aiGraphs = aiParentsInSubgraph.map((aiParentId) => {
			const configNodeIds = getAllConnectedAiConfigNodes(subgraph, aiParentId, aiConfigNames);
			const allAiNodeIds = configNodeIds.concat(aiParentId);
			const aiGraph = createAiSubGraph(subgraph, allAiNodeIds);

			// Capture edges connecting the AI parent to non-AI nodes BEFORE removing config nodes
			const configNodeIdSet = new Set(configNodeIds);
			const rootEdges = subgraph
				.edges()
				.filter(
					(edge) =>
						(edge.v === aiParentId || edge.w === aiParentId) &&
						!configNodeIdSet.has(edge.v) &&
						!configNodeIdSet.has(edge.w),
				);

			// Remove config nodes from main subgraph (keep parent)
			configNodeIds.forEach((id) => subgraph.removeNode(id));

			dagre.layout(aiGraph, { disableOptimalOrderHeuristic: true });
			const aiBoundingBox = boundingBoxFromGraph(aiGraph);

			// Replace parent node with bounding box of entire AI subtree
			subgraph.setNode(aiParentId, {
				width: aiBoundingBox.width,
				height: aiBoundingBox.height,
			});
			rootEdges.forEach((edge) => subgraph.setEdge(edge));

			return { graph: aiGraph, boundingBox: aiBoundingBox, aiParentId };
		});

		dagre.layout(subgraph, { disableOptimalOrderHeuristic: true });

		return { graph: subgraph, aiGraphs, boundingBox: boundingBoxFromGraph(subgraph) };
	});

	// Arrange subgraphs vertically (skip composite layout for single subgraph)
	let compositeGraph: dagre.graphlib.Graph | undefined;
	if (subgraphs.length > 1) {
		compositeGraph = createVerticalGraph(
			subgraphs.map(({ boundingBox }, index) => ({
				box: boundingBox,
				id: index.toString(),
			})),
		);
		dagre.layout(compositeGraph);
	}

	// Compute final positions
	const boundingBoxByNodeId: Record<string, BoundingBox> = {};

	subgraphs.forEach(({ graph, aiGraphs }, index) => {
		let offset = { x: 0, y: 0 };
		if (compositeGraph) {
			const subgraphPosition = compositeGraph.node(index.toString());
			offset = {
				x: 0,
				y: subgraphPosition.y - subgraphPosition.height / 2,
			};
		}
		const aiParentIds = new Set(aiGraphs.map(({ aiParentId }) => aiParentId));

		for (const nodeId of graph.nodes()) {
			const { x, y, width, height } = graph.node(nodeId);
			const box: BoundingBox = {
				x: x + offset.x - width / 2,
				y: y + offset.y - height / 2,
				width,
				height,
			};

			if (aiParentIds.has(nodeId)) {
				const aiGraphInfo = aiGraphs.find(({ aiParentId }) => aiParentId === nodeId);
				if (!aiGraphInfo) continue;

				const parentOffset = { x: box.x, y: box.y };
				for (const aiNodeId of aiGraphInfo.graph.nodes()) {
					const aiNode = aiGraphInfo.graph.node(aiNodeId);
					boundingBoxByNodeId[aiNodeId] = {
						x: aiNode.x + parentOffset.x - aiNode.width / 2,
						y: aiNode.y + parentOffset.y - aiNode.height / 2,
						width: aiNode.width,
						height: aiNode.height,
					};
				}
			} else {
				boundingBoxByNodeId[nodeId] = box;
			}
		}
	});

	// Post-process: top-align AI subtrees when no conflicts
	subgraphs
		.flatMap(({ aiGraphs }) => aiGraphs)
		.forEach(({ graph }) => {
			const aiNodes = graph.nodes();
			const boxes = aiNodes
				.map((id) => boundingBoxByNodeId[id])
				.filter((b): b is BoundingBox => b !== undefined);
			if (boxes.length === 0) return;

			const aiGraphBoundingBox = compositeBoundingBox(boxes);
			const aiNodeVerticalCorrection = aiGraphBoundingBox.height / 2 - DEFAULT_NODE_SIZE[0] / 2;
			aiGraphBoundingBox.y += aiNodeVerticalCorrection;

			const hasConflictingNodes = Object.entries(boundingBoxByNodeId)
				.filter(([id]) => !graph.hasNode(id))
				.some(([, nodeBoundingBox]) =>
					intersects(aiGraphBoundingBox, nodeBoundingBox, NODE_Y_SPACING),
				);

			if (!hasConflictingNodes) {
				for (const aiNode of aiNodes) {
					if (boundingBoxByNodeId[aiNode]) {
						boundingBoxByNodeId[aiNode].y += aiNodeVerticalCorrection;
					}
				}
			}
		});

	// Snap to grid and build result (skip nodes with explicit positions)
	for (const [name, box] of Object.entries(boundingBoxByNodeId)) {
		const node = nodes.get(name);
		if (node && !node.instance.config?.position) {
			positions.set(name, [snapToGrid(box.x), snapToGrid(box.y)]);
		}
	}

	// Reposition sticky notes
	if (stickyNames.length > 0) {
		const positionsBefore = new Map<string, BoundingBox>();
		for (const [name, graphNode] of nodes) {
			const pos = graphNode.instance.config?.position;
			const { width, height } = getNodeDimensions(
				name,
				aiParentNames,
				aiConfigNames,
				nodes,
				nonMainInputCounts,
			);
			positionsBefore.set(name, {
				x: pos ? pos[0] : 0,
				y: pos ? pos[1] : 0,
				width,
				height,
			});
		}

		const positionsAfter = new Map<string, BoundingBox>();
		for (const [name, graphNode] of nodes) {
			const explicitPosition = graphNode.instance.config?.position;
			if (explicitPosition) {
				const { width, height } = getNodeDimensions(
					name,
					aiParentNames,
					aiConfigNames,
					nodes,
					nonMainInputCounts,
				);
				positionsAfter.set(name, {
					x: explicitPosition[0],
					y: explicitPosition[1],
					width,
					height,
				});
				continue;
			}

			const box = boundingBoxByNodeId[name];
			if (box) {
				positionsAfter.set(name, box);
			}
		}

		repositionStickyNotes(stickyNames, nonStickyNames, positionsBefore, positionsAfter, positions);
	}

	return positions;
}

// ---------------------------------------------------------------------------
// Fresh layout of a workflow JSON
// ---------------------------------------------------------------------------

/** Position and rendered size of one node in a fresh layout, canvas coordinates. */
export interface FreshLayoutBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Lay out a workflow JSON from scratch, ignoring any positions it carries.
 *
 * Node names must be unique, like everywhere else in n8n — connections address
 * nodes by name, so a duplicate-named graph is ambiguous before layout ever
 * runs (the builder dedupes names at compile time; the import path renames).
 *
 * Runs the same Dagre layout as `toJSON({ tidyUp: true })`, but unconditionally:
 * explicit positions are stripped first, so the result is one coherent frame even
 * when the JSON mixes authored and engine-generated positions. Returns a box per
 * non-sticky node, keyed by node name. Sticky notes are excluded — they decorate
 * nodes rather than participate in the graph.
 */
export function calculateFreshLayout(
	json: WorkflowJSON,
	nonMainInputCounts?: ReadonlyMap<string, number>,
): Map<string, FreshLayoutBox> {
	const parsed = parseWorkflowJSON(json);

	const stripped = new Map<string, GraphNode>();
	for (const [key, graphNode] of parsed.nodes) {
		const { position: _position, ...config } = graphNode.instance.config;
		stripped.set(key, {
			instance: { ...graphNode.instance, config },
			connections: graphNode.connections,
		});
	}

	const positions = calculateNodePositionsDagre(stripped, nonMainInputCounts);
	const aiParentNames = getAiParentNames(stripped);
	const aiConfigNames = getAiConfigNames(stripped);

	const boxes = new Map<string, FreshLayoutBox>();
	for (const [name, position] of positions) {
		const graphNode = stripped.get(name);
		if (!graphNode || graphNode.instance.type === STICKY_NODE_TYPE) continue;
		const { width, height } = getNodeDimensions(
			name,
			aiParentNames,
			aiConfigNames,
			stripped,
			nonMainInputCounts,
		);
		boxes.set(name, { x: position[0], y: position[1], width, height });
	}
	return boxes;
}
