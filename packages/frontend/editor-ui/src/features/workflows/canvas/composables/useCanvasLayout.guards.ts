import type { Dimensions, GraphNode } from '@vue-flow/core';
import { STICKY_NODE_TYPE } from '@/app/constants';
import {
	CanvasNodeRenderType,
	isCanvasGroupNode,
	type CanvasLayoutNode,
	type CanvasLayoutNodeData,
	type CanvasNodeData,
} from '../canvas.types';

/** VueFlow reports 0x0 until a node is measured, so only positive sizes are usable. */
export function hasMeasuredDimensions(
	dimensions: Partial<Dimensions> | undefined,
): dimensions is Dimensions {
	return (dimensions?.width ?? 0) > 0 && (dimensions?.height ?? 0) > 0;
}

export function isStickyCanvasNode(node: CanvasLayoutNode): node is GraphNode<CanvasNodeData> {
	return !isCanvasGroupNode(node) && node.data?.type === STICKY_NODE_TYPE;
}

export function isCanvasNodeData(data: CanvasLayoutNodeData | undefined): data is CanvasNodeData {
	return data !== undefined && 'render' in data;
}

export function isAiParentNode(data: CanvasLayoutNodeData | undefined): data is CanvasNodeData {
	return Boolean(
		isCanvasNodeData(data) &&
			data.render?.type === CanvasNodeRenderType.Default &&
			data.render.options.configurable &&
			!data.render.options.configuration,
	);
}

export function isAiConfigNode(data: CanvasLayoutNodeData | undefined): data is CanvasNodeData {
	return Boolean(
		isCanvasNodeData(data) &&
			data.render?.type === CanvasNodeRenderType.Default &&
			data.render.options.configuration,
	);
}
