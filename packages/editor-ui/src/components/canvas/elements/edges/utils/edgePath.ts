import type { EdgeProps } from '@vue-flow/core';
import { getBezierPath, getSmoothStepPath, Position } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';

const EDGE_PADDING_TOP = 80;
const EDGE_PADDING_BOTTOM = 140;
const EDGE_PADDING_X = 40;
const EDGE_BORDER_RADIUS = 16;
const HANDLE_SIZE = 20; // Required to avoid connection line glitching when initially interacting with the handle

const isRightOfSourceHandle = (sourceX: number, targetX: number) => sourceX - HANDLE_SIZE > targetX;

const pathIntersectsNodes = (targetY: number, sourceY: number) =>
	Math.abs(targetY - sourceY) < EDGE_PADDING_BOTTOM;

export function getCustomPath(
	props: Pick<
		EdgeProps,
		'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'
	>,
	{
		connectionType = NodeConnectionType.Main,
	}: {
		connectionType?: NodeConnectionType;
	} = {},
) {
	const { targetX, targetY, sourceX, sourceY, sourcePosition, targetPosition } = props;
	const yDiff = targetY - sourceY;

	if (!isRightOfSourceHandle(sourceX, targetX) || connectionType !== NodeConnectionType.Main) {
		return getBezierPath(props);
	}

	// Connection is backwards and the source is on the right side
	// -> We need to avoid overlapping the source node
	if (pathIntersectsNodes(targetY, sourceY)) {
		const direction = yDiff < -EDGE_PADDING_BOTTOM || yDiff > 0 ? 'up' : 'down';
		const firstSegmentTargetX = sourceX;
		const firstSegmentTargetY =
			sourceY + (direction === 'up' ? -EDGE_PADDING_TOP : EDGE_PADDING_BOTTOM);
		const [firstSegmentPath] = getSmoothStepPath({
			sourceX,
			sourceY,
			targetX: firstSegmentTargetX,
			targetY: firstSegmentTargetY,
			sourcePosition,
			targetPosition: Position.Right,
			borderRadius: EDGE_BORDER_RADIUS,
			offset: EDGE_PADDING_X,
		});
		const path = getSmoothStepPath({
			sourceX: firstSegmentTargetX,
			sourceY: firstSegmentTargetY,
			targetX,
			targetY,
			sourcePosition: Position.Left,
			targetPosition,
			borderRadius: EDGE_BORDER_RADIUS,
			offset: EDGE_PADDING_X,
		});

		path[0] = firstSegmentPath + path[0];
		return path;
	}

	return getSmoothStepPath({
		...props,
		borderRadius: EDGE_BORDER_RADIUS,
	});
}
