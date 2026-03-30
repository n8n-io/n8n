/**
 * Layout Utility Functions
 *
 * Dagre-based layout that mirrors the frontend's useCanvasLayout algorithm
 * to produce positions matching what the FE tidy-up would generate.
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
} from './constants';
import type { GraphNode, WorkflowJSON, ConnectionTarget } from '../types/base';

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

/**
 * Find nodes that are AI parents (targets of ai_* connections).
 * Returns a set of node names that receive ai_* connections.
 */
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

/**
 * Find nodes that are AI config nodes (have outgoing ai_* connections).
 * Returns a set of node names.
 */
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

/**
 * Recursively find all AI config nodes connected to a parent node.
 * Uses dagre graph predecessors (since ai edges go config -> parent in the graph).
 */
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

/**
 * Get node dimensions based on classification.
 * Uses defaults for now — structured so it can later accept node type descriptions
 * for accurate handle-based sizing.
 */
export function getNodeDimensions(
	nodeName: string,
	aiParentNames: Set<string>,
	aiConfigNames: Set<string>,
	nodes: ReadonlyMap<string, GraphNode>,
): { width: number; height: number } {
	if (aiConfigNames.has(nodeName)) {
		return { width: CONFIGURATION_NODE_SIZE[0], height: CONFIGURATION_NODE_SIZE[1] };
	}

	if (aiParentNames.has(nodeName)) {
		// Count distinct ai_* connection types targeting this node to determine port count
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

	return { width: DEFAULT_NODE_SIZE[0], height: DEFAULT_NODE_SIZE[1] };
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

/**
 * Reposition sticky notes to cover the same nodes they covered before layout.
 * Structured as a standalone function for easy future refinement.
 */
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

		// Find which non-sticky nodes the sticky covered before layout
		const coveredNames = nonStickyNames.filter((name) => {
			const nodeBox = positionsBefore.get(name);
			return nodeBox && isCoveredBy(stickyBoxBefore, nodeBox);
		});

		if (coveredNames.length === 0) continue;

		// Get the bounding box of those nodes after layout
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
// Main layout function
// ---------------------------------------------------------------------------

/**
 * Calculate positions for nodes using Dagre hierarchical layout.
 * Mirrors the frontend's useCanvasLayout algorithm.
 *
 * Only sets positions for nodes without explicit config.position.
 */
export function calculateNodePositions(
	nodes: ReadonlyMap<string, GraphNode>,
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
		const { width, height } = getNodeDimensions(name, aiParentNames, aiConfigNames, nodes);
		parentGraph.setNode(name, { width, height });
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
		// Build "before" bounding boxes from original positions
		const positionsBefore = new Map<string, BoundingBox>();
		for (const [name, graphNode] of nodes) {
			const pos = graphNode.instance.config?.position;
			const { width, height } = getNodeDimensions(name, aiParentNames, aiConfigNames, nodes);
			positionsBefore.set(name, {
				x: pos ? pos[0] : 0,
				y: pos ? pos[1] : 0,
				width,
				height,
			});
		}

		// Build "after" bounding boxes from computed positions
		const positionsAfter = new Map<string, BoundingBox>();
		for (const [name, box] of Object.entries(boundingBoxByNodeId)) {
			positionsAfter.set(name, box);
		}

		repositionStickyNotes(stickyNames, nonStickyNames, positionsBefore, positionsAfter, positions);
	}

	return positions;
}

// ---------------------------------------------------------------------------
// WorkflowJSON layout (operates on serialized workflow, not builder graph)
// ---------------------------------------------------------------------------

/**
 * Return a new WorkflowJSON with Dagre-computed node positions.
 * Builds a GraphNode map from the serialized JSON and delegates to calculateNodePositions.
 *
 * Pure function — does not mutate the input.
 *
 * This is the entry point for code paths that don't go through the builder
 * (e.g., sandbox-compiled workflows in instance-ai).
 */
export function layoutWorkflowJSON(json: WorkflowJSON): WorkflowJSON {
	const jsonNodes = json.nodes;
	if (!jsonNodes || jsonNodes.length === 0) return json;

	const connections = json.connections ?? {};

	// Build a GraphNode map from WorkflowJSON
	const graphNodes = new Map<string, GraphNode>();

	for (const node of jsonNodes) {
		if (!node.name) continue;
		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
		connectionsMap.set('main', new Map());
		graphNodes.set(node.name, {
			instance: {
				type: node.type,
				name: node.name,
				version: node.typeVersion,
				config: {},
			} as unknown as GraphNode['instance'],
			connections: connectionsMap,
		});
	}

	// Populate connections from WorkflowJSON connections structure
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const graphNode = graphNodes.get(sourceName);
		if (!graphNode) continue;

		for (const [connType, outputs] of Object.entries(nodeConns)) {
			if (!Array.isArray(outputs)) continue;
			let outputMap = graphNode.connections.get(connType);
			if (!outputMap) {
				outputMap = new Map();
				graphNode.connections.set(connType, outputMap);
			}
			for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
				const slot = outputs[outputIdx];
				if (!Array.isArray(slot)) continue;
				const targets: ConnectionTarget[] = slot
					.filter((t): t is { node: string; type: string; index: number } => !!t?.node)
					.map((t) => ({ node: t.node, type: t.type, index: t.index }));
				if (targets.length > 0) {
					outputMap.set(outputIdx, targets);
				}
			}
		}
	}

	// Calculate positions using the existing Dagre layout
	const positions = calculateNodePositions(graphNodes);

	// Return new WorkflowJSON with updated positions
	return {
		...json,
		nodes: jsonNodes.map((node) => {
			const pos = node.name ? positions.get(node.name) : undefined;
			return pos ? { ...node, position: pos } : node;
		}),
	};
}
