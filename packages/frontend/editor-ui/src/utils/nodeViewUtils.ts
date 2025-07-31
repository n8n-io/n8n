import {
	AI_MCP_TOOL_NODE_TYPE,
	LIST_LIKE_NODE_OPERATIONS,
	MAIN_HEADER_TABS,
	NODE_MIN_INPUT_ITEMS_COUNT,
	NODE_POSITION_CONFLICT_ALLOWLIST,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	VIEWS,
} from '@/constants';
import type { INodeUi, XYPosition } from '@/Interface';
import type {
	AssignmentCollectionValue,
	IConnections,
	INode,
	INodeExecutionData,
	INodes,
	INodeTypeDescription,
	NodeHint,
} from 'n8n-workflow';
import { NodeHelpers, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';
import type { ViewportBoundaries } from '@/types';
import {
	getRectOfNodes,
	type Dimensions,
	type GraphNode,
	type Rect,
	type ViewportTransform,
} from '@vue-flow/core';
import * as workflowUtils from 'n8n-workflow/common';

/*
 * Canvas constants and functions
 */

export const GRID_SIZE = 16;

export const DEFAULT_NODE_SIZE: [number, number] = [GRID_SIZE * 6, GRID_SIZE * 6];
export const CONFIGURATION_NODE_RADIUS = (GRID_SIZE * 5) / 2;
export const CONFIGURATION_NODE_SIZE: [number, number] = [
	CONFIGURATION_NODE_RADIUS * 2,
	CONFIGURATION_NODE_RADIUS * 2,
]; // the node has circle shape
export const CONFIGURABLE_NODE_SIZE: [number, number] = [GRID_SIZE * 16, GRID_SIZE * 6];
export const DEFAULT_START_POSITION_X = GRID_SIZE * 11;
export const DEFAULT_START_POSITION_Y = GRID_SIZE * 15;
export const HEADER_HEIGHT = 65;
export const PUSH_NODES_OFFSET = DEFAULT_NODE_SIZE[0] * 2 + GRID_SIZE;
export const DEFAULT_VIEWPORT_BOUNDARIES: ViewportBoundaries = {
	xMin: -Infinity,
	yMin: -Infinity,
	xMax: Infinity,
	yMax: Infinity,
};

/**
 * Utility functions for returning nodes found at the edges of a group
 */

export const getLeftmostTopNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((leftmostTop, node) => {
		if (node.position[0] > leftmostTop.position[0] || node.position[1] > leftmostTop.position[1]) {
			return leftmostTop;
		}

		return node;
	}, nodes[0]);
};

export const getLeftMostNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((leftmost, node) => {
		if (node.position[0] < leftmost.position[0]) {
			return node;
		}

		return leftmost;
	}, nodes[0]);
};

export const getTopMostNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((topmost, node) => {
		if (node.position[1] < topmost.position[1]) {
			return node;
		}

		return topmost;
	}, nodes[0]);
};

export const getRightMostNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((rightmost, node) => {
		if (node.position[0] > rightmost.position[0]) {
			return node;
		}

		return rightmost;
	}, nodes[0]);
};

export const getBottomMostNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((bottommost, node) => {
		if (node.position[1] > bottommost.position[1]) {
			return node;
		}

		return bottommost;
	}, nodes[0]);
};

export const getNodesGroupSize = (nodes: INodeUi[]): [number, number] => {
	const leftMostNode = getLeftMostNode(nodes);
	const topMostNode = getTopMostNode(nodes);
	const rightMostNode = getRightMostNode(nodes);
	const bottomMostNode = getBottomMostNode(nodes);

	const width =
		Math.abs(rightMostNode.position[0] - leftMostNode.position[0]) + DEFAULT_NODE_SIZE[0];
	const height =
		Math.abs(bottomMostNode.position[1] - topMostNode.position[1]) + DEFAULT_NODE_SIZE[1];

	return [width, height];
};

/**
 * Checks if the given position is available for a new node
 */
const canUsePosition = (
	position1: XYPosition,
	position2: XYPosition,
	size: [number, number] = DEFAULT_NODE_SIZE,
) => {
	if (Math.abs(position1[0] - position2[0]) <= size[0]) {
		if (Math.abs(position1[1] - position2[1]) <= size[1]) {
			return false;
		}
	}

	return true;
};

/**
 * Returns the closest number divisible by the given number
 */
const closestNumberDivisibleBy = (inputNumber: number, divisibleBy: number): number => {
	const quotient = Math.ceil(inputNumber / divisibleBy);

	// 1st possible closest number
	const inputNumber1 = divisibleBy * quotient;

	// 2nd possible closest number
	const inputNumber2 =
		inputNumber * divisibleBy > 0 ? divisibleBy * (quotient + 1) : divisibleBy * (quotient - 1);

	// if true, then inputNumber1 is the required closest number
	if (Math.abs(inputNumber - inputNumber1) < Math.abs(inputNumber - inputNumber2)) {
		return inputNumber1;
	}

	// else inputNumber2 is the required closest number
	return inputNumber2;
};

export function snapPositionToGrid(position: XYPosition): XYPosition {
	return [
		closestNumberDivisibleBy(position[0], GRID_SIZE),
		closestNumberDivisibleBy(position[1], GRID_SIZE),
	];
}

/**
 * Returns the new position for a node based on the given position and the nodes in the workflow
 */
export const getNewNodePosition = (
	nodes: INodeUi[],
	initialPosition: XYPosition,
	{
		offset = [DEFAULT_NODE_SIZE[0] / 2, DEFAULT_NODE_SIZE[1] / 2],
		size = DEFAULT_NODE_SIZE,
		viewport = DEFAULT_VIEWPORT_BOUNDARIES,
		normalize = true,
	}: {
		offset?: XYPosition;
		size?: [number, number];
		viewport?: ViewportBoundaries;
		normalize?: boolean;
	} = {},
): XYPosition => {
	const resolvedOffset = snapPositionToGrid(offset);
	const resolvedPosition: XYPosition = snapPositionToGrid(initialPosition);

	if (normalize) {
		let conflictFound = false;
		let i, node;
		do {
			conflictFound = false;
			for (i = 0; i < nodes.length; i++) {
				node = nodes[i];

				if (!node || NODE_POSITION_CONFLICT_ALLOWLIST.includes(node.type)) {
					continue;
				}

				if (!canUsePosition(node.position, resolvedPosition, size)) {
					conflictFound = true;
					break;
				}
			}

			if (conflictFound) {
				resolvedPosition[0] += resolvedOffset[0];
				resolvedPosition[1] += resolvedOffset[1];
			}
		} while (conflictFound);

		if (resolvedPosition[0] < viewport.xMin + resolvedOffset[0]) {
			resolvedPosition[0] = viewport.xMin + resolvedOffset[0];
		}

		if (resolvedPosition[1] < viewport.yMin + resolvedOffset[1]) {
			resolvedPosition[1] = viewport.yMin + resolvedOffset[1];
		}

		if (resolvedPosition[0] > viewport.xMax - resolvedOffset[0]) {
			resolvedPosition[0] = viewport.xMax - size[0] - resolvedOffset[0];
		}

		if (resolvedPosition[1] > viewport.yMax - resolvedOffset[1]) {
			resolvedPosition[1] = viewport.yMax - size[1] - resolvedOffset[1];
		}
	}

	return resolvedPosition;
};

/**
 * Returns the position of a mouse or touch event
 */
export const getMousePosition = (event: MouseEvent | TouchEvent): XYPosition => {
	const x = (event && 'clientX' in event ? event.clientX : event?.touches?.[0]?.clientX) ?? 0;
	const y = (event && 'clientY' in event ? event.clientY : event?.touches?.[0]?.clientY) ?? 0;

	return [x, y];
};

/**
 * Returns the relative position of a point on the canvas
 */
export const getRelativePosition = (
	x: number,
	y: number,
	scale: number,
	offset: XYPosition,
): XYPosition => {
	return [(x - offset[0]) / scale, (y - offset[1]) / scale];
};

/**
 * Returns the width and height of the node view content
 */
const getContentDimensions = (): { editorWidth: number; editorHeight: number } => {
	let contentWidth = window.innerWidth;
	let contentHeight = window.innerHeight;
	const nodeViewRoot = document.getElementById('node-view-root');

	if (nodeViewRoot) {
		const contentBounds = nodeViewRoot.getBoundingClientRect();
		contentWidth = contentBounds.width;
		contentHeight = contentBounds.height;
	}
	return {
		editorWidth: contentWidth,
		editorHeight: contentHeight,
	};
};

/**
 * Returns the position of the canvas center
 */
export const getMidCanvasPosition = (scale: number, offset: XYPosition): XYPosition => {
	const { editorWidth, editorHeight } = getContentDimensions();

	return getRelativePosition(editorWidth / 2, (editorHeight - HEADER_HEIGHT) / 2, scale, offset);
};

/**
 * Normalize node positions based on the leftmost top node
 */
export const getNodesWithNormalizedPosition = <T extends { position: XYPosition }>(
	workflowNodes: T[],
): T[] => {
	const nodes = [...workflowNodes];

	if (nodes.length) {
		const leftmostTop = getLeftmostTopNode(nodes);

		const diffX = DEFAULT_START_POSITION_X - leftmostTop.position[0];
		const diffY = DEFAULT_START_POSITION_Y - leftmostTop.position[1];

		nodes.forEach((node) => {
			node.position[0] += diffX + DEFAULT_NODE_SIZE[0] * 2;
			node.position[1] += diffY;
		});
	}

	return nodes;
};

/**
 * Calculates the intersecting distances of the mouse event coordinates with the given element's boundaries,
 * adjusted by the specified offset.
 *
 * @param {Element} element - The DOM element to check against.
 * @param {MouseEvent | TouchEvent} mouseEvent - The mouse or touch event with the coordinates.
 * @param {number} offset - Offset to adjust the element's boundaries.
 * @returns { {x: number | null, y: number | null} | null } Object containing intersecting distances along x and y axes or null if no intersection.
 */
export function calculateElementIntersection(
	element: Element,
	mouseEvent: MouseEvent | TouchEvent,
	offset: number,
): { x: number | null; y: number | null } | null {
	const { top, left, right, bottom } = element.getBoundingClientRect();
	const [x, y] = getMousePosition(mouseEvent);

	let intersectX: number | null = null;
	let intersectY: number | null = null;

	if (x >= left - offset && x <= right + offset) {
		intersectX = Math.min(x - (left - offset), right + offset - x);
	}
	if (y >= top - offset && y <= bottom + offset) {
		intersectY = Math.min(y - (top - offset), bottom + offset - y);
	}

	if (intersectX === null && intersectY === null) return null;

	return { x: intersectX, y: intersectY };
}

/**
 * Checks if the mouse event coordinates intersect with the given element's boundaries,
 * adjusted by the specified offset.
 *
 * @param {Element} element - The DOM element to check against.
 * @param {MouseEvent | TouchEvent} mouseEvent - The mouse or touch event with the coordinates.
 * @param {number} offset - Offset to adjust the element's boundaries.
 * @returns {boolean} True if the mouse coordinates intersect with the element.
 */
export function isElementIntersection(
	element: Element,
	mouseEvent: MouseEvent | TouchEvent,
	offset: number,
): boolean {
	const intersection = calculateElementIntersection(element, mouseEvent, offset);

	if (intersection === null) {
		return false;
	}

	const isWithinVerticalBounds = intersection.y !== null;
	const isWithinHorizontalBounds = intersection.x !== null;

	return isWithinVerticalBounds && isWithinHorizontalBounds;
}

/**
 * Returns the node hints based on the node type and execution data
 */
export function getGenericHints({
	workflowNode,
	node,
	nodeType,
	nodeOutputData,
	hasMultipleInputItems,
	nodes,
	connections,
	hasNodeRun,
}: {
	workflowNode: INode;
	node: INodeUi;
	nodeType: INodeTypeDescription;
	nodeOutputData: INodeExecutionData[];
	hasMultipleInputItems: boolean;
	nodes: INodes;
	connections: IConnections;
	hasNodeRun: boolean;
}) {
	const nodeHints: NodeHint[] = [];

	// tools hints
	if (
		node?.type.toLocaleLowerCase().includes('tool') &&
		node?.type !== AI_MCP_TOOL_NODE_TYPE &&
		hasNodeRun
	) {
		const stringifiedParameters = JSON.stringify(workflowNode.parameters);
		if (!stringifiedParameters.includes('$fromAI')) {
			nodeHints.push({
				message:
					'No parameters are set up to be filled by AI. Click on the ✨ button next to a parameter to allow AI to set its value.',
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
			});
		}
	}

	// add limit reached hint
	if (hasNodeRun && workflowNode.parameters.limit) {
		if (nodeOutputData.length === workflowNode.parameters.limit) {
			nodeHints.push({
				message: `Limit of ${workflowNode.parameters.limit} items reached. There may be more items that aren't being returned. Tweak the 'Return All' or 'Limit' parameters to access more items.`,
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
			});
		}
	}

	// add Execute Once hint
	if (
		hasMultipleInputItems &&
		LIST_LIKE_NODE_OPERATIONS.includes((workflowNode.parameters.operation as string) || '')
	) {
		const executeOnce = workflowUtils.getNodeByName(nodes, node.name)?.executeOnce;
		if (!executeOnce) {
			nodeHints.push({
				message:
					'This node runs multiple times, once for each input item. Use ‘Execute Once’ in the node settings if you want to run it only once.',
				location: 'outputPane',
			});
		}
	}

	// add sendAndWait hint
	if (hasMultipleInputItems && workflowNode.parameters.operation === SEND_AND_WAIT_OPERATION) {
		const executeOnce = workflowUtils.getNodeByName(nodes, node.name)?.executeOnce;
		if (!executeOnce) {
			nodeHints.push({
				message: 'This action will run only once, for the first input item',
				location: 'outputPane',
			});
		}
	}

	// add expression in field name hint for Set node
	if (node.type === SET_NODE_TYPE && node.parameters.mode === 'manual') {
		const rawParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType,
		);

		const assignments =
			((rawParameters?.assignments as AssignmentCollectionValue) || {})?.assignments || [];
		const expressionInFieldName: number[] = [];

		for (const [index, assignment] of assignments.entries()) {
			if (assignment.name.startsWith('=')) {
				expressionInFieldName.push(index + 1);
			}
		}

		if (expressionInFieldName.length > 0) {
			nodeHints.push({
				message: `An expression is used in 'Fields to Set' in ${expressionInFieldName.length === 1 ? 'field' : 'fields'} ${expressionInFieldName.join(', ')}, did you mean to use it in the value instead?`,
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			});
		}
	}

	// Split In Batches setup hints
	if (node.type === SPLIT_IN_BATCHES_NODE_TYPE) {
		const firstNodesInLoop =
			workflowUtils.mapConnectionsByDestination(connections)[node.name]?.main[1] || [];

		if (!firstNodesInLoop.length) {
			nodeHints.push({
				message: "No nodes connected to the 'loop' output of this node",
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			});
		} else {
			for (const nodeInConnection of firstNodesInLoop || []) {
				const nodeChilds = workflowUtils.getChildNodes(connections, nodeInConnection.node) || [];
				if (!nodeChilds.includes(node.name)) {
					nodeHints.push({
						message:
							"The last node in the branch of the 'loop' output must be connected back to the input of this node to loop correctly",
						whenToDisplay: 'beforeExecution',
						location: 'outputPane',
					});
				}
			}
		}
	}

	return nodeHints;
}

/**
 * Generate vertical insertion offsets for the given node count
 *
 * 2 nodes -> [-nodeSize, nodeSize],
 * 3 nodes -> [-nodeSize - 2 * gridSize, 0, nodeSize + 2 * gridSize],
 * 4 nodes ->	[-2 * nodeSize - 2 * gridSize, -nodeSize, nodeSize, 2 * nodeSize + 2 * gridSize]
 * 5 nodes ->	[-2 * nodeSize - 2 * gridSize, -nodeSize, 0, nodeSize, 2 * nodeSize + 2 * gridSize]
 */
export function generateOffsets(nodeCount: number, nodeSize: number, gridSize: number) {
	const offsets = [];
	const half = Math.floor(nodeCount / 2);
	const isOdd = nodeCount % 2 === 1;

	if (nodeCount === 0) {
		return [];
	}

	for (let i = -half; i <= half; i++) {
		if (i === 0) {
			if (isOdd) {
				offsets.push(0);
			}
		} else {
			const offset = i * nodeSize + Math.sign(i) * (Math.abs(i) - (isOdd ? 0 : 1)) * gridSize;
			offsets.push(offset);
		}
	}

	return offsets;
}

/**
 * Get the current NodeView tab based on the route
 */
export const getNodeViewTab = (route: RouteLocation): string | null => {
	if (route.meta?.nodeView) {
		return MAIN_HEADER_TABS.WORKFLOW;
	} else if (
		[VIEWS.WORKFLOW_EXECUTIONS, VIEWS.EXECUTION_PREVIEW, VIEWS.EXECUTION_HOME]
			.map(String)
			.includes(String(route.name))
	) {
		return MAIN_HEADER_TABS.EXECUTIONS;
	}
	return null;
};

export function getBounds(
	{ x, y, zoom }: ViewportTransform,
	{ width, height }: Dimensions,
): ViewportBoundaries {
	const xMin = -x / zoom;
	const yMin = -y / zoom;
	const xMax = (width - x) / zoom;
	const yMax = (height - y) / zoom;

	return { xMin, yMin, xMax, yMax };
}

function addPadding({ x, y, width, height }: Rect, amount: number): Rect {
	return {
		x: x - amount,
		y: y - amount,
		width: width + amount * 2,
		height: height + amount * 2,
	};
}

export function updateViewportToContainNodes(
	viewport: ViewportTransform,
	dimensions: Dimensions,
	nodes: GraphNode[],
	padding: number,
): ViewportTransform {
	function computeDelta(start: number, end: number, min: number, max: number) {
		if (start >= min && end <= max) {
			// Both ends are already in the range, no need for adjustment
			return 0;
		}

		if (start < min) {
			if (end > max) {
				// Neither end is in the range, in this case we don't make
				// any adjustment (for now; we could adjust zoom to fit in viewport)
				return 0;
			}

			return min - start;
		}

		return max - end;
	}

	if (nodes.length === 0) {
		return viewport;
	}

	const zoom = viewport.zoom;
	const rect = addPadding(getRectOfNodes(nodes), padding / zoom);
	const { xMax, xMin, yMax, yMin } = getBounds(viewport, dimensions);
	const dx = computeDelta(rect.x, rect.x + rect.width, xMin, xMax);
	const dy = computeDelta(rect.y, rect.y + rect.height, yMin, yMax);

	return {
		x: viewport.x + dx * zoom,
		y: viewport.y + dy * zoom,
		zoom,
	};
}

export function calculateNodeSize(
	isConfiguration: boolean,
	isConfigurable: boolean,
	mainInputCount: number,
	mainOutputCount: number,
	nonMainInputCount: number,
	isExperimentalNdvActive: boolean,
): { width: number; height: number } {
	const maxVerticalHandles = Math.max(mainInputCount, mainOutputCount, 1);
	const height = DEFAULT_NODE_SIZE[1] + Math.max(0, maxVerticalHandles - 2) * GRID_SIZE * 2;
	const widthScale = isExperimentalNdvActive ? 1.5 : 1;

	if (isConfigurable) {
		const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, nonMainInputCount);

		return {
			// Configuration node has extra width so that its centered port aligns to the grid
			width:
				(CONFIGURATION_NODE_RADIUS * 2 +
					GRID_SIZE * ((isConfiguration ? 1 : 0) + (portCount - 1) * 3)) *
				widthScale,
			height: isConfiguration ? CONFIGURATION_NODE_SIZE[1] : height,
		};
	}

	if (isConfiguration) {
		return { width: CONFIGURATION_NODE_SIZE[0] * widthScale, height: CONFIGURATION_NODE_SIZE[1] };
	}

	return { width: DEFAULT_NODE_SIZE[0] * widthScale, height };
}
