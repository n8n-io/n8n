import type { EdgeProps } from '@vue-flow/core';
import { getBezierPath, getSmoothStepPath, Position } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { NodeConnectionType } from 'n8n-workflow';

const EDGE_PADDING_BOTTOM = 130;
const EDGE_PADDING_X = 40;
const EDGE_BORDER_RADIUS = 16;
const HANDLE_SIZE = 20; // Required to avoid connection line glitching when initially interacting with the handle
const HANDLE_EDGE_OFFSET = 1; // Small offset to prevent edges overlapping handles

const isRightOfSourceHandle = (sourceX: number, targetX: number) => sourceX - HANDLE_SIZE > targetX;

export function getEdgeRenderData(
	props: Pick<
		EdgeProps,
		'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'
	>,
	{
		connectionType = NodeConnectionTypes.Main,
	}: {
		connectionType?: NodeConnectionType;
	} = {},
) {
	const { targetX, targetY, sourceX, sourceY, sourcePosition, targetPosition } = props;
	const isConnectorStraight = sourceY === targetY;

	// Adjust edge endpoints to prevent overlap with handle dots/diamonds
	const adjustedSourceX =
		sourcePosition === Position.Right
			? sourceX + HANDLE_EDGE_OFFSET
			: sourcePosition === Position.Left
				? sourceX - HANDLE_EDGE_OFFSET
				: sourceX;
	const adjustedSourceY =
		sourcePosition === Position.Bottom
			? sourceY + HANDLE_EDGE_OFFSET
			: sourcePosition === Position.Top
				? sourceY - HANDLE_EDGE_OFFSET
				: sourceY;

	const adjustedTargetX =
		targetPosition === Position.Left
			? targetX - HANDLE_EDGE_OFFSET
			: targetPosition === Position.Right
				? targetX + HANDLE_EDGE_OFFSET
				: targetX;
	const adjustedTargetY =
		targetPosition === Position.Top
			? targetY - HANDLE_EDGE_OFFSET
			: targetPosition === Position.Bottom
				? targetY + HANDLE_EDGE_OFFSET
				: targetY;

	if (!isRightOfSourceHandle(sourceX, targetX) || connectionType !== NodeConnectionTypes.Main) {
		const segment = getBezierPath({
			...props,
			sourceX: adjustedSourceX,
			sourceY: adjustedSourceY,
			targetX: adjustedTargetX,
			targetY: adjustedTargetY,
		});
		return {
			segments: [segment],
			labelPosition: [segment[1], segment[2]],
			isConnectorStraight,
		};
	}

	// Connection is backwards and the source is on the right side
	// -> We need to avoid overlapping the source node
	const firstSegmentTargetX = (sourceX + targetX) / 2;
	const firstSegmentTargetY = sourceY + EDGE_PADDING_BOTTOM;
	const firstSegment = getSmoothStepPath({
		sourceX: adjustedSourceX,
		sourceY: adjustedSourceY,
		targetX: firstSegmentTargetX,
		targetY: firstSegmentTargetY,
		sourcePosition,
		targetPosition: Position.Right,
		borderRadius: EDGE_BORDER_RADIUS,
		offset: EDGE_PADDING_X,
	});

	const secondSegment = getSmoothStepPath({
		sourceX: firstSegmentTargetX,
		sourceY: firstSegmentTargetY,
		targetX: adjustedTargetX,
		targetY: adjustedTargetY,
		sourcePosition: Position.Left,
		targetPosition,
		borderRadius: EDGE_BORDER_RADIUS,
		offset: EDGE_PADDING_X,
	});

	return {
		segments: [firstSegment, secondSegment],
		labelPosition: [firstSegmentTargetX, firstSegmentTargetY],
		isConnectorStraight,
	};
}
