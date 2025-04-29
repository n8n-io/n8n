import {
	AI_MCP_TOOL_NODE_TYPE,
	LIST_LIKE_NODE_OPERATIONS,
	MAIN_HEADER_TABS,
	NODE_POSITION_CONFLICT_ALLOWLIST,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	VIEWS,
} from '@/constants';
import type { INodeUi, XYPosition } from '@/Interface';
import type {
	AssignmentCollectionValue,
	INode,
	INodeExecutionData,
	INodeTypeDescription,
	NodeHint,
	Workflow,
} from 'n8n-workflow';
import { NodeHelpers, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

/*
 * Canvas constants and functions
 */

export const GRID_SIZE = 20;

export const NODE_SIZE = 100;
export const DEFAULT_NODE_SIZE = [100, 100];
export const CONFIGURATION_NODE_SIZE = [80, 80];
export const CONFIGURABLE_NODE_SIZE = [256, 100];
export const DEFAULT_START_POSITION_X = 180;
export const DEFAULT_START_POSITION_Y = 240;
export const HEADER_HEIGHT = 65;
export const MAX_X_TO_PUSH_DOWNSTREAM_NODES = 300;
export const PUSH_NODES_OFFSET = NODE_SIZE * 2 + GRID_SIZE;

/**
 * Returns the leftmost and topmost node from the given list of nodes
 */
export const getLeftmostTopNode = <T extends { position: XYPosition }>(nodes: T[]): T => {
	return nodes.reduce((leftmostTop, node) => {
		if (node.position[0] > leftmostTop.position[0] || node.position[1] > leftmostTop.position[1]) {
			return leftmostTop;
		}

		return node;
	}, nodes[0]);
};

/**
 * Checks if the given position is available for a new node
 */
const canUsePosition = (position1: XYPosition, position2: XYPosition) => {
	if (Math.abs(position1[0] - position2[0]) <= 100) {
		if (Math.abs(position1[1] - position2[1]) <= 50) {
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

/**
 * Returns the new position for a node based on the given position and the nodes in the workflow
 */
export const getNewNodePosition = (
	nodes: INodeUi[],
	newPosition: XYPosition,
	movePosition?: XYPosition,
): XYPosition => {
	const targetPosition: XYPosition = [...newPosition];

	targetPosition[0] = closestNumberDivisibleBy(targetPosition[0], GRID_SIZE);
	targetPosition[1] = closestNumberDivisibleBy(targetPosition[1], GRID_SIZE);

	if (!movePosition) {
		movePosition = [40, 40];
	}

	let conflictFound = false;
	let i, node;
	do {
		conflictFound = false;
		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];

			if (NODE_POSITION_CONFLICT_ALLOWLIST.includes(node.type)) {
				continue;
			}

			if (!canUsePosition(node.position, targetPosition)) {
				conflictFound = true;
				break;
			}
		}

		if (conflictFound) {
			targetPosition[0] += movePosition[0];
			targetPosition[1] += movePosition[1];
		}
	} while (conflictFound);

	return targetPosition;
};

/**
 * Returns the position of a mouse or touch event
 */
export const getMousePosition = (e: MouseEvent | TouchEvent): XYPosition => {
	// @ts-ignore
	const x = e.pageX !== undefined ? e.pageX : e.touches?.[0]?.pageX ? e.touches[0].pageX : 0;
	// @ts-ignore
	const y = e.pageY !== undefined ? e.pageY : e.touches?.[0]?.pageY ? e.touches[0].pageY : 0;

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
			node.position[0] += diffX + NODE_SIZE * 2;
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
	workflow,
	hasNodeRun,
}: {
	workflowNode: INode;
	node: INodeUi;
	nodeType: INodeTypeDescription;
	nodeOutputData: INodeExecutionData[];
	hasMultipleInputItems: boolean;
	workflow: Workflow;
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
		const executeOnce = workflow.getNode(node.name)?.executeOnce;
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
		const executeOnce = workflow.getNode(node.name)?.executeOnce;
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
		const { connectionsBySourceNode } = workflow;

		const firstNodesInLoop = connectionsBySourceNode[node.name]?.main[1] || [];

		if (!firstNodesInLoop.length) {
			nodeHints.push({
				message: "No nodes connected to the 'loop' output of this node",
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			});
		} else {
			for (const nodeInConnection of firstNodesInLoop || []) {
				const nodeChilds = workflow.getChildNodes(nodeInConnection.node) || [];
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
