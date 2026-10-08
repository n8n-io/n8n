// Experiment cleanup (124_workflow_previews_above_assistant)
import { DEFAULT_NODE_SIZE, GRID_SIZE } from '@/app/utils/nodeViewUtils';

import type { WorkflowPreviewExample, WorkflowPreviewVisualization } from './types';

export const PREVIEW_SCALE = 0.75;
export const NODE_SIZE = DEFAULT_NODE_SIZE[0];
export const NODE_HALF_SIZE = NODE_SIZE / 2;
export const NODE_LABEL_HEIGHT = 26;
export const NODE_LABEL_OFFSET = NODE_LABEL_HEIGHT / 2;

export const CARD_NATIVE_WIDTH = 280;
const CARD_NATIVE_HEIGHT = 76;
const SLACK_MESSAGE_NATIVE_HEIGHT = 96;
const SPREADSHEET_NATIVE_HEIGHT = 104;
export const CARD_SCALE = NODE_SIZE / CARD_NATIVE_HEIGHT;
const CARD_WIDTH = CARD_NATIVE_WIDTH * CARD_SCALE;
const CARD_GAP = GRID_SIZE * 2;
const OUTPUT_CARD_GAP = GRID_SIZE;

const CARD_NATIVE_HEIGHTS: Record<WorkflowPreviewVisualization['type'], number> = {
	'salesforce-card': CARD_NATIVE_HEIGHT,
	'slack-message': SLACK_MESSAGE_NATIVE_HEIGHT,
	'invoice-spreadsheet': SPREADSHEET_NATIVE_HEIGHT,
};

export interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface CardBox {
	left: number;
	top: number;
	height: number;
}

export interface GraphBounds {
	minX: number;
	minY: number;
	width: number;
	height: number;
}

export interface PreviewLayout {
	triggerNodeIds: Set<string>;
	graphBounds: GraphBounds;
	inputCardBox?: CardBox;
	outputCardBoxes: CardBox[];
	stageBounds: Box;
}

function getCardHeight(type: WorkflowPreviewVisualization['type']) {
	return CARD_NATIVE_HEIGHTS[type] * CARD_SCALE;
}

function getTriggerNodeIds(example: WorkflowPreviewExample) {
	const targetNodeIds = new Set(example.connections.map((connection) => connection.target));
	return new Set(
		example.nodes.filter((node) => !targetNodeIds.has(node.id)).map((node) => node.id),
	);
}

function getGraphBounds(example: WorkflowPreviewExample): GraphBounds {
	const xs = example.nodes.map((node) => node.position.x);
	const ys = example.nodes.map((node) => node.position.y);
	const minX = Math.min(...xs) - NODE_HALF_SIZE;
	const minY = Math.min(...ys) - NODE_HALF_SIZE;
	const maxX = Math.max(...xs) + NODE_HALF_SIZE;
	const maxY = Math.max(...ys) + NODE_HALF_SIZE + NODE_LABEL_HEIGHT;
	return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function computePreviewLayout(example: WorkflowPreviewExample): PreviewLayout {
	const triggerNodeIds = getTriggerNodeIds(example);
	const graphBounds = getGraphBounds(example);
	const triggerNode = example.nodes.find((node) => triggerNodeIds.has(node.id)) ?? example.nodes[0];

	const toGraphX = (x: number) => x - graphBounds.minX;
	const toGraphY = (y: number) => y - graphBounds.minY;

	let inputCardBox: CardBox | undefined;
	if (example.inputVisualization && triggerNode) {
		const height = getCardHeight(example.inputVisualization.type);
		inputCardBox = {
			left: toGraphX(triggerNode.position.x - NODE_HALF_SIZE) - CARD_GAP - CARD_WIDTH,
			top: toGraphY(triggerNode.position.y) - height / 2,
			height,
		};
	}

	const outputCardBoxes = (example.outputVisualizations ?? []).map((output): CardBox => {
		const targetNode = example.nodes.find((node) => node.id === output.targetNodeId) ?? triggerNode;
		const height = getCardHeight(output.type);
		if (!targetNode) return { left: 0, top: 0, height };
		return {
			left: toGraphX(targetNode.position.x + NODE_HALF_SIZE) + CARD_GAP,
			top: toGraphY(targetNode.position.y) - height / 2,
			height,
		};
	});
	const byTop = [...outputCardBoxes].sort((a, b) => a.top - b.top);
	for (let i = 1; i < byTop.length; i++) {
		const previous = byTop[i - 1];
		const minTop = previous.top + previous.height + OUTPUT_CARD_GAP;
		if (byTop[i].top < minTop) byTop[i].top = minTop;
	}

	const boxes = [inputCardBox, ...outputCardBoxes].filter(
		(box): box is CardBox => box !== undefined,
	);
	const left = Math.min(0, ...boxes.map((box) => box.left));
	const top = Math.min(0, ...boxes.map((box) => box.top));
	const right = Math.max(graphBounds.width, ...boxes.map((box) => box.left + CARD_WIDTH));
	const bottom = Math.max(graphBounds.height, ...boxes.map((box) => box.top + box.height));
	const stageBounds = { left, top, width: right - left, height: bottom - top };

	return { triggerNodeIds, graphBounds, inputCardBox, outputCardBoxes, stageBounds };
}

export function getRenderScale(stageWidth: number, availableWidth: number) {
	return availableWidth > 0 ? Math.min(availableWidth / stageWidth, PREVIEW_SCALE) : PREVIEW_SCALE;
}

export function getReservedPreviewHeight(
	examples: readonly WorkflowPreviewExample[],
	availableWidth: number,
) {
	return Math.max(
		0,
		...examples.map((example) => {
			const { stageBounds } = computePreviewLayout(example);
			return stageBounds.height * getRenderScale(stageBounds.width, availableWidth);
		}),
	);
}
