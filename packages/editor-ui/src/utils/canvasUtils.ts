import { MAIN_HEADER_TABS, VIEWS } from '@/constants';
import type { IZoomConfig } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ConnectionDetachedParams } from '@jsplumb/core';
import type { IConnection } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

/*
	Constants and utility functions mainly used by canvas store
	and components used to display workflow in node view.
	These are general-purpose functions that are exported
	with this module and should be used by importing from
	'@/utils/canvasUtils'.
*/

const SCALE_CHANGE_FACTOR = 1.25;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const SCROLL_ZOOM_SPEED = 0.01;
const MAX_WHEEL_DELTA = 32;

const clamp = (min: number, max: number) => (num: number) => {
	return Math.max(min, Math.min(max, num));
};

const clampScale = clamp(MIN_SCALE, MAX_SCALE);

export const applyScale =
	(scale: number) =>
	({ scale: initialScale, offset: [xOffset, yOffset], origin }: IZoomConfig): IZoomConfig => {
		const newScale = clampScale(initialScale * scale);
		const scaleChange = newScale / initialScale;

		const xOrigin = origin?.[0] ?? window.innerWidth / 2;
		const yOrigin = origin?.[1] ?? window.innerHeight / 2;

		// Calculate the new offsets based on the zoom origin
		xOffset = xOrigin - scaleChange * (xOrigin - xOffset);
		yOffset = yOrigin - scaleChange * (yOrigin - yOffset);

		return {
			scale: newScale,
			offset: [xOffset, yOffset],
		};
	};

export const scaleBigger = applyScale(SCALE_CHANGE_FACTOR);

export const scaleSmaller = applyScale(1 / SCALE_CHANGE_FACTOR);

export const scaleReset = (config: IZoomConfig): IZoomConfig => {
	return applyScale(1 / config.scale)(config);
};

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

export const getConnectionInfo = (
	connection: ConnectionDetachedParams,
): [IConnection, IConnection] | null => {
	const sourceInfo = connection.sourceEndpoint.parameters;
	const targetInfo = connection.targetEndpoint.parameters;
	const sourceNode = useWorkflowsStore().getNodeById(sourceInfo.nodeId);
	const targetNode = useWorkflowsStore().getNodeById(targetInfo.nodeId);

	if (sourceNode && targetNode) {
		return [
			{
				node: sourceNode.name,
				type: sourceInfo.type,
				index: sourceInfo.index,
			},
			{
				node: targetNode.name,
				type: targetInfo.type,
				index: targetInfo.index,
			},
		];
	}
	return null;
};

const clampWheelDelta = clamp(-MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);

export const normalizeWheelEventDelta = (event: WheelEvent): { deltaX: number; deltaY: number } => {
	const factorByMode: Record<number, number> = {
		[WheelEvent.DOM_DELTA_PIXEL]: 1,
		[WheelEvent.DOM_DELTA_LINE]: 8,
		[WheelEvent.DOM_DELTA_PAGE]: 24,
	};

	const factor = factorByMode[event.deltaMode] ?? 1;

	return {
		deltaX: clampWheelDelta(event.deltaX * factor),
		deltaY: clampWheelDelta(event.deltaY * factor),
	};
};

export const getScaleFromWheelEventDelta = (delta: number): number => {
	return Math.pow(2, -delta * SCROLL_ZOOM_SPEED);
};
