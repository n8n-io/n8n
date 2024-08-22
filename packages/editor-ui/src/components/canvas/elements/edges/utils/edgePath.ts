import type { EdgeProps } from '@vue-flow/core';
import { getBezierPath, getSmoothStepPath, Position } from '@vue-flow/core';

const EDGE_PADDING_Y = 140;
const EDGE_PADDING_Y_TOP = 80;
const EDGE_BORDER_RADIUS = 8;
const EDGE_OFFSET = 40;
const HANDLE_SIZE = 16;

export function getCustomPath(
	props: Pick<
		EdgeProps,
		'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'
	>,
) {
	const { targetX, targetY, sourceX, sourceY, sourcePosition, targetPosition } = props;
	const xDiff = targetX - sourceX;
	const yDiff = targetY - sourceY;

	// Connection is backwards and the source is on the right side
	// -> We need to avoid overlapping the source node
	if (xDiff < -HANDLE_SIZE && sourcePosition === Position.Right) {
		const direction = yDiff < -EDGE_PADDING_Y || yDiff > 0 ? 'up' : 'down';
		const firstSegmentTargetX = sourceX;
		const firstSegmentTargetY =
			sourceY + (direction === 'up' ? -EDGE_PADDING_Y_TOP : EDGE_PADDING_Y);
		const [firstSegmentPath] = getSmoothStepPath({
			sourceX,
			sourceY,
			targetX: firstSegmentTargetX,
			targetY: firstSegmentTargetY,
			sourcePosition,
			targetPosition: Position.Right,
			borderRadius: EDGE_BORDER_RADIUS,
			offset: EDGE_OFFSET,
		});
		const path = getSmoothStepPath({
			sourceX: firstSegmentTargetX,
			sourceY: firstSegmentTargetY,
			targetX,
			targetY,
			sourcePosition: Position.Left,
			targetPosition,
			borderRadius: EDGE_BORDER_RADIUS,
			offset: EDGE_OFFSET,
		});

		path[0] = firstSegmentPath + path[0];
		return path;
	}

	return getBezierPath(props);
}
