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
	jsonParse,
	NodeConnectionTypes,
	NodeHelpers,
	Workflow,
	type INodeParameters,
	type INodeTypes,
} from 'n8n-workflow';

import {
	GRID_SIZE,
	DEFAULT_NODE_SIZE,
	CONFIGURATION_NODE_SIZE,
	CONFIGURATION_NODE_RADIUS,
	AGENT_NODE_SIZE,
	NODE_MIN_INPUT_ITEMS_COUNT,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	SUBGRAPH_SPACING,
	AI_X_SPACING,
	AI_Y_SPACING,
	STICKY_BOTTOM_PADDING,
	STICKY_NODE_TYPE,
	MESSAGE_AN_AGENT_NODE_TYPE,
	NODE_SPACING_X,
	DEFAULT_Y,
	START_X,
	DEFAULT_STICKY_SIZE,
	STICKY_PADDING,
	STICKY_HEADER_HEIGHT,
	MAX_STICKY_SEPARATION_STEPS,
} from './constants';
import {
	collapseNodeGroups,
	placeGroupMembers,
	type BoundingBox,
	type CollapsedGroup,
} from './group-layout-utils';
import { parseVersion } from './string-utils';
import { parseWorkflowJSON } from './workflow-import';
import {
	isAnchoredStickyNote,
	type GraphNode,
	type NodePorts,
	type WorkflowJSON,
} from '../types/base';
import type { ResolvedNodeGroup } from './plugins/types';

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
	aiConfigNames: ReadonlySet<string>,
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

/** Mirrors `calculateNodeSize` in editor-ui `nodeViewUtils.ts`. */
function canvasNodeSize(ports: NodePorts): { width: number; height: number } {
	const maxVerticalHandles = Math.max(ports.mainInputs, ports.mainOutputs, 1);
	const height = DEFAULT_NODE_SIZE[1] + Math.max(0, maxVerticalHandles - 2) * GRID_SIZE * 2;
	if (ports.configurable) {
		const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, ports.nonMainInputs);
		return {
			// A configuration node gets one more grid step, so that its centred output aligns to the grid
			width:
				CONFIGURATION_NODE_RADIUS * 2 +
				GRID_SIZE * ((ports.configuration ? 1 : 0) + (portCount - 1) * 3),
			height: ports.configuration ? CONFIGURATION_NODE_SIZE[1] : height,
		};
	}
	if (ports.configuration) {
		return { width: CONFIGURATION_NODE_SIZE[0], height: CONFIGURATION_NODE_SIZE[1] };
	}
	return { width: DEFAULT_NODE_SIZE[0], height };
}

/** Ports read from the wires, for a node whose type is not known. A port without a wire is not seen. */
function wiredPorts(
	nodeName: string,
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
	nodes: ReadonlyMap<string, GraphNode>,
): NodePorts {
	const aiInputTypes = new Set<string>();
	if (aiParentNames.has(nodeName)) {
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
	}
	return {
		mainInputs: getMainInputCount(nodeName, nodes),
		mainOutputs: getMainOutputCount(nodeName, nodes),
		nonMainInputs: aiInputTypes.size,
		configuration: aiConfigNames.has(nodeName),
		configurable: aiParentNames.has(nodeName),
	};
}

/**
 * Each node's ports, read from its node type as the canvas reads them. Some node types
 * declare their ports as an expression over the node parameters, so this evaluates the
 * expression with the parameter defaults filled in. A node of an unknown type is left out.
 * Pass the result to `toJSON({ nodePorts })` and `getWorkflowNodeDimensions`.
 */
export async function resolveNodePorts(
	json: WorkflowJSON,
	nodeTypes: INodeTypes,
): Promise<Map<string, NodePorts>> {
	const descriptionOf = (node: { type: string; typeVersion: number }) => {
		try {
			return nodeTypes.getByNameAndVersion(node.type, node.typeVersion)?.description;
		} catch {
			// The server's node types throw on an unknown type.
			return undefined;
		}
	};
	// The workflow fills in the parameter defaults that the port expressions read.
	const workflow = new Workflow({
		nodes: json.nodes.flatMap(({ id, name, type, typeVersion, parameters, onError }) =>
			name !== undefined && descriptionOf({ type, typeVersion })
				? [
						{
							id,
							name,
							type,
							typeVersion,
							position: [0, 0] satisfies [number, number],
							parameters: jsonParse<INodeParameters>(JSON.stringify(parameters ?? {})),
							onError,
						},
					]
				: [],
		),
		connections: {},
		active: false,
		nodeTypes,
	});
	// The VM expression engine evaluates an expression only while the workflow holds an isolate.
	return await workflow.expression.withIsolate(async () => {
		const ports = new Map<string, NodePorts>();
		for (const node of Object.values(workflow.nodes)) {
			const description = descriptionOf(node);
			if (!description) continue;
			const inputs = NodeHelpers.getConnectionTypes(
				NodeHelpers.getNodeInputs(workflow, node, description),
			);
			const outputs = NodeHelpers.getConnectionTypes(
				NodeHelpers.getNodeOutputs(workflow, node, description),
			);
			const nonMainInputs = inputs.filter((type) => type !== NodeConnectionTypes.Main).length;
			ports.set(node.name, {
				mainInputs: inputs.length - nonMainInputs,
				mainOutputs: outputs.filter((type) => type === NodeConnectionTypes.Main).length,
				nonMainInputs,
				configuration: outputs.some((type) => type !== NodeConnectionTypes.Main),
				configurable: nonMainInputs > 0,
			});
		}
		return ports;
	});
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
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
	nodes: ReadonlyMap<string, GraphNode>,
	knownPorts?: ReadonlyMap<string, NodePorts>,
): { width: number; height: number } {
	const graphNode = nodes.get(nodeName);
	if (graphNode?.instance.type === STICKY_NODE_TYPE) {
		return declaredStickySize(graphNode);
	}

	if (
		graphNode?.instance.type === MESSAGE_AN_AGENT_NODE_TYPE &&
		parseVersion(graphNode.instance.version) >= 2
	) {
		return { width: AGENT_NODE_SIZE[0], height: AGENT_NODE_SIZE[1] };
	}

	return canvasNodeSize(
		knownPorts?.get(nodeName) ?? wiredPorts(nodeName, aiParentNames, aiConfigNames, nodes),
	);
}

/**
 * The canvas size of each node in a workflow JSON, by node name. Give the ports from
 * `resolveNodePorts` to size each node by its declared ports, as the canvas does; without
 * them, the size comes from the wired ports only.
 */
export function getWorkflowNodeDimensions(
	json: WorkflowJSON,
	knownPorts?: ReadonlyMap<string, NodePorts>,
): Map<string, { width: number; height: number }> {
	const { nodes } = parseWorkflowJSON(json);
	const aiParentNames = getAiParentNames(nodes);
	const aiConfigNames = getAiConfigNames(nodes);
	return new Map(
		[...nodes.keys()].map((name) => [
			name,
			getNodeDimensions(name, aiParentNames, aiConfigNames, nodes, knownPorts),
		]),
	);
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

function createParentGraph(
	nonStickyNames: readonly string[],
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
	nodes: ReadonlyMap<string, GraphNode>,
	knownPorts: ReadonlyMap<string, NodePorts> | undefined,
): dagre.graphlib.Graph {
	const parentGraph = new dagre.graphlib.Graph();
	parentGraph.setGraph({});
	parentGraph.setDefaultEdgeLabel(() => ({}));

	for (const name of nonStickyNames) {
		const { width, height } = getNodeDimensions(
			name,
			aiParentNames,
			aiConfigNames,
			nodes,
			knownPorts,
		);
		const explicitPosition = nodes.get(name)?.instance.config?.position;
		parentGraph.setNode(name, {
			width,
			height,
			...(explicitPosition ? { x: explicitPosition[0], y: explicitPosition[1] } : {}),
		});
	}

	return parentGraph;
}

function addConnectionEdges(
	parentGraph: dagre.graphlib.Graph,
	nonStickyNames: readonly string[],
	nodes: ReadonlyMap<string, GraphNode>,
): void {
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
}

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
		// Dagre mutates node labels during layout. Copy them so a subgraph layout
		// cannot change the graph that will be laid out later.
		.forEach((id) => subGraph.setNode(id, { ...parent.node(id) }));

	parent
		.edges()
		.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
		.forEach((edge) => subGraph.setEdge(edge.v, edge.w, parent.edge(edge)));

	return subGraph;
}

/** Check that a group contains every node in each AI subtree it touches. */
function hasCompleteAiSubtree(
	nodeIds: readonly string[],
	parentGraph: dagre.graphlib.Graph,
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
): boolean {
	const memberIds = new Set(nodeIds);
	const aiParents = [...aiParentNames].filter((parentId) => {
		if (memberIds.has(parentId)) return true;

		return getAllConnectedAiConfigNodes(parentGraph, parentId, aiConfigNames).some((id) =>
			memberIds.has(id),
		);
	});

	for (const aiParentId of aiParents) {
		const aiSubtree = new Set([
			aiParentId,
			...getAllConnectedAiConfigNodes(parentGraph, aiParentId, aiConfigNames),
		]);
		if ([...aiSubtree].some((id) => !memberIds.has(id))) return false;
	}

	return nodeIds.every(
		(id) =>
			!aiConfigNames.has(id) ||
			aiParents.some((parentId) => {
				const aiSubtree = new Set([
					parentId,
					...getAllConnectedAiConfigNodes(parentGraph, parentId, aiConfigNames),
				]);
				return aiSubtree.has(id);
			}),
	);
}

/** Layout group members with the existing AI interior layout when needed. */
function layoutGroupMembers(
	nodeIds: string[],
	parentGraph: dagre.graphlib.Graph,
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
	nodes: ReadonlyMap<string, GraphNode>,
): dagre.graphlib.Graph {
	const subgraph = createSubGraph(nodeIds, parentGraph);
	const containsAiNode = nodeIds.some((id) => aiParentNames.has(id) || aiConfigNames.has(id));
	if (!containsAiNode) {
		dagre.layout(subgraph, { disableOptimalOrderHeuristic: true });
		return subgraph;
	}

	const subgraphs = layoutSubgraphs(subgraph, aiParentNames, aiConfigNames);
	const boxes = boxesFromSubgraphs(
		subgraphs,
		arrangeSubgraphs(subgraphs),
		new Map<string, CollapsedGroup>(),
		nodes,
		new Map<string, string>(),
	);
	alignAiSubgraphs(subgraphs, boxes);

	const laidOut = new dagre.graphlib.Graph();
	laidOut.setGraph(subgraph.graph());
	laidOut.setDefaultEdgeLabel(() => ({}));
	for (const nodeId of nodeIds) {
		const box = boxes[nodeId];
		if (!box) continue;
		laidOut.setNode(nodeId, {
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
			width: box.width,
			height: box.height,
		});
	}
	for (const edge of subgraph.edges()) {
		laidOut.setEdge(edge.v, edge.w, subgraph.edge(edge));
	}

	return laidOut;
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

interface AiGraphLayout {
	graph: dagre.graphlib.Graph;
	boundingBox: BoundingBox;
	aiParentId: string;
}

interface LayoutSubgraph {
	graph: dagre.graphlib.Graph;
	aiGraphs: AiGraphLayout[];
	boundingBox: BoundingBox;
}

/** Lay out each connected component after folding groups and AI subgraphs. */
function layoutSubgraphs(
	parentGraph: dagre.graphlib.Graph,
	aiParentNames: ReadonlySet<string>,
	aiConfigNames: ReadonlySet<string>,
): LayoutSubgraph[] {
	return dagre.graphlib.alg.components(parentGraph).map((nodeIds) => {
		const subgraph = createSubGraph(nodeIds, parentGraph);
		const aiParentsInSubgraph = subgraph.nodes().filter((id) => aiParentNames.has(id));

		const aiGraphs = aiParentsInSubgraph.map((aiParentId): AiGraphLayout => {
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
}

/** Arrange disconnected components vertically, matching the existing tidy-up order. */
function arrangeSubgraphs(subgraphs: readonly LayoutSubgraph[]): dagre.graphlib.Graph | undefined {
	if (subgraphs.length <= 1) return undefined;

	const compositeGraph = createVerticalGraph(
		subgraphs.map(({ boundingBox }, index) => ({
			box: boundingBox,
			id: index.toString(),
		})),
	);
	dagre.layout(compositeGraph);
	return compositeGraph;
}

/** Convert component and AI graph coordinates into boxes keyed by runtime node key. */
function boxesFromSubgraphs(
	subgraphs: readonly LayoutSubgraph[],
	compositeGraph: dagre.graphlib.Graph | undefined,
	groupByGraphId: ReadonlyMap<string, CollapsedGroup>,
	nodes: ReadonlyMap<string, GraphNode>,
	keyByNodeId: ReadonlyMap<string, string>,
): Record<string, BoundingBox> {
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

			const group = groupByGraphId.get(nodeId);
			if (group) {
				placeGroupMembers(group, box, boundingBoxByNodeId, {
					boundingBoxFromGraph,
					compositeBoundingBox,
					keyByNodeId,
					nodes,
					snapToGrid,
					wrappingBoxFor,
				});
				continue;
			}

			if (!aiParentIds.has(nodeId)) {
				boundingBoxByNodeId[nodeId] = box;
				continue;
			}

			const aiGraphInfo = aiGraphs.find(({ aiParentId }) => aiParentId === nodeId);
			if (!aiGraphInfo) continue;

			for (const aiNodeId of aiGraphInfo.graph.nodes()) {
				const aiNode = aiGraphInfo.graph.node(aiNodeId);
				boundingBoxByNodeId[aiNodeId] = {
					x: aiNode.x + box.x - aiNode.width / 2,
					y: aiNode.y + box.y - aiNode.height / 2,
					width: aiNode.width,
					height: aiNode.height,
				};
			}
		}
	});

	return boundingBoxByNodeId;
}

/** Top-align AI subtrees when their corrected bounds do not collide with others. */
function alignAiSubgraphs(
	subgraphs: readonly LayoutSubgraph[],
	boundingBoxByNodeId: Record<string, BoundingBox>,
): void {
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
// Helpers: Node groups
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Dagre layout function
// ---------------------------------------------------------------------------

/**
 * Calculate positions for nodes using Dagre hierarchical layout.
 * Mirrors the frontend's useCanvasLayout algorithm.
 *
 * Pass `nodeGroups` so a group gets the space the canvas draws for it. The canvas
 * shows a group collapsed by default: one fixed-size chip standing in for every
 * member. Laying the members out individually instead leaves the chip off the row
 * its neighbours sit on, and sized wrong.
 *
 * Only sets positions for nodes without explicit config.position.
 *
 * Give the ports from `resolveNodePorts` to size each node by its declared ports, as the
 * canvas does.
 */
export function calculateNodePositionsDagre(
	nodes: ReadonlyMap<string, GraphNode>,
	nodeGroups?: readonly ResolvedNodeGroup[],
	knownPorts?: ReadonlyMap<string, NodePorts>,
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

	const sizeOf = (name: string) =>
		getNodeDimensions(name, aiParentNames, aiConfigNames, nodes, knownPorts);
	const parentGraph = createParentGraph(
		nonStickyNames,
		aiParentNames,
		aiConfigNames,
		nodes,
		knownPorts,
	);
	addConnectionEdges(parentGraph, nonStickyNames, nodes);

	// Fold groups away before splitting into components, so a group that bridges
	// two otherwise-separate clusters keeps them in one component.
	const keyByNodeId = new Map<string, string>();
	for (const [key, graphNode] of nodes) {
		const id = graphNode.instance.id;
		if (id !== undefined) keyByNodeId.set(id, key);
	}

	// Members the layout is not free to move: stickies get placed relative to their
	// anchors, and an explicit position is the author's to keep. Complete AI
	// subtrees are handled as a group interior; partial subtrees are rejected below.
	const ungroupableKeys = new Set(stickyNames);
	for (const [key, graphNode] of nodes) {
		if (graphNode.instance.config?.position) ungroupableKeys.add(key);
	}

	const collapsedGroups = nodeGroups?.length
		? collapseNodeGroups(parentGraph, nodeGroups, nodes, keyByNodeId, ungroupableKeys, {
				createSubGraph,
				canCollapseMembers: (memberKeys, graph) =>
					hasCompleteAiSubtree(memberKeys, graph, aiParentNames, aiConfigNames),
				layoutSubGraph: (memberKeys, graph) =>
					layoutGroupMembers(memberKeys, graph, aiParentNames, aiConfigNames, nodes),
			})
		: [];
	const groupByGraphId = new Map(collapsedGroups.map((group) => [group.graphId, group]));

	const subgraphs = layoutSubgraphs(parentGraph, aiParentNames, aiConfigNames);

	const compositeGraph = arrangeSubgraphs(subgraphs);

	const boundingBoxByNodeId = boxesFromSubgraphs(
		subgraphs,
		compositeGraph,
		groupByGraphId,
		nodes,
		keyByNodeId,
	);

	alignAiSubgraphs(subgraphs, boundingBoxByNodeId);

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
			const { width, height } = sizeOf(name);
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
				const { width, height } = sizeOf(name);
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
