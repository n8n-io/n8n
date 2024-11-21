import type { EdgeProps } from '@vue-flow/core';
import { getBezierPath, getSmoothStepPath, Position } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';

const EDGE_PADDING_BOTTOM = 130;
const EDGE_PADDING_X = 40;
const EDGE_BORDER_RADIUS = 16;
const HANDLE_SIZE = 20; // Required to avoid connection line glitching when initially interacting with the handle

const isRightOfSourceHandle = (sourceX: number, targetX: number) => sourceX - HANDLE_SIZE > targetX;

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
): string[] {
	const { targetX, targetY, sourceX, sourceY, sourcePosition, targetPosition } = props;

	if (!isRightOfSourceHandle(sourceX, targetX) || connectionType !== NodeConnectionType.Main) {
		const [segment] = getBezierPath(props);
		return [segment];
	}

	// Connection is backwards and the source is on the right side
	// -> We need to avoid overlapping the source node
	const firstSegmentTargetX = sourceX;
	const firstSegmentTargetY = sourceY + EDGE_PADDING_BOTTOM;
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

	const [secondSegmentPath] = getSmoothStepPath({
		sourceX: firstSegmentTargetX,
		sourceY: firstSegmentTargetY,
		targetX,
		targetY,
		sourcePosition: Position.Left,
		targetPosition,
		borderRadius: EDGE_BORDER_RADIUS,
		offset: EDGE_PADDING_X,
	});

	return [firstSegmentPath, secondSegmentPath];
}
