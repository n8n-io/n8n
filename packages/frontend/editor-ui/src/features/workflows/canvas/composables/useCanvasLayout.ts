import dagre from '@dagrejs/dagre';

import { useVueFlow, type GraphEdge, type GraphNode, type XYPosition } from '@vue-flow/core';
import {
	CanvasNodeRenderType,
	isCanvasGroupNode,
	type BoundingBox,
	type CanvasConnection,
	type CanvasGroupNodeData,
	type CanvasLayoutNode,
	type CanvasLayoutNodeData,
	type CanvasNodeData,
} from '../canvas.types';
import { isPresent } from '@/app/utils/typesUtils';
import {
	AGENT_NODE_SIZE,
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	NODE_X_SPACING,
	snapPositionToGridByCenter,
} from '@/app/utils/nodeViewUtils';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
} from '../stores/canvasNodeGroups.constants';
import type { ComputedRef, Ref } from 'vue';
import { computeNodeDisplaySize, type CanvasRenderData } from '../canvas.utils';
import { computeGroupFrameRects } from './useCanvasMapping.groups';
import {
	hasMeasuredDimensions,
	isAiConfigNode,
	isAiParentNode,
	isStickyCanvasNode,
} from './useCanvasLayout.guards';

export type CanvasLayoutTarget = 'selection' | 'all';
export type CanvasLayoutSource =
	| 'keyboard-shortcut'
	| 'canvas-button'
	| 'context-menu'
	| 'command-bar'
	| 'import-workflow-data'
	| 'builder-update';
export type NodeLayoutResult = {
	id: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
};
export type CanvasLayoutResult = { boundingBox: BoundingBox; nodes: NodeLayoutResult[] };

export type CanvasLayoutEvent = {
	result: CanvasLayoutResult;
	source: CanvasLayoutSource;
	target: CanvasLayoutTarget;
};

type CanvasLayoutNodeDictionary = Record<string, CanvasLayoutNode>;
type LayoutConnection = CanvasConnection & Partial<Pick<GraphEdge, 'targetX' | 'targetY'>>;

type CanvasLayoutTargetData = {
	nodes: CanvasLayoutNode[];
	edges: LayoutConnection[];
	groupUnits: CanvasLayoutGroupUnit[];
};

interface CanvasLayoutGroupUnit {
	node: GraphNode<CanvasGroupNodeData>;
	memberIds: string[];
	/** Stickies that cover the group and move with it. */
	stickyIds: string[];
	/** The rendered frame of an expanded group, or the chip of a collapsed one. */
	groupBox: BoundingBox;
	/** The box dagre reserves: the group box grown to include attached stickies. */
	boundingBox: BoundingBox;
}

const NODE_Y_SPACING = GRID_SIZE * 6;
const SUBGRAPH_SPACING = GRID_SIZE * 8;
const AI_X_SPACING = GRID_SIZE * 3;
const AI_Y_SPACING = GRID_SIZE * 8;
const STICKY_BOTTOM_PADDING = GRID_SIZE * 4;

export function useCanvasLayout(
	canvasId: string,
	isEmbeddedNdvActive: ComputedRef<boolean>,
	renderData: Ref<CanvasRenderData>,
) {
	const { findNode, getSelectedNodes, edges: allEdges, nodes: allNodes } = useVueFlow(canvasId);

	function getSourceNodes(target: CanvasLayoutTarget) {
		return target === 'selection' ? getSelectedNodes.value : allNodes.value;
	}

	/** Returns the nodes, edges, and group units to pass into dagre. */
	function getTargetData(target: CanvasLayoutTarget): CanvasLayoutTargetData {
		const source = getSourceNodes(target);
		const sourceNodeIds = new Set(source.map((node) => node.id));

		// Dagre lays out each complete group as one box:
		// collapsed groups use their chip, expanded groups use their frame.
		const groupUnits = allNodes.value
			.filter(isCanvasGroupNode)
			.map((groupNode) => getGroupUnitForTarget(groupNode, sourceNodeIds))
			.filter(isPresent);
		const groupedMemberIds = new Set(groupUnits.flatMap(({ memberIds }) => memberIds));

		// Grouped members move with their group box after dagre runs.
		const regularNodes = source.filter(
			(node) => !isCanvasGroupNode(node) && !node.hidden && !groupedMemberIds.has(node.id),
		);

		const unitsWithStickies = attachCoveringStickies(groupUnits, regularNodes);
		const attachedStickyIds = new Set(unitsWithStickies.flatMap(({ stickyIds }) => stickyIds));

		return {
			nodes: [
				...regularNodes.filter((node) => !attachedStickyIds.has(node.id)),
				...unitsWithStickies.map(({ node }) => node),
			],
			edges: remapGroupUnitConnections(allEdges.value, unitsWithStickies),
			groupUnits: unitsWithStickies,
		};
	}

	/**
	 * Folds a sticky that covers exactly one group, and nothing else, into that
	 * group's layout unit. Dagre then reserves room for the sticky too, so it
	 * cannot land on a neighbour after the group moves.
	 */
	function attachCoveringStickies(
		groupUnits: CanvasLayoutGroupUnit[],
		regularNodes: CanvasLayoutNode[],
	): CanvasLayoutGroupUnit[] {
		const stickies = regularNodes.filter(isStickyCanvasNode);
		if (stickies.length === 0 || groupUnits.length === 0) return groupUnits;

		const plainNodeBoxes = regularNodes
			.filter((node) => !isStickyCanvasNode(node))
			.map((node) => boundingBoxFromCanvasNode(node));

		const stickiesByUnitId = new Map<string, Array<{ id: string; box: BoundingBox }>>();
		for (const sticky of stickies) {
			const stickyBox = boundingBoxFromCanvasNode(sticky);
			if (plainNodeBoxes.some((box) => isCoveredBy(stickyBox, box))) continue;

			const coveredUnits = groupUnits.filter(({ groupBox }) => isCoveredBy(stickyBox, groupBox));
			if (coveredUnits.length !== 1) continue;

			const unitId = coveredUnits[0].node.id;
			stickiesByUnitId.set(unitId, [
				...(stickiesByUnitId.get(unitId) ?? []),
				{ id: sticky.id, box: stickyBox },
			]);
		}

		return groupUnits.map((unit) => {
			const attached = stickiesByUnitId.get(unit.node.id);
			if (!attached) return unit;

			return {
				...unit,
				stickyIds: attached.map(({ id }) => id),
				boundingBox: compositeBoundingBox([unit.boundingBox, ...attached.map(({ box }) => box)]),
			};
		});
	}

	/** Returns a group as one layout unit when its full contents are in scope. */
	function getGroupUnitForTarget(
		groupNode: GraphNode<CanvasGroupNodeData>,
		sourceNodeIds: Set<string>,
	): CanvasLayoutGroupUnit | undefined {
		const groupData = groupNode.data;
		if (!groupData) return undefined;

		const memberIds = groupData.group.nodeIds;

		if (groupData.isCollapsed) {
			if (!sourceNodeIds.has(groupNode.id)) return undefined;

			// The collapsed group chip already has the box dagre needs.
			const chipBox = boundingBoxFromCanvasNode(groupNode);
			return { node: groupNode, memberIds, stickyIds: [], groupBox: chipBox, boundingBox: chipBox };
		}

		if (!memberIds.every((memberId) => sourceNodeIds.has(memberId))) return undefined;

		// Expanded groups need their frame size, not only their member bounds.
		const expandedFrame = computeGroupFrameRects(groupData.nodesRect).expanded;

		const frameBox = {
			x: groupNode.position.x,
			y: groupNode.position.y,
			width: expandedFrame.width,
			height: expandedFrame.height,
		};
		return { node: groupNode, memberIds, stickyIds: [], groupBox: frameBox, boundingBox: frameBox };
	}

	/** Converts member connections to group-unit connections for dagre. */
	function remapGroupUnitConnections(
		connections: LayoutConnection[],
		groupUnits: CanvasLayoutGroupUnit[],
	): LayoutConnection[] {
		if (groupUnits.length === 0) return connections;

		const unitIdByMemberId = new Map<string, string>();
		for (const { node, memberIds } of groupUnits) {
			for (const memberId of memberIds) {
				unitIdByMemberId.set(memberId, node.id);
			}
		}

		const result: LayoutConnection[] = [];
		const emittedConnectionKeys = new Set<string>();

		for (const connection of connections) {
			const sourceUnitId = unitIdByMemberId.get(connection.source);
			const targetUnitId = unitIdByMemberId.get(connection.target);

			if (sourceUnitId && targetUnitId && sourceUnitId === targetUnitId) continue;

			const source = sourceUnitId ?? connection.source;
			const target = targetUnitId ?? connection.target;
			if (source === target) continue;

			const key = JSON.stringify([source, target]);
			if (emittedConnectionKeys.has(key)) continue;

			emittedConnectionKeys.add(key);
			const remappedConnection = { ...connection, source, target };
			if (targetUnitId) {
				delete remappedConnection.targetX;
				delete remappedConnection.targetY;
			}
			result.push(remappedConnection);
		}

		return result;
	}

	function sortByPosition(posA: XYPosition, posB: XYPosition): number {
		const yDiff = posA.y - posB.y;
		return yDiff === 0 ? posA.x - posB.x : yDiff;
	}

	function sortNodesByPosition(
		nodeA: CanvasLayoutNode,
		nodeB: CanvasLayoutNode,
		edgeTargets: Set<string>,
	): number {
		const hasEdgesA = edgeTargets.has(nodeA.id);
		const hasEdgesB = edgeTargets.has(nodeB.id);

		if (!hasEdgesA && hasEdgesB) return -1;
		if (hasEdgesA && !hasEdgesB) return 1;
		return sortByPosition(nodeA.position, nodeB.position);
	}

	function sortEdgesByPosition(edgeA: LayoutConnection, edgeB: LayoutConnection): number {
		return sortByPosition(positionFromEdge(edgeA), positionFromEdge(edgeB));
	}

	/** Returns the target position used to order layout connections. */
	function positionFromEdge(edge: LayoutConnection): XYPosition {
		if (typeof edge.targetX === 'number' && typeof edge.targetY === 'number') {
			return { x: edge.targetX, y: edge.targetY };
		}

		return findNode<CanvasLayoutNodeData>(edge.target)?.position ?? { x: 0, y: 0 };
	}

	/** Returns measured node dimensions when VueFlow has a usable value. */
	function getMeasuredDimensions(
		node: CanvasLayoutNode,
	): { width: number; height: number } | undefined {
		return hasMeasuredDimensions(node.dimensions) ? node.dimensions : undefined;
	}

	/** Returns the size that dagre must reserve for a layout node. */
	function getNodeDimensions(
		node: CanvasLayoutNode,
		groupUnitBoundingBoxes?: Map<string, BoundingBox>,
	): { width: number; height: number } {
		const groupUnitBox = groupUnitBoundingBoxes?.get(node.id);
		if (groupUnitBox) {
			return { width: groupUnitBox.width, height: groupUnitBox.height };
		}

		// A collapsed group enters the graph as its fixed-size chip
		if (isCanvasGroupNode(node)) {
			const dimensions = getMeasuredDimensions(node);
			return {
				width: dimensions?.width || GROUP_HEADER_WIDTH_COLLAPSED,
				height: dimensions?.height || GROUP_HEADER_HEIGHT,
			};
		}

		// Check if dimensions exist and have valid values
		const dimensions = getMeasuredDimensions(node);
		if (dimensions) {
			return dimensions;
		}

		// Calculate dimensions based on node data
		if (node.data.render?.type === CanvasNodeRenderType.Default) {
			return computeNodeDisplaySize(
				node.id,
				node.data.render.options,
				renderData.value,
				isEmbeddedNdvActive.value,
			);
		}

		// The agent card is far larger than the default node — without this the
		// unmeasured fallback below would feed dagre a 96x96 box for it
		if (node.data.render?.type === CanvasNodeRenderType.Agent) {
			return { width: AGENT_NODE_SIZE[0], height: AGENT_NODE_SIZE[1] };
		}

		// Fallback to default size
		return { width: DEFAULT_NODE_SIZE[0], height: DEFAULT_NODE_SIZE[1] };
	}

	/** Builds the parent dagre graph from layout nodes and connections. */
	function createDagreGraph({ nodes, edges, groupUnits }: CanvasLayoutTargetData) {
		const graph = new dagre.graphlib.Graph();
		graph.setDefaultEdgeLabel(() => ({}));
		const groupUnitBoundingBoxes = new Map(
			groupUnits.map(({ node, boundingBox }) => [node.id, boundingBox]),
		);

		const edgeTargets = new Set(edges.map(({ target }) => target));
		const graphNodes = [...nodes].sort((nodeA, nodeB) =>
			sortNodesByPosition(nodeA, nodeB, edgeTargets),
		);

		const nodeIdSet = new Set(nodes.map((node) => node.id));

		graphNodes.forEach((node) => {
			const { width, height } = getNodeDimensions(node, groupUnitBoundingBoxes);
			const groupUnitBox = groupUnitBoundingBoxes.get(node.id);
			const { x, y } = groupUnitBox ?? node.position;
			graph.setNode(node.id, { width, height, x, y });
		});

		edges
			.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
			.sort(sortEdgesByPosition)
			.forEach((edge) => graph.setEdge(edge.source, edge.target));

		return graph;
	}

	function createDagreSubGraph({
		nodeIds,
		parent,
	}: {
		nodeIds: string[];
		parent: dagre.graphlib.Graph;
	}) {
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
			.filter((nodeId) => nodeIdSet.has(nodeId))
			.forEach((nodeId) => {
				subGraph.setNode(nodeId, parent.node(nodeId));
			});

		parent
			.edges()
			.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
			.forEach((edge) => subGraph.setEdge(edge.v, edge.w, parent.edge(edge)));

		return subGraph;
	}

	function createDagreVerticalGraph({ nodes }: { nodes: Array<{ id: string; box: BoundingBox }> }) {
		const subGraph = new dagre.graphlib.Graph();
		subGraph.setGraph({
			rankdir: 'TB',
			align: 'UL',
			edgesep: SUBGRAPH_SPACING,
			nodesep: SUBGRAPH_SPACING,
			ranksep: SUBGRAPH_SPACING,
		});
		subGraph.setDefaultEdgeLabel(() => ({}));

		nodes.forEach(({ id, box: { x, y, width, height } }) =>
			subGraph.setNode(id, { x, y, width, height }),
		);

		nodes.forEach((node, index) => {
			if (!nodes[index + 1]) return;
			subGraph.setEdge(node.id, nodes[index + 1].id);
		});

		return subGraph;
	}

	function createAiSubGraph({
		parent,
		nodeIds,
	}: {
		parent: dagre.graphlib.Graph;
		nodeIds: string[];
	}) {
		const subGraph = new dagre.graphlib.Graph();
		subGraph.setGraph({
			rankdir: 'TB',
			edgesep: AI_X_SPACING,
			nodesep: AI_X_SPACING,
			ranksep: AI_Y_SPACING,
		});
		subGraph.setDefaultEdgeLabel(() => ({}));
		const nodeIdSet = new Set(nodeIds);

		parent
			.nodes()
			.filter((nodeId) => nodeIdSet.has(nodeId))
			.forEach((nodeId) => {
				subGraph.setNode(nodeId, parent.node(nodeId));
			});

		parent
			.edges()
			.filter((edge) => nodeIdSet.has(edge.v) && nodeIdSet.has(edge.w))
			.forEach((edge) => subGraph.setEdge(edge.w, edge.v));

		return subGraph;
	}

	// For a list of bounding boxes, return the bounding box that contains them all
	function compositeBoundingBox(boxes: BoundingBox[]): BoundingBox {
		const { minX, minY, maxX, maxY } = boxes.reduce(
			(bbox, node) => {
				const { x, y, width, height } = node;
				return {
					minX: Math.min(bbox.minX, x),
					maxX: Math.max(bbox.maxX, x + width),
					minY: Math.min(bbox.minY, y),
					maxY: Math.max(bbox.maxY, y + height),
				};
			},
			{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
		);

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	/** Returns the canvas-space box used by layout measurements. */
	function boundingBoxFromCanvasNode(
		node: CanvasLayoutNode,
		groupUnitBoundingBoxes?: Map<string, BoundingBox>,
	): BoundingBox {
		const groupUnitBox = groupUnitBoundingBoxes?.get(node.id);
		const { width, height } = getNodeDimensions(node, groupUnitBoundingBoxes);
		return {
			x: groupUnitBox?.x ?? node.position.x,
			y: groupUnitBox?.y ?? node.position.y,
			width,
			height,
		};
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
		return compositeBoundingBox(
			graph.nodes().map((nodeId) => boundingBoxFromDagreNode(graph.node(nodeId))),
		);
	}

	function boundingBoxFromCanvasNodes(
		nodes: CanvasLayoutNode[],
		groupUnitBoundingBoxes?: Map<string, BoundingBox>,
	): BoundingBox {
		return compositeBoundingBox(
			nodes.map((node) => boundingBoxFromCanvasNode(node, groupUnitBoundingBoxes)),
		);
	}

	// Is the `child` bounding box completely contained in the `parent` bounding box
	function isCoveredBy(parent: BoundingBox, child: BoundingBox) {
		const childRight = child.x + child.width;
		const childBottom = child.y + child.height;
		const parentRight = parent.x + parent.width;
		const parentBottom = parent.y + parent.height;

		return (
			child.x >= parent.x &&
			child.y >= parent.y &&
			childRight <= parentRight &&
			childBottom <= parentBottom
		);
	}

	function centerHorizontally(container: BoundingBox, target: BoundingBox) {
		const containerCenter = container.x + container.width / 2;
		const newX = containerCenter - target.width / 2;
		return newX;
	}

	function intersects(container: BoundingBox, target: BoundingBox, padding = 0): boolean {
		// Add padding to target box dimensions
		const targetWithPadding = {
			x: target.x - padding,
			y: target.y - padding,
			width: target.width + padding * 2,
			height: target.height + padding * 2,
		};

		const noIntersection =
			targetWithPadding.x + targetWithPadding.width < container.x ||
			targetWithPadding.x > container.x + container.width ||
			targetWithPadding.y + targetWithPadding.height < container.y ||
			targetWithPadding.y > container.y + container.height;

		return !noIntersection;
	}

	function getAllConnectedAiConfigNodes({
		graph,
		root,
		nodeById,
	}: {
		graph: dagre.graphlib.Graph;
		root: CanvasNodeData;
		nodeById: CanvasLayoutNodeDictionary;
	}): string[] {
		return (graph.predecessors(root.id) ?? []).flatMap((successor) => {
			if (typeof successor !== 'string') return [];

			const node = nodeById[successor];
			if (!node || !isAiConfigNode(node.data)) return [];

			return [node.id, ...getAllConnectedAiConfigNodes({ graph, root: node.data, nodeById })];
		});
	}

	/** Returns the part of a group unit that connections attach to: its visible members, or its chip. */
	function getGroupUnitContentBox(groupUnit: CanvasLayoutGroupUnit): BoundingBox {
		if (groupUnit.node.data?.isCollapsed) return groupUnit.groupBox;

		const memberBoxes = groupUnit.memberIds
			.map((memberId) => findNode<CanvasNodeData>(memberId))
			.filter(isPresent)
			.map((member) => boundingBoxFromCanvasNode(member));

		return memberBoxes.length > 0 ? compositeBoundingBox(memberBoxes) : groupUnit.groupBox;
	}

	function layout(target: CanvasLayoutTarget): CanvasLayoutResult {
		const { nodes, edges, groupUnits } = getTargetData(target);
		const groupUnitBoundingBoxes = new Map(
			groupUnits.map(({ node, boundingBox }) => [node.id, boundingBox]),
		);

		const nonStickyNodes = nodes.filter((node) => !isStickyCanvasNode(node));
		const boundingBoxBefore = boundingBoxFromCanvasNodes(nonStickyNodes, groupUnitBoundingBoxes);

		const parentGraph = createDagreGraph({ nodes: nonStickyNodes, edges, groupUnits });
		const nodeById: CanvasLayoutNodeDictionary = {};
		for (const node of nonStickyNodes) {
			nodeById[node.id] = node;
		}

		// Divide workflow in to subgraphs
		// A subgraph contains a group of connected nodes that is not connected to any node outside of this group
		const subgraphs = dagre.graphlib.alg.components(parentGraph).map((nodeIds) => {
			const subgraph = createDagreSubGraph({ nodeIds, parent: parentGraph });
			const aiParentNodes = subgraph
				.nodes()
				.map((nodeId) => (typeof nodeId === 'string' ? nodeById[nodeId]?.data : undefined))
				.filter(isAiParentNode);

			// Create a subgraph for each AI (configurable) node and apply a top-bottom layout
			// Then add the bounding box of this layout back into the parent graph before doing layout
			const aiGraphs = aiParentNodes.map((aiParentNode) => {
				const configNodeIds = getAllConnectedAiConfigNodes({
					graph: subgraph,
					nodeById,
					root: aiParentNode,
				});
				const allAiNodeIds = configNodeIds.concat(aiParentNode.id);
				const aiGraph = createAiSubGraph({
					parent: subgraph,
					nodeIds: allAiNodeIds,
				});
				configNodeIds.forEach((nodeId) => subgraph.removeNode(nodeId));
				const rootEdges = subgraph
					.edges()
					.filter((edge) => edge.v === aiParentNode.id || edge.w === aiParentNode.id);

				dagre.layout(aiGraph, { disableOptimalOrderHeuristic: true });
				const aiBoundingBox = boundingBoxFromGraph(aiGraph);
				subgraph.setNode(aiParentNode.id, {
					width: aiBoundingBox.width,
					height: aiBoundingBox.height,
				});
				rootEdges.forEach((edge) => subgraph.setEdge(edge));

				return { graph: aiGraph, boundingBox: aiBoundingBox, aiParentNode };
			});

			dagre.layout(subgraph, { disableOptimalOrderHeuristic: true });

			return { graph: subgraph, aiGraphs, boundingBox: boundingBoxFromGraph(subgraph) };
		});

		const compositeGraph = createDagreVerticalGraph({
			nodes: subgraphs.map(({ boundingBox }, index) => ({
				box: boundingBox,
				id: index.toString(),
			})),
		});

		dagre.layout(compositeGraph, { disableOptimalOrderHeuristic: true });

		const boundingBoxByNodeId = subgraphs
			.flatMap(({ graph, aiGraphs }, index) => {
				const subgraphPosition = compositeGraph.node(index.toString());

				const aiParentNodes = new Set(aiGraphs.map(({ aiParentNode }) => aiParentNode.id));
				const offset = {
					x: 0,
					y: subgraphPosition.y - subgraphPosition.height / 2,
				};

				return graph.nodes().flatMap((nodeId) => {
					const { x, y, width, height } = graph.node(nodeId);
					const positionedNode = {
						id: nodeId,
						boundingBox: {
							x: x + offset.x - width / 2,
							y: y + offset.y - height / 2,
							width,
							height,
						},
					};

					if (aiParentNodes.has(nodeId)) {
						const aiGraph = aiGraphs.find(({ aiParentNode }) => aiParentNode.id === nodeId);

						if (!aiGraph) return [];

						const aiParentNodeBox = positionedNode.boundingBox;

						const parentOffset = {
							x: aiParentNodeBox.x,
							y: aiParentNodeBox.y,
						};

						return aiGraph.graph.nodes().map((aiNodeId) => {
							const aiNode = aiGraph.graph.node(aiNodeId);
							const aiBoundingBox = {
								x: aiNode.x + parentOffset.x - aiNode.width / 2,
								y: aiNode.y + parentOffset.y - aiNode.height / 2,
								width: aiNode.width,
								height: aiNode.height,
							};

							return {
								id: aiNodeId,
								boundingBox: aiBoundingBox,
							};
						});
					}

					return positionedNode;
				});
			})
			.reduce(
				(acc, node) => {
					acc[node.id] = node.boundingBox;
					return acc;
				},
				{} as Record<string, BoundingBox>,
			);

		// Post process AI node vertical position
		// The bounding box of the AI node sublayout is vertically centered with the other nodes, but we want it to be top-aligned when possible
		// We need to be careful to only do this when it would not overlap with other nodes
		subgraphs
			.flatMap(({ aiGraphs }) => aiGraphs)
			.forEach(({ graph }) => {
				const aiNodes = graph.nodes();
				const aiGraphBoundingBox = compositeBoundingBox(
					aiNodes.map((nodeId) => boundingBoxByNodeId[nodeId]).filter(isPresent),
				);
				const aiNodeVerticalCorrection = aiGraphBoundingBox.height / 2 - DEFAULT_NODE_SIZE[0] / 2;
				aiGraphBoundingBox.y += aiNodeVerticalCorrection;

				const hasConflictingNodes = Object.entries(boundingBoxByNodeId)
					.filter(([id]) => !graph.hasNode(id))
					.some(([, nodeBoundingBox]) =>
						intersects(aiGraphBoundingBox, nodeBoundingBox, NODE_Y_SPACING),
					);

				if (!hasConflictingNodes) {
					for (const aiNode of aiNodes) {
						boundingBoxByNodeId[aiNode].y += aiNodeVerticalCorrection;
					}
				}
			});

		// Dagre centers a group's box on the connection axis, but the frame header,
		// padding and any attached sticky put the members off that center. Slide the
		// unit so the members sit on the axis, unless that would run into a neighbour.
		for (const groupUnit of groupUnits) {
			const unitBox = boundingBoxByNodeId[groupUnit.node.id];
			if (!unitBox) continue;

			const contentBox = getGroupUnitContentBox(groupUnit);
			const axisOffset =
				contentBox.y +
				contentBox.height / 2 -
				(groupUnit.boundingBox.y + groupUnit.boundingBox.height / 2);
			if (axisOffset === 0) continue;

			const candidate = { ...unitBox, y: unitBox.y - axisOffset };
			const isBlocked = Object.entries(boundingBoxByNodeId).some(
				([id, box]) => id !== groupUnit.node.id && intersects(candidate, box, NODE_Y_SPACING),
			);
			if (!isBlocked) boundingBoxByNodeId[groupUnit.node.id] = candidate;
		}

		// Measure before grouped members replace their dagre boxes.
		const boundingBoxAfter = compositeBoundingBox(Object.values(boundingBoxByNodeId));

		// Pre-layout boxes of the nodes that get a final position, so stickies can
		// follow the nodes they covered. Group members are added below.
		const boundingBoxBeforeById = new Map(
			nonStickyNodes
				.filter((node) => !groupUnitBoundingBoxes.has(node.id))
				.map((node) => [node.id, boundingBoxFromCanvasNode(node)]),
		);

		const attachedStickies: Array<{ id: string; boundingBox: BoundingBox }> = [];

		// Move group members and attached stickies by the offset of their dagre box,
		// then remove that box. The rendered group position is derived from its members.
		for (const groupUnit of groupUnits) {
			const groupBox = boundingBoxByNodeId[groupUnit.node.id];
			if (!groupBox) continue;

			const delta = {
				x: groupBox.x - groupUnit.boundingBox.x,
				y: groupBox.y - groupUnit.boundingBox.y,
			};

			for (const memberId of groupUnit.memberIds) {
				const member = findNode<CanvasNodeData>(memberId);
				if (!member) continue;
				const box = boundingBoxFromCanvasNode(member);
				boundingBoxBeforeById.set(memberId, box);
				boundingBoxByNodeId[memberId] = {
					x: box.x + delta.x,
					y: box.y + delta.y,
					width: box.width,
					height: box.height,
				};
			}

			for (const stickyId of groupUnit.stickyIds) {
				const sticky = findNode<CanvasNodeData>(stickyId);
				if (!sticky) continue;
				const box = boundingBoxFromCanvasNode(sticky);
				attachedStickies.push({
					id: stickyId,
					boundingBox: { ...box, x: box.x + delta.x, y: box.y + delta.y },
				});
			}

			delete boundingBoxByNodeId[groupUnit.node.id];
		}

		const positionedNodes = Object.entries(boundingBoxByNodeId).map(([id, boundingBox]) => ({
			id,
			boundingBox,
		}));

		const anchor = {
			x: boundingBoxAfter.x - boundingBoxBefore.x,
			y: boundingBoxAfter.y - boundingBoxBefore.y,
		};

		const stickies = nodes
			.filter(isStickyCanvasNode)
			.map((node) => findNode<CanvasNodeData>(node.id))
			.filter(isPresent);

		// A sticky covers a group when it covers the group frame or chip; it then
		// follows all of that group's members.
		function getCoveredNodeIds(stickyBox: BoundingBox): Set<string> {
			const coveredNodeIds = new Set<string>();
			for (const [id, box] of boundingBoxBeforeById) {
				if (isCoveredBy(stickyBox, box)) coveredNodeIds.add(id);
			}
			for (const { memberIds, boundingBox } of groupUnits) {
				if (!isCoveredBy(stickyBox, boundingBox)) continue;
				for (const memberId of memberIds) coveredNodeIds.add(memberId);
			}
			return coveredNodeIds;
		}

		const positionedStickies = stickies
			.map((sticky) => {
				const stickyBox = boundingBoxFromCanvasNode(sticky);
				const coveredNodeIds = getCoveredNodeIds(stickyBox);
				const coveredBoxesAfter = positionedNodes
					.filter(({ id }) => coveredNodeIds.has(id))
					.map(({ boundingBox }) => boundingBox);

				if (coveredBoxesAfter.length === 0) return null;

				const coveredNodesBoxAfter = compositeBoundingBox(coveredBoxesAfter);
				return {
					id: sticky.id,
					boundingBox: {
						x: centerHorizontally(coveredNodesBoxAfter, stickyBox),
						y:
							coveredNodesBoxAfter.y +
							coveredNodesBoxAfter.height -
							stickyBox.height +
							STICKY_BOTTOM_PADDING,
						height: stickyBox.height,
						width: stickyBox.width,
					},
				};
			})
			.filter(isPresent)
			.concat(attachedStickies);

		const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

		// Snap by node center, not top-left: dagre aligns node centers and the
		// connection handles sit at 50% of node height, so snapping the top-left
		// corner shifts any node whose height isn't a multiple of two grid cells
		// (e.g. the content-sized agent card) off the shared axis, leaving its
		// connections slightly inclined. For default-size nodes the two are
		// equivalent, since half their extent is already grid-aligned.
		const finalNodes = positionedNodes
			.map(({ id, boundingBox }) => {
				const [x, y] = snapPositionToGridByCenter(
					[boundingBox.x - anchor.x, boundingBox.y - anchor.y],
					[boundingBox.width, boundingBox.height],
				);
				return {
					id,
					x,
					y,
				};
			})
			// Stickies have no connections to keep straight, so their top-left
			// corner staying on the grid is the better-looking behavior.
			.concat(
				positionedStickies.map(({ id, boundingBox }) => {
					return {
						id,
						x: snapToGrid(boundingBox.x - anchor.x),
						y: snapToGrid(boundingBox.y - anchor.y),
					};
				}),
			);

		return {
			boundingBox: boundingBoxAfter,
			nodes: finalNodes,
		};
	}

	return { layout };
}
