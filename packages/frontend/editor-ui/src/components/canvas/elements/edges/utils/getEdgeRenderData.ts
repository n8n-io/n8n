import type { EdgeProps, XYPosition } from '@vue-flow/core';
import { getBezierPath, getSmoothStepPath, Position } from '@vue-flow/core';
import { NodeConnectionPivotPoint, NodeConnectionTypes } from 'n8n-workflow';
import type { NodeConnectionType } from 'n8n-workflow';

const EDGE_PADDING_BOTTOM = 130;
const EDGE_PADDING_X = 40;
const EDGE_BORDER_RADIUS = 16;
const HANDLE_SIZE = 20; // Required to avoid connection line glitching when initially interacting with the handle

const isRightOfSourceHandle = (sourceX: number, targetX: number) => sourceX - HANDLE_SIZE > targetX;

export function getEdgeRenderData(
	props: Pick<
		EdgeProps,
		'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'
	>,
	{
		connectionType = NodeConnectionTypes.Main,
		pivots = [],
	}: {
		connectionType?: NodeConnectionType;
		pivots?: NodeConnectionPivotPoint[];
	} = {},
) {
	const { targetX, targetY, sourceX, sourceY, sourcePosition, targetPosition } = props;
	const isConnectorStraight = sourceY === targetY;

	if (pivots.length > 0) {
		const segmentsWithPivots = [...pivots, { id: 'target', position: [targetX, targetY] }].map(
			(point, index) => {
				const [currentX, currentY] = point.position;
				const prevX = pivots[index - 1]?.position[0] ?? sourceX;
				const prevY = pivots[index - 1]?.position[1] ?? sourceY;

				return {
					sourceX: prevX,
					sourceY: prevY,
					targetX: currentX,
					targetY: currentY,
					sourcePosition: Position.Right,
					targetPosition: Position.Left,
				};
			},
		);

		return {
			segments: segmentsWithPivots.map((pivot) =>
				getSmoothStepPath({
					sourceX: pivot.sourceX,
					sourceY: pivot.sourceY,
					targetX: pivot.targetX,
					targetY: pivot.targetY,
					sourcePosition: pivot.sourcePosition,
					targetPosition: pivot.targetPosition,
					borderRadius: EDGE_BORDER_RADIUS,
					offset: EDGE_PADDING_X,
				}),
			),
			labelPosition: [segmentsWithPivots[0].targetX, segmentsWithPivots[0].targetY],
			isConnectorStraight,
		};
	}

	if (!isRightOfSourceHandle(sourceX, targetX) || connectionType !== NodeConnectionTypes.Main) {
		const segment = getBezierPath(props);
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
		sourceX,
		sourceY,
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
		targetX,
		targetY,
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
