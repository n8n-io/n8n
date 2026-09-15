import dagre from '@dagrejs/dagre';

import { useVueFlow, type GraphNode, type XYPosition } from '@vue-flow/core';
import {
	CanvasConnectionMode,
	CanvasNodeRenderType,
	isCanvasGroupNode,
	type BoundingBox,
	type CanvasGroupNodeData,
	type CanvasLayoutNode,
	type CanvasLayoutNodeData,
	type CanvasNodeData,
} from '../canvas.types';
import { isPresent } from '@/app/utils/typesUtils';
import {
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	NODE_X_SPACING,
	snapToGrid,
} from '@/app/utils/nodeViewUtils';
import { AGENT_NODE_SIZE, getAgentNodeHandleOffset } from '@/features/agents/utils/agentNode';
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
	targetNodeCount?: number;
	target: CanvasLayoutTarget;
};
export type CanvasLayoutOptions = { nodeIdsFilter?: string[] };

type CanvasLayoutNodeDictionary = Record<string, CanvasLayoutNode>;
type LayoutConnection = { source: string; target: string; targetX?: number; targetY?: number };

type CanvasLayoutTargetData = {
	nodes: CanvasLayoutNode[];
	edges: LayoutConnection[];
	groupUnits: CanvasLayoutGroupUnit[];
};

type PositionedBox = { id: string; boundingBox: BoundingBox; coverageBox?: BoundingBox };
type GroupBox = { id: string; box: BoundingBox };
type StickyPreferredXResolver = (
	stickyBox: BoundingBox,
	coveredTargetIds: Set<string>,
) => number | undefined;

/** A group's members tidied on their own, measured from the frame's top-left. */
interface CanvasLayoutGroupContent {
	frame: { width: number; height: number };
	memberBoxesInFrame: Map<string, BoundingBox>;
	contentBoxInFrame: BoundingBox;
}

interface CanvasLayoutGroupUnit {
	node: GraphNode<CanvasGroupNodeData>;
	memberIds: string[];
	/** Stickies that cover the group and move with it. */
	stickyIds: string[];
	/** The rendered frame of an expanded group, or the chip of a collapsed one. */
	groupBox: BoundingBox;
	/** The box dagre reserves: the group box grown to include attached stickies. */
	boundingBox: BoundingBox;
	/** What connections attach to: the tidied members, or the chip. */
	contentBox: BoundingBox;
	/** Member boxes from the group's own layout pass, measured from the frame's top-left. */
	memberBoxesInFrame?: Map<string, BoundingBox>;
}

const NODE_Y_SPACING = GRID_SIZE * 6;
const SUBGRAPH_SPACING = GRID_SIZE * 8;
const AI_X_SPACING = GRID_SIZE * 3;
const AI_Y_SPACING = GRID_SIZE * 8;
const STICKY_BOTTOM_PADDING = GRID_SIZE * 4;

/** Moves a box by an offset without changing its size. */
function translateBox(box: BoundingBox, offset: XYPosition): BoundingBox {
	return { ...box, x: box.x + offset.x, y: box.y + offset.y };
}

function withGridSnapTolerance(box: BoundingBox): BoundingBox {
	const padding = GRID_SIZE / 2;
	return {
		x: box.x - padding,
		y: box.y - padding,
		width: box.width + padding * 2,
		height: box.height + padding * 2,
	};
}

function floorToGrid(value: number) {
	return Math.floor(value / GRID_SIZE) * GRID_SIZE;
}

function ceilToGrid(value: number) {
	return Math.ceil(value / GRID_SIZE) * GRID_SIZE;
}

function snapAxisToContainTarget(
	targetStart: number,
	targetSize: number,
	start: number,
	size: number,
): { start: number; size: number } {
	const targetEnd = targetStart + targetSize;
	if (start <= targetStart && start + size >= targetEnd) return { start, size };

	if (size >= targetSize) {
		const minStart = targetEnd - size;
		const maxStart = targetStart;
		const clampedStart = Math.min(Math.max(start, minStart), maxStart);
		const candidates = [floorToGrid(clampedStart), ceilToGrid(clampedStart)].filter(
			(candidate) => candidate >= minStart && candidate <= maxStart,
		);
		const closest = candidates.sort(
			(a, b) => Math.abs(a - start) - Math.abs(b - start) || a - b,
		)[0];

		if (closest !== undefined) return { start: closest, size };
	}

	const snappedStart = floorToGrid(targetStart);
	return { start: snappedStart, size: targetEnd - snappedStart };
}

export function useCanvasLayout(
	canvasId: string,
	isEmbeddedNdvActive: ComputedRef<boolean>,
	renderData: Ref<CanvasRenderData>,
) {
	const { findNode, getSelectedNodes, edges: allEdges, nodes: allNodes } = useVueFlow(canvasId);

	function getSourceNodes(target: CanvasLayoutTarget, options: CanvasLayoutOptions = {}) {
		if (options.nodeIdsFilter && options.nodeIdsFilter.length > 0) {
			const ids = new Set(options.nodeIdsFilter);
			return allNodes.value.filter((node) => ids.has(node.id));
		}
		return target === 'selection' ? getSelectedNodes.value : allNodes.value;
	}

	/** Returns the nodes, edges, and group units to pass into dagre. */
	function getTargetData(
		target: CanvasLayoutTarget,
		options: CanvasLayoutOptions = {},
	): CanvasLayoutTargetData {
		const source = getSourceNodes(target, options);
		const sourceNodeIds = new Set(source.map((node) => node.id));

		// Dagre lays out each complete group as one box:
		// collapsed groups use their chip, expanded groups use their frame.
		const groupUnits = allNodes.value
			.filter(isCanvasGroupNode)
			.map((groupNode) => getGroupUnitForTarget(groupNode, sourceNodeIds))
			.filter(isPresent);
		const groupedMemberIds = new Set(groupUnits.flatMap(({ memberIds }) => memberIds));
		const allGroupMemberIds = new Set(
			allNodes.value
				.filter(isCanvasGroupNode)
				.flatMap((groupNode) => groupNode.data?.group.nodeIds ?? []),
		);
		const externalStickyCandidates = allNodes.value.filter(
			(node) => !isCanvasGroupNode(node) && !node.hidden && !allGroupMemberIds.has(node.id),
		);
		const blockingNodes = allNodes.value.filter(
			(node) => !isCanvasGroupNode(node) && !node.hidden && !groupedMemberIds.has(node.id),
		);
		const groupBoxes = allNodes.value.filter(isCanvasGroupNode).map(getCurrentGroupBox);

		// Grouped members move with their group box after dagre runs.
		const regularNodes = source.filter(
			(node) => !isCanvasGroupNode(node) && !node.hidden && !groupedMemberIds.has(node.id),
		);

		const unitsWithStickies = attachCoveringStickies(
			groupUnits,
			externalStickyCandidates,
			blockingNodes,
			groupBoxes,
		);
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

	function getCurrentGroupBox(groupNode: GraphNode<CanvasGroupNodeData>): GroupBox {
		const frameRects = computeGroupFrameRects(groupNode.data.nodesRect);
		return {
			id: groupNode.id,
			box: groupNode.data.isCollapsed ? frameRects.collapsed : frameRects.expanded,
		};
	}

	/**
	 * Folds a sticky that covers exactly one group, and nothing else, into that
	 * group's layout unit. Dagre then reserves room for the sticky too, so it
	 * cannot land on a neighbour after the group moves.
	 */
	function attachCoveringStickies(
		groupUnits: CanvasLayoutGroupUnit[],
		externalStickyCandidates: CanvasLayoutNode[],
		blockingNodes: CanvasLayoutNode[],
		groupBoxes: GroupBox[],
	): CanvasLayoutGroupUnit[] {
		const stickies = externalStickyCandidates.filter(isStickyCanvasNode);
		if (stickies.length === 0 || groupUnits.length === 0) return groupUnits;

		const plainNodeBoxes = blockingNodes
			.filter((node) => !isStickyCanvasNode(node))
			.map((node) => boundingBoxFromCanvasNode(node));
		const groupUnitIds = new Set(groupUnits.map(({ node }) => node.id));

		const stickiesByUnitId = new Map<string, Array<{ id: string; box: BoundingBox }>>();
		for (const sticky of stickies) {
			const stickyBox = boundingBoxFromCanvasNode(sticky);
			if (plainNodeBoxes.some((box) => isCoveredBy(stickyBox, box))) continue;

			const coveredGroupIds = groupBoxes
				.filter(({ box }) => isCoveredBy(stickyBox, box))
				.map(({ id }) => id);
			if (coveredGroupIds.length !== 1) continue;

			const unitId = coveredGroupIds[0];
			if (!groupUnitIds.has(unitId)) continue;
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

		const members = memberIds
			.map((memberId) => findNode<CanvasNodeData>(memberId))
			.filter(isPresent);
		const hasAllMembersInScope = memberIds.every((memberId) => sourceNodeIds.has(memberId));

		if (groupData.isCollapsed) {
			// Some callers target the hidden members instead of the group chip.
			// Treat that as the whole collapsed group.
			if (!sourceNodeIds.has(groupNode.id) && !hasAllMembersInScope) return undefined;

			// The collapsed group chip already has the box dagre needs.
			const chipBox = computeGroupFrameRects(groupData.nodesRect).collapsed;
			const tidied = layoutGroupContent(members);
			return {
				node: groupNode,
				memberIds,
				stickyIds: [],
				groupBox: chipBox,
				boundingBox: chipBox,
				contentBox: chipBox,
				memberBoxesInFrame: tidied?.memberBoxesInFrame,
			};
		}

		if (!hasAllMembersInScope) return undefined;

		// A group is tidied on its own first; its frame then wraps that result.
		const tidied = layoutGroupContent(members);
		// Measure from the members' rect, not the title bar: that one is snapped to
		// the grid, and an offset "before" box would shift every run's anchor.
		const currentFrame = computeGroupFrameRects(groupData.nodesRect).expanded;
		const frame = tidied?.frame ?? currentFrame;
		const frameBox = {
			x: currentFrame.x,
			y: currentFrame.y,
			width: frame.width,
			height: frame.height,
		};
		const contentBox = tidied
			? {
					...tidied.contentBoxInFrame,
					x: frameBox.x + tidied.contentBoxInFrame.x,
					y: frameBox.y + tidied.contentBoxInFrame.y,
				}
			: frameBox;
		return {
			node: groupNode,
			memberIds,
			stickyIds: [],
			groupBox: frameBox,
			boundingBox: frameBox,
			contentBox,
			memberBoxesInFrame: tidied?.memberBoxesInFrame,
		};
	}

	/**
	 * Tidies a group's members in their own layout pass and sizes the frame
	 * from the result. A group left with only stickies has nothing to tidy and
	 * yields undefined.
	 */
	function layoutGroupContent(
		members: Array<GraphNode<CanvasNodeData>>,
	): CanvasLayoutGroupContent | undefined {
		const memberIdSet = new Set(members.map(({ id }) => id));
		const plainMembers: Array<GraphNode<CanvasNodeData>> = members.filter(
			(member) => !isStickyCanvasNode(member),
		);
		if (plainMembers.length === 0) return undefined;
		const stickyMembers = members.filter(isStickyCanvasNode);
		const boxesBefore = new Map(
			plainMembers.map((member) => [member.id, boundingBoxFromCanvasNode(member)]),
		);
		const memberEdges = getGroupContentConnections(members, memberIdSet);

		const placedById = placeNodes({ nodes: plainMembers, edges: memberEdges, groupUnits: [] });
		const positionedNodes = Object.entries(placedById).map(([id, boundingBox]) => ({
			id,
			boundingBox,
		}));

		const placedStickies = placeStickies(
			stickyMembers,
			positionedNodes,
			(stickyBox) =>
				new Set(
					[...boxesBefore].filter(([, box]) => isCoveredBy(stickyBox, box)).map(([id]) => id),
				),
		);
		// A sticky that covers no member keeps its place relative to the members' bounds.
		const placedStickyIds = new Set(placedStickies.map(({ id }) => id));
		const contentBefore = compositeBoundingBox([...boxesBefore.values()]);
		const contentPlaced = compositeBoundingBox(
			positionedNodes.map(({ boundingBox }) => boundingBox),
		);
		const looseStickies = stickyMembers
			.filter((sticky) => !placedStickyIds.has(sticky.id))
			.map((sticky) => {
				const box = boundingBoxFromCanvasNode(sticky);
				return {
					id: sticky.id,
					boundingBox: {
						...box,
						x: contentPlaced.x + (box.x - contentBefore.x),
						y: contentPlaced.y + (box.y - contentBefore.y),
					},
				};
			});

		const placed = [...positionedNodes, ...placedStickies, ...looseStickies];
		const nodesRect = compositeBoundingBox(placed.map(({ boundingBox }) => boundingBox));
		const frame = computeGroupFrameRects(nodesRect).expanded;
		const inFrame = (box: BoundingBox) => translateBox(box, { x: -frame.x, y: -frame.y });

		return {
			frame: { width: frame.width, height: frame.height },
			memberBoxesInFrame: new Map(placed.map(({ id, boundingBox }) => [id, inFrame(boundingBox)])),
			contentBoxInFrame: inFrame(nodesRect),
		};
	}

	function getGroupContentConnections(
		members: Array<GraphNode<CanvasNodeData>>,
		memberIdSet: Set<string>,
	): LayoutConnection[] {
		const memberIdByName = new Map(members.map((member) => [member.data.name, member.id]));
		const emittedConnectionKeys = new Set<string>();

		const addConnection = (connections: LayoutConnection[], connection: LayoutConnection) => {
			const key = JSON.stringify([connection.source, connection.target]);
			if (emittedConnectionKeys.has(key)) return;
			emittedConnectionKeys.add(key);
			connections.push(connection);
		};

		// Use rendered edges when VueFlow still has member-to-member edges.
		// Add canonical node connections for collapsed groups, whose edges point
		// at the group chip instead.
		const visibleConnections: LayoutConnection[] = [];
		for (const edge of allEdges.value) {
			if (memberIdSet.has(edge.source) && memberIdSet.has(edge.target)) {
				addConnection(visibleConnections, edge);
			}
		}

		const connections = visibleConnections;
		for (const member of members) {
			const outputConnections = member.data.connections[CanvasConnectionMode.Output];
			for (const outputPorts of Object.values(outputConnections)) {
				for (const portConnections of outputPorts) {
					for (const connection of portConnections ?? []) {
						const target = memberIdByName.get(connection.node);
						if (!target) continue;
						addConnection(connections, { source: member.id, target });
					}
				}
			}
		}

		return connections;
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

		if (node.data.render?.type === CanvasNodeRenderType.StickyNote) {
			return {
				width: node.data.render.options.width ?? DEFAULT_NODE_SIZE[0],
				height: node.data.render.options.height ?? DEFAULT_NODE_SIZE[1],
			};
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

	/**
	 * Re-seats stickies over the targets they covered: horizontally contained by
	 * the targets' new bounds, bottom-aligned with a little padding. Stickies
	 * that cover nothing are left out; callers decide what to do with them.
	 */
	function placeStickies(
		stickies: Array<GraphNode<CanvasNodeData>>,
		placementTargets: PositionedBox[],
		getCoveredTargetIds: (stickyBox: BoundingBox) => Set<string>,
		getPreferredX?: StickyPreferredXResolver,
	): PositionedBox[] {
		return stickies
			.map((sticky) => {
				const stickyBox = boundingBoxFromCanvasNode(sticky);
				const coveredTargetIds = getCoveredTargetIds(stickyBox);
				const coveredBoxesAfter = placementTargets
					.filter(({ id }) => coveredTargetIds.has(id))
					.map(({ boundingBox }) => boundingBox);

				if (coveredBoxesAfter.length === 0) return null;

				const coveredTargetsBoxAfter = compositeBoundingBox(coveredBoxesAfter);
				const preferredX = getPreferredX?.(stickyBox, coveredTargetIds);
				const bottomAlignedY =
					coveredTargetsBoxAfter.y +
					coveredTargetsBoxAfter.height -
					stickyBox.height +
					STICKY_BOTTOM_PADDING;
				return {
					id: sticky.id,
					coverageBox: withGridSnapTolerance(coveredTargetsBoxAfter),
					boundingBox: {
						x: preferredX ?? centerHorizontally(coveredTargetsBoxAfter, stickyBox),
						y: bottomAlignedY,
						height: stickyBox.height,
						width: stickyBox.width,
					},
				};
			})
			.filter(isPresent);
	}

	/**
	 * Places connectable nodes with dagre: connected components side by side,
	 * AI sub-nodes hanging under their parent, components stacked vertically.
	 * Group units enter as their reserved boxes. Returns a box per node id.
	 */
	function placeNodes({
		nodes,
		edges,
		groupUnits,
	}: CanvasLayoutTargetData): Record<string, BoundingBox> {
		const parentGraph = createDagreGraph({ nodes, edges, groupUnits });
		const nodeById: CanvasLayoutNodeDictionary = {};
		for (const node of nodes) {
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

		return boundingBoxByNodeId;
	}

	function layout(
		target: CanvasLayoutTarget,
		options: CanvasLayoutOptions = {},
	): CanvasLayoutResult {
		const { nodes, edges, groupUnits } = getTargetData(target, options);
		const groupUnitBoundingBoxes = new Map(
			groupUnits.map(({ node, boundingBox }) => [node.id, boundingBox]),
		);

		const nonStickyNodes = nodes.filter((node) => !isStickyCanvasNode(node));
		const boundingBoxBefore = boundingBoxFromCanvasNodes(nonStickyNodes, groupUnitBoundingBoxes);

		const boundingBoxByNodeId = placeNodes({ nodes: nonStickyNodes, edges, groupUnits });

		// Dagre centers a group's box on the connection axis, but the frame header,
		// padding and any attached sticky put the members off that center. Slide the
		// unit so the members sit on the axis, unless that would run into a neighbour.
		for (const groupUnit of groupUnits) {
			const unitBox = boundingBoxByNodeId[groupUnit.node.id];
			if (!unitBox) continue;

			const { contentBox } = groupUnit;
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

		const attachedStickies: PositionedBox[] = [];
		const groupBoxesAfter: PositionedBox[] = [];

		// Place group members into their unit's final box, then remove that box.
		// Tidied members take their layout-pass position inside the frame. The
		// rendered group position is derived from its members.
		for (const groupUnit of groupUnits) {
			const groupBox = boundingBoxByNodeId[groupUnit.node.id];
			if (!groupBox) continue;

			const delta = {
				x: groupBox.x - groupUnit.boundingBox.x,
				y: groupBox.y - groupUnit.boundingBox.y,
			};
			const frameOrigin = {
				x: groupUnit.groupBox.x + delta.x,
				y: groupUnit.groupBox.y + delta.y,
			};
			groupBoxesAfter.push({
				id: groupUnit.node.id,
				boundingBox: translateBox(groupUnit.groupBox, delta),
			});

			for (const memberId of groupUnit.memberIds) {
				const member = findNode<CanvasNodeData>(memberId);
				if (!member) continue;
				const box = boundingBoxFromCanvasNode(member);
				boundingBoxBeforeById.set(memberId, box);
				const tidiedBox = groupUnit.memberBoxesInFrame?.get(memberId);
				boundingBoxByNodeId[memberId] = tidiedBox
					? translateBox(tidiedBox, frameOrigin)
					: translateBox(box, delta);
			}

			for (const stickyId of groupUnit.stickyIds) {
				const sticky = findNode<CanvasNodeData>(stickyId);
				if (!sticky) continue;
				const box = boundingBoxFromCanvasNode(sticky);
				attachedStickies.push({ id: stickyId, boundingBox: translateBox(box, delta) });
			}

			delete boundingBoxByNodeId[groupUnit.node.id];
		}

		const positionedNodes = Object.entries(boundingBoxByNodeId).map(([id, boundingBox]) => ({
			id,
			boundingBox,
		}));
		const positionedStickyIds = new Set(
			positionedNodes
				.filter(({ id }) => {
					const node = findNode<CanvasNodeData>(id);
					return node ? isStickyCanvasNode(node) : false;
				})
				.map(({ id }) => id),
		);
		const positionedRegularNodes = positionedNodes.filter(({ id }) => !positionedStickyIds.has(id));
		const positionedMemberStickies = positionedNodes.filter(({ id }) =>
			positionedStickyIds.has(id),
		);

		const anchor = {
			x: boundingBoxAfter.x - boundingBoxBefore.x,
			y: boundingBoxAfter.y - boundingBoxBefore.y,
		};

		const stickies = nodes
			.filter(isStickyCanvasNode)
			.map((node) => findNode<CanvasNodeData>(node.id))
			.filter(isPresent);

		// A sticky covers a group when it covers the group frame or chip. Use that
		// box as a target so expanded-frame padding stays covered after layout.
		function getCoveredBoxIds(stickyBox: BoundingBox): Set<string> {
			const coveredBoxIds = new Set<string>();
			for (const [id, box] of boundingBoxBeforeById) {
				if (isCoveredBy(stickyBox, box)) coveredBoxIds.add(id);
			}
			for (const { node, memberIds, groupBox } of groupUnits) {
				if (isCoveredBy(stickyBox, groupBox)) {
					coveredBoxIds.add(node.id);
				} else if (intersects(stickyBox, groupBox)) {
					for (const memberId of memberIds) coveredBoxIds.delete(memberId);
				}
			}
			return coveredBoxIds;
		}
		const groupUnitIds = new Set(groupUnits.map(({ node }) => node.id));

		const positionedStickies = placeStickies(
			stickies,
			[...positionedNodes, ...groupBoxesAfter],
			getCoveredBoxIds,
			(stickyBox, coveredBoxIds) =>
				[...coveredBoxIds].some((id) => groupUnitIds.has(id)) ? stickyBox.x + anchor.x : undefined,
		).concat(attachedStickies, positionedMemberStickies);

		// Snap by the connection handle, not the top-left: dagre aligns node
		// centers, and snapping each corner on its own can leave nodes on one row
		// a grid cell apart. Handles sit at half the node height, except on the
		// agent card, where they sit on the nearest grid line so that the card's
		// top-left lands on the grid like every other node's.
		const finalNodes = positionedRegularNodes
			.map(({ id, boundingBox }) => {
				const handleX = boundingBox.width / 2;
				const handleY =
					findNode<CanvasNodeData>(id)?.data?.render?.type === CanvasNodeRenderType.Agent
						? getAgentNodeHandleOffset(boundingBox.height)
						: boundingBox.height / 2;
				return {
					id,
					x: snapToGrid(boundingBox.x - anchor.x + handleX) - handleX,
					y: snapToGrid(boundingBox.y - anchor.y + handleY) - handleY,
				};
			})
			// Stickies have no connections to keep straight, so their top-left
			// corner staying on the grid is the better-looking behavior.
			.concat(
				positionedStickies.map(({ id, boundingBox, coverageBox }) => {
					const node = findNode<CanvasNodeData>(id);
					const currentBox = node ? boundingBoxFromCanvasNode(node) : undefined;
					let x = snapToGrid(boundingBox.x - anchor.x);
					let y = snapToGrid(boundingBox.y - anchor.y);
					let width = boundingBox.width;
					let height = boundingBox.height;
					if (coverageBox) {
						const target = {
							x: coverageBox.x - anchor.x,
							y: coverageBox.y - anchor.y,
							width: coverageBox.width,
							height: coverageBox.height,
						};
						const containedX = snapAxisToContainTarget(target.x, target.width, x, width);
						const containedY = snapAxisToContainTarget(target.y, target.height, y, height);
						x = containedX.start;
						y = containedY.start;
						width = containedX.size;
						height = containedY.size;
					}
					const dimensionsChanged =
						currentBox !== undefined &&
						(width !== currentBox.width || height !== currentBox.height);
					return {
						id,
						x,
						y,
						...(dimensionsChanged ? { width, height } : {}),
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
