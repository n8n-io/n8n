import { getStyleTokenValue } from '@/utils/htmlUtils';
import { isNumber } from '@/utils';
import { NODE_OUTPUT_DEFAULT_KEY, STICKY_NODE_TYPE, QUICKSTART_NOTE_NAME } from '@/constants';
import type { EndpointStyle, IBounds, INodeUi, XYPosition } from '@/Interface';
import type { ArrayAnchorSpec, ConnectorSpec, OverlaySpec, PaintStyle } from '@jsplumb/common';
import type { Endpoint, Connection } from '@jsplumb/core';
import { ConnectionEstablishedParams } from '@jsplumb/core';
import { N8nConnector } from '@/plugins/connectors/N8nCustomConnector';
import { closestNumberDivisibleBy } from '@/utils';
import type {
	IConnection,
	INode,
	ITaskData,
	INodeExecutionData,
	NodeInputConnections,
	INodeTypeDescription,
} from 'n8n-workflow';
import { EVENT_CONNECTION_MOUSEOUT, EVENT_CONNECTION_MOUSEOVER } from '@jsplumb/browser-ui';

/*
	Canvas constants and functions.
	These utils are not exported with main `utils`package because they need to be used
	on-demand (when jsplumb instance is ready) by components (mainly the NodeView).
*/

export const OVERLAY_DROP_NODE_ID = 'drop-add-node';
export const OVERLAY_MIDPOINT_ARROW_ID = 'midpoint-arrow';
export const OVERLAY_ENDPOINT_ARROW_ID = 'endpoint-arrow';
export const OVERLAY_RUN_ITEMS_ID = 'run-items-label';
export const OVERLAY_CONNECTION_ACTIONS_ID = 'connection-actions';
export const JSPLUMB_FLOWCHART_STUB = 26;
export const OVERLAY_INPUT_NAME_LABEL = 'input-name-label';
export const OVERLAY_INPUT_NAME_MOVED_CLASS = 'node-input-endpoint-label--moved';
export const OVERLAY_OUTPUT_NAME_LABEL = 'output-name-label';
export const GRID_SIZE = 20;

const MIN_X_TO_SHOW_OUTPUT_LABEL = 90;
const MIN_Y_TO_SHOW_OUTPUT_LABEL = 100;

export const NODE_SIZE = 100;
export const PLACEHOLDER_TRIGGER_NODE_SIZE = 100;
export const DEFAULT_START_POSITION_X = 180;
export const DEFAULT_START_POSITION_Y = 240;
export const HEADER_HEIGHT = 65;
export const SIDEBAR_WIDTH = 65;
export const INNER_SIDEBAR_WIDTH = 310;
export const SIDEBAR_WIDTH_EXPANDED = 200;
export const MAX_X_TO_PUSH_DOWNSTREAM_NODES = 300;
export const PUSH_NODES_OFFSET = NODE_SIZE * 2 + GRID_SIZE;
const LOOPBACK_MINIMUM = 140;
export const INPUT_UUID_KEY = '-input';
export const OUTPUT_UUID_KEY = '-output';
export const PLACEHOLDER_BUTTON = 'PlaceholderTriggerButton';

export const DEFAULT_PLACEHOLDER_TRIGGER_BUTTON = {
	name: 'Choose a Trigger...',
	type: PLACEHOLDER_BUTTON,
	typeVersion: 1,
	position: [],
	parameters: {
		height: PLACEHOLDER_TRIGGER_NODE_SIZE,
		width: PLACEHOLDER_TRIGGER_NODE_SIZE,
	},
};

export const CONNECTOR_FLOWCHART_TYPE: ConnectorSpec = {
	type: N8nConnector.type,
	options: {
		cornerRadius: 12,
		stub: JSPLUMB_FLOWCHART_STUB + 10,
		targetGap: 4,
		alwaysRespectStubs: false,
		loopbackVerticalLength: NODE_SIZE + GRID_SIZE, // height of vertical segment when looping
		loopbackMinimum: LOOPBACK_MINIMUM, // minimum length before flowchart loops around
		getEndpointOffset(endpoint: Endpoint) {
			const indexOffset = 10; // stub offset between different endpoints of same node
			const index = endpoint && endpoint.__meta ? endpoint.__meta.index : 0;
			const totalEndpoints = endpoint && endpoint.__meta ? endpoint.__meta.totalEndpoints : 0;

			const outputOverlay = getOverlay(endpoint, OVERLAY_OUTPUT_NAME_LABEL);
			const labelOffset =
				outputOverlay && outputOverlay.label && outputOverlay.label.length > 1 ? 10 : 0;
			const outputsOffset = totalEndpoints > 3 ? 24 : 0; // avoid intersecting plus

			return index * indexOffset + labelOffset + outputsOffset;
		},
	},
};

export const CONNECTOR_PAINT_STYLE_DEFAULT: PaintStyle = {
	stroke: getStyleTokenValue('--color-foreground-dark'),
	strokeWidth: 2,
	outlineWidth: 12,
	outlineStroke: 'transparent',
};

export const CONNECTOR_PAINT_STYLE_PULL: PaintStyle = {
	...CONNECTOR_PAINT_STYLE_DEFAULT,
	stroke: getStyleTokenValue('--color-foreground-xdark'),
};

export const CONNECTOR_PAINT_STYLE_PRIMARY = {
	...CONNECTOR_PAINT_STYLE_DEFAULT,
	stroke: getStyleTokenValue('--color-primary'),
};

export const CONNECTOR_ARROW_OVERLAYS: OverlaySpec[] = [
	{
		type: 'Arrow',
		options: {
			id: OVERLAY_ENDPOINT_ARROW_ID,
			location: 1,
			width: 12,
			foldback: 1,
			length: 10,
			visible: true,
		},
	},
	{
		type: 'Arrow',
		options: {
			id: OVERLAY_MIDPOINT_ARROW_ID,
			location: 0.5,
			width: 12,
			foldback: 1,
			length: 10,
			visible: false,
		},
	},
];

export const ANCHOR_POSITIONS: {
	[key: string]: {
		[key: number]: ArrayAnchorSpec[];
	};
} = {
	input: {
		1: [[0.01, 0.5, -1, 0]],
		2: [
			[0.01, 0.3, -1, 0],
			[0.01, 0.7, -1, 0],
		],
		3: [
			[0.01, 0.25, -1, 0],
			[0.01, 0.5, -1, 0],
			[0.01, 0.75, -1, 0],
		],
		4: [
			[0.01, 0.2, -1, 0],
			[0.01, 0.4, -1, 0],
			[0.01, 0.6, -1, 0],
			[0.01, 0.8, -1, 0],
		],
	},
	output: {
		1: [[0.99, 0.5, 1, 0]],
		2: [
			[0.99, 0.3, 1, 0],
			[0.99, 0.7, 1, 0],
		],
		3: [
			[0.99, 0.25, 1, 0],
			[0.99, 0.5, 1, 0],
			[0.99, 0.75, 1, 0],
		],
		4: [
			[0.99, 0.2, 1, 0],
			[0.99, 0.4, 1, 0],
			[0.99, 0.6, 1, 0],
			[0.99, 0.8, 1, 0],
		],
	},
};

export const getInputEndpointStyle = (
	nodeTypeData: INodeTypeDescription,
	color: string,
): EndpointStyle => ({
	width: 8,
	height: nodeTypeData && nodeTypeData.outputs.length > 2 ? 18 : 20,
	fill: getStyleTokenValue(color),
	stroke: getStyleTokenValue(color),
	lineWidth: 0,
});

export const getInputNameOverlay = (labelText: string): OverlaySpec => ({
	type: 'Custom',
	options: {
		id: OVERLAY_INPUT_NAME_LABEL,
		visible: true,
		create: (component: Endpoint) => {
			const label = document.createElement('div');
			label.innerHTML = labelText;
			label.classList.add('node-input-endpoint-label');
			return label;
		},
	},
});

export const getOutputEndpointStyle = (
	nodeTypeData: INodeTypeDescription,
	color: string,
): PaintStyle => ({
	strokeWidth: nodeTypeData && nodeTypeData.outputs.length > 2 ? 7 : 9,
	fill: getStyleTokenValue(color),
	outlineStroke: 'none',
});

export const getOutputNameOverlay = (labelText: string): OverlaySpec => ({
	type: 'Custom',
	options: {
		id: OVERLAY_OUTPUT_NAME_LABEL,
		visible: true,
		create: (component: Endpoint) => {
			const label = document.createElement('div');
			label.innerHTML = labelText;
			label.classList.add('node-output-endpoint-label');
			return label;
		},
	},
});

export const addOverlays = (connection: Connection, overlays: OverlaySpec[]) => {
	overlays.forEach((overlay: OverlaySpec) => {
		connection.addOverlay(overlay);
	});
};

export const getLeftmostTopNode = (nodes: INodeUi[]): INodeUi => {
	return nodes.reduce((leftmostTop, node) => {
		if (node.position[0] > leftmostTop.position[0] || node.position[1] > leftmostTop.position[1]) {
			return leftmostTop;
		}

		return node;
	});
};

export const getWorkflowCorners = (nodes: INodeUi[]): IBounds => {
	return nodes.reduce(
		(accu: IBounds, node: INodeUi) => {
			const hasCustomDimensions = [STICKY_NODE_TYPE, PLACEHOLDER_BUTTON].includes(node.type);
			const xOffset =
				hasCustomDimensions && isNumber(node.parameters.width) ? node.parameters.width : NODE_SIZE;
			const yOffset =
				hasCustomDimensions && isNumber(node.parameters.height)
					? node.parameters.height
					: NODE_SIZE;

			const x = node.position[0];
			const y = node.position[1];

			if (x < accu.minX) {
				accu.minX = x;
			}
			if (y < accu.minY) {
				accu.minY = y;
			}
			if (x + xOffset > accu.maxX) {
				accu.maxX = x + xOffset;
			}
			if (y + yOffset > accu.maxY) {
				accu.maxY = y + yOffset;
			}

			return accu;
		},
		{
			minX: nodes[0].position[0],
			minY: nodes[0].position[1],
			maxX: nodes[0].position[0],
			maxY: nodes[0].position[1],
		},
	);
};

export const getOverlay = (item: Connection | Endpoint, overlayId: string) => {
	try {
		return item.getOverlay(overlayId); // handle when _jsPlumb element is deleted
	} catch (e) {
		return null;
	}
};

export const showOverlay = (item: Connection | Endpoint, overlayId: string) => {
	const overlay = getOverlay(item, overlayId);
	if (overlay) {
		overlay.setVisible(true);
	}
};

export const hideOverlay = (item: Connection | Endpoint, overlayId: string) => {
	const overlay = getOverlay(item, overlayId);
	if (overlay) {
		overlay.setVisible(false);
	}
};

export const showOrHideMidpointArrow = (connection: Connection) => {
	if (!connection || !connection.endpoints || connection.endpoints.length !== 2) {
		return;
	}
	const hasItemsLabel = !!getOverlay(connection, OVERLAY_RUN_ITEMS_ID);

	const sourceEndpoint = connection.endpoints[0];
	const targetEndpoint = connection.endpoints[1];
	const sourcePosition = sourceEndpoint._anchor.computedPosition?.curX ?? 0;
	const targetPosition = targetEndpoint._anchor.computedPosition?.curX ?? sourcePosition + 1;

	const minimum = hasItemsLabel ? 150 : 0;
	const isBackwards = sourcePosition >= targetPosition;
	const isTooLong = Math.abs(sourcePosition - targetPosition) >= minimum;
	const isActionsOverlayHovered = getOverlay(
		connection,
		OVERLAY_CONNECTION_ACTIONS_ID,
	)?.component.isHover();
	const isConnectionHovered = connection.isHover();

	const arrow = getOverlay(connection, OVERLAY_MIDPOINT_ARROW_ID);
	const isArrowVisible =
		isBackwards &&
		isTooLong &&
		!isActionsOverlayHovered &&
		!isConnectionHovered &&
		!connection.instance.isConnectionBeingDragged;

	if (arrow) {
		arrow.setVisible(isArrowVisible);
		arrow.setLocation(hasItemsLabel ? 0.6 : 0.5);
		connection.instance.repaint(arrow.canvas);
	}
};

export const getConnectorLengths = (connection: Connection): [number, number] => {
	if (!connection.connector) {
		return [0, 0];
	}
	const bounds = connection.connector.bounds;
	const diffX = Math.abs(bounds.xmax - bounds.xmin);
	const diffY = Math.abs(bounds.ymax - bounds.ymin);

	return [diffX, diffY];
};

const isLoopingBackwards = (connection: Connection) => {
	const sourceEndpoint = connection.endpoints[0];
	const targetEndpoint = connection.endpoints[1];

	const sourcePosition = sourceEndpoint._anchor.computedPosition?.curX ?? 0;
	const targetPosition = targetEndpoint._anchor.computedPosition?.curX ?? 0;

	return targetPosition - sourcePosition < -1 * LOOPBACK_MINIMUM;
};

export const showOrHideItemsLabel = (connection: Connection) => {
	if (!connection?.connector) return;

	const overlay = getOverlay(connection, OVERLAY_RUN_ITEMS_ID);
	if (!overlay) return;

	const actionsOverlay = getOverlay(connection, OVERLAY_CONNECTION_ACTIONS_ID);
	const isActionsOverlayHovered = actionsOverlay?.component.isHover();

	if (isActionsOverlayHovered) {
		overlay.setVisible(false);
		return;
	}

	const [diffX, diffY] = getConnectorLengths(connection);
	const isHidden = diffX < MIN_X_TO_SHOW_OUTPUT_LABEL && diffY < MIN_Y_TO_SHOW_OUTPUT_LABEL;

	overlay.setVisible(!isHidden);
	const innerElement = overlay.canvas && overlay.canvas.querySelector('span');
	if (innerElement) {
		if (diffY === 0 || isLoopingBackwards(connection)) {
			innerElement.classList.add('floating');
		} else {
			innerElement.classList.remove('floating');
		}
	}
};

export const getIcon = (name: string): string => {
	if (name === 'trash') {
		return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-trash fa-w-14 Icon__medium_ctPPJ"><path data-v-66d5c7e2="" fill="currentColor" d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z" class=""></path></svg>';
	}

	if (name === 'plus') {
		return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus fa-w-14 Icon__medium_ctPPJ"><path data-v-301ed208="" fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path></svg>';
	}

	return '';
};

const canUsePosition = (position1: XYPosition, position2: XYPosition) => {
	if (Math.abs(position1[0] - position2[0]) <= 100) {
		if (Math.abs(position1[1] - position2[1]) <= 50) {
			return false;
		}
	}

	return true;
};

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
			if (!canUsePosition(node.position, targetPosition)) {
				conflictFound = true;
				break;
			}
		}

		if (conflictFound === true) {
			targetPosition[0] += movePosition[0];
			targetPosition[1] += movePosition[1];
		}
	} while (conflictFound === true);

	return targetPosition;
};

export const getMousePosition = (e: MouseEvent | TouchEvent): XYPosition => {
	// @ts-ignore
	const x =
		e.pageX !== undefined
			? e.pageX
			: e.touches && e.touches[0] && e.touches[0].pageX
			? e.touches[0].pageX
			: 0;
	// @ts-ignore
	const y =
		e.pageY !== undefined
			? e.pageY
			: e.touches && e.touches[0] && e.touches[0].pageY
			? e.touches[0].pageY
			: 0;

	return [x, y];
};

export const getRelativePosition = (
	x: number,
	y: number,
	scale: number,
	offset: XYPosition,
): XYPosition => {
	return [(x - offset[0]) / scale, (y - offset[1]) / scale];
};

export const getMidCanvasPosition = (scale: number, offset: XYPosition): XYPosition => {
	const { editorWidth, editorHeight } = getContentDimensions();

	return getRelativePosition(editorWidth / 2, (editorHeight - HEADER_HEIGHT) / 2, scale, offset);
};

export const getBackgroundStyles = (
	scale: number,
	offsetPosition: XYPosition,
	executionPreview: boolean,
) => {
	const squareSize = GRID_SIZE * scale;
	const dotSize = 1 * scale;
	const dotPosition = (GRID_SIZE / 2) * scale;

	if (executionPreview) {
		return {
			'background-image':
				'linear-gradient(135deg, #f9f9fb 25%, #ffffff 25%, #ffffff 50%, #f9f9fb 50%, #f9f9fb 75%, #ffffff 75%, #ffffff 100%)',
			'background-size': `${squareSize}px ${squareSize}px`,
			'background-position': `left ${offsetPosition[0]}px top ${offsetPosition[1]}px`,
		};
	}

	const styles: object = {
		'background-size': `${squareSize}px ${squareSize}px`,
		'background-position': `left ${offsetPosition[0]}px top ${offsetPosition[1]}px`,
	};
	if (squareSize > 10.5) {
		const dotColor = getStyleTokenValue('--color-canvas-dot');
		return {
			...styles,
			'background-image': `radial-gradient(circle at ${dotPosition}px ${dotPosition}px, ${dotColor} ${dotSize}px, transparent 0)`,
		};
	}

	return styles;
};

export const hideConnectionActions = (connection: Connection) => {
	connection.instance.setSuspendDrawing(true);
	hideOverlay(connection, OVERLAY_CONNECTION_ACTIONS_ID);
	showOrHideMidpointArrow(connection);
	showOrHideItemsLabel(connection);
	connection.instance.setSuspendDrawing(false);
	(connection.endpoints || []).forEach((endpoint) => {
		connection.instance.repaint(endpoint.element);
	});
};

export const showConnectionActions = (connection: Connection) => {
	showOverlay(connection, OVERLAY_CONNECTION_ACTIONS_ID);
	hideOverlay(connection, OVERLAY_RUN_ITEMS_ID);
	if (!getOverlay(connection, OVERLAY_RUN_ITEMS_ID)) {
		hideOverlay(connection, OVERLAY_MIDPOINT_ARROW_ID);
	}

	(connection.endpoints || []).forEach((endpoint) => {
		connection.instance.repaint(endpoint.element);
	});
};

export const getOutputSummary = (data: ITaskData[], nodeConnections: NodeInputConnections) => {
	const outputMap: {
		[sourceOutputIndex: string]: {
			[targetNodeName: string]: {
				[targetInputIndex: string]: {
					total: number;
					iterations: number;
					isArtificialRecoveredEventItem?: boolean;
				};
			};
		};
	} = {};

	data.forEach((run: ITaskData) => {
		if (!run.data || !run.data.main) {
			return;
		}

		run.data.main.forEach((output: INodeExecutionData[] | null, i: number) => {
			const sourceOutputIndex = i;

			// executionData that was recovered by recoverEvents in the CLI will have an isArtificialRecoveredEventItem property
			// to indicate that it was not part of the original executionData
			// we do not want to count these items in the summary
			// if (output?.[0]?.json?.isArtificialRecoveredEventItem) {
			// 	return outputMap;
			// }

			if (!outputMap[sourceOutputIndex]) {
				outputMap[sourceOutputIndex] = {};
			}

			if (!outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY]) {
				outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY] = {};
				outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY][0] = {
					total: 0,
					iterations: 0,
				};
			}

			const defaultOutput = outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY][0];
			defaultOutput.total += output ? output.length : 0;
			defaultOutput.iterations += output ? 1 : 0;

			if (!nodeConnections[sourceOutputIndex]) {
				return;
			}

			nodeConnections[sourceOutputIndex].map((connection: IConnection) => {
				const targetNodeName = connection.node;
				const targetInputIndex = connection.index;

				if (!outputMap[sourceOutputIndex][targetNodeName]) {
					outputMap[sourceOutputIndex][targetNodeName] = {};
				}

				if (!outputMap[sourceOutputIndex][targetNodeName][targetInputIndex]) {
					outputMap[sourceOutputIndex][targetNodeName][targetInputIndex] = {
						total: 0,
						iterations: 0,
					};
				}

				if (output?.[0]?.json?.isArtificialRecoveredEventItem) {
					outputMap[sourceOutputIndex][targetNodeName][
						targetInputIndex
					].isArtificialRecoveredEventItem = true;
					outputMap[sourceOutputIndex][targetNodeName][targetInputIndex].total = 0;
				} else {
					outputMap[sourceOutputIndex][targetNodeName][targetInputIndex].total += output
						? output.length
						: 0;
					outputMap[sourceOutputIndex][targetNodeName][targetInputIndex].iterations += output
						? 1
						: 0;
				}
			});
		});
	});

	return outputMap;
};

export const resetConnection = (connection: Connection) => {
	connection.removeOverlay(OVERLAY_RUN_ITEMS_ID);
	connection.removeClass('success');
	showOrHideMidpointArrow(connection);
	connection.setPaintStyle(CONNECTOR_PAINT_STYLE_DEFAULT);
};

export const recoveredConnection = (connection: Connection) => {
	connection.removeOverlay(OVERLAY_RUN_ITEMS_ID);
	connection.addClass('success');
	showOrHideMidpointArrow(connection);
	connection.setPaintStyle(CONNECTOR_PAINT_STYLE_PRIMARY);
};

export const getRunItemsLabel = (output: { total: number; iterations: number }): string => {
	let label = `${output.total}`;
	label = output.total > 1 ? `${label} items` : `${label} item`;
	label = output.iterations > 1 ? `${label} total` : label;
	return label;
};

export const addConnectionOutputSuccess = (
	connection: Connection,
	output: { total: number; iterations: number },
) => {
	connection.addClass('success');
	if (getOverlay(connection, OVERLAY_RUN_ITEMS_ID)) {
		connection.removeOverlay(OVERLAY_RUN_ITEMS_ID);
	}

	const overlay = connection.addOverlay({
		type: 'Custom',
		options: {
			id: OVERLAY_RUN_ITEMS_ID,
			create() {
				const container = document.createElement('div');
				const span = document.createElement('span');

				container.classList.add('connection-run-items-label');
				span.classList.add('floating');
				span.innerHTML = getRunItemsLabel(output);
				container.appendChild(span);
				return container;
			},
			location: 0.5,
		},
	});

	overlay.setVisible(true);
	showOrHideItemsLabel(connection);
	showOrHideMidpointArrow(connection);

	(connection.endpoints || []).forEach((endpoint) => {
		connection.instance.repaint(endpoint.element);
	});
};

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

export const getZoomToFit = (
	nodes: INodeUi[],
	addFooterPadding = true,
): { offset: XYPosition; zoomLevel: number } => {
	const { minX, minY, maxX, maxY } = getWorkflowCorners(nodes);
	const { editorWidth, editorHeight } = getContentDimensions();
	const footerHeight = addFooterPadding ? 200 : 100;

	const PADDING = NODE_SIZE * 4;

	const diffX = maxX - minX + PADDING;
	const scaleX = editorWidth / diffX;

	const diffY = maxY - minY + PADDING;
	const scaleY = editorHeight / diffY;

	const zoomLevel = Math.min(scaleX, scaleY, 1);

	let xOffset = minX * -1 * zoomLevel; // find top right corner
	xOffset += (editorWidth - (maxX - minX) * zoomLevel) / 2; // add padding to center workflow

	let yOffset = minY * -1 * zoomLevel; // find top right corner
	yOffset += (editorHeight - (maxY - minY + footerHeight) * zoomLevel) / 2; // add padding to center workflow

	return {
		zoomLevel,
		offset: [
			closestNumberDivisibleBy(xOffset, GRID_SIZE),
			closestNumberDivisibleBy(yOffset, GRID_SIZE),
		],
	};
};

export const showDropConnectionState = (connection: Connection, targetEndpoint?: Endpoint) => {
	if (connection?.connector) {
		const connector = connection.connector as N8nConnector;
		if (targetEndpoint) {
			connector.setTargetEndpoint(targetEndpoint);
		}
		connection.setPaintStyle(CONNECTOR_PAINT_STYLE_PRIMARY);
		hideOverlay(connection, OVERLAY_DROP_NODE_ID);
	}
};

export const showPullConnectionState = (connection: Connection) => {
	if (connection?.connector) {
		const connector = connection.connector as N8nConnector;
		connector.resetTargetEndpoint();
		connection.setPaintStyle(CONNECTOR_PAINT_STYLE_PULL);
		showOverlay(connection, OVERLAY_DROP_NODE_ID);
	}
};

export const resetConnectionAfterPull = (connection: Connection) => {
	if (connection?.connector) {
		const connector = connection.connector as N8nConnector;
		connector.resetTargetEndpoint();
		connection.setPaintStyle(CONNECTOR_PAINT_STYLE_DEFAULT);
	}
};

export const resetInputLabelPosition = (targetEndpoint: Connection | Endpoint) => {
	const inputNameOverlay = getOverlay(targetEndpoint, OVERLAY_INPUT_NAME_LABEL);
	if (inputNameOverlay) {
		targetEndpoint.instance.removeOverlayClass(inputNameOverlay, OVERLAY_INPUT_NAME_MOVED_CLASS);
	}
};

export const moveBackInputLabelPosition = (targetEndpoint: Endpoint) => {
	const inputNameOverlay = getOverlay(targetEndpoint, OVERLAY_INPUT_NAME_LABEL);
	if (inputNameOverlay) {
		targetEndpoint.instance.addOverlayClass(inputNameOverlay, OVERLAY_INPUT_NAME_MOVED_CLASS);
	}
};

export const addConnectionTestData = (
	source: HTMLElement,
	target: HTMLElement,
	el: HTMLElement | undefined,
) => {
	// TODO: Only do this if running in test mode
	const sourceNodeName = source.getAttribute('data-name')?.toString();
	const targetNodeName = target.getAttribute('data-name')?.toString();

	if (el && sourceNodeName && targetNodeName) {
		el.setAttribute('data-source-node', sourceNodeName);
		el.setAttribute('data-target-node', targetNodeName);
	}
};

export const addConnectionActionsOverlay = (
	connection: Connection,
	onDelete: Function,
	onAdd: Function,
) => {
	const overlay = connection.addOverlay({
		type: 'Custom',
		options: {
			id: OVERLAY_CONNECTION_ACTIONS_ID,
			create: (component: Connection) => {
				const div = document.createElement('div');
				const addButton = document.createElement('button');
				const deleteButton = document.createElement('button');

				div.classList.add(OVERLAY_CONNECTION_ACTIONS_ID);
				addConnectionTestData(component.source, component.target, div);
				addButton.classList.add('add');
				deleteButton.classList.add('delete');
				addButton.innerHTML = getIcon('plus');
				deleteButton.innerHTML = getIcon('trash');
				addButton.addEventListener('click', () => onAdd());
				deleteButton.addEventListener('click', () => onDelete());
				// We have to manually trigger connection mouse events because the overlay
				// is not part of the connection element
				div.addEventListener('mouseout', () =>
					connection.instance.fire(EVENT_CONNECTION_MOUSEOUT, component),
				);
				div.addEventListener('mouseover', () =>
					connection.instance.fire(EVENT_CONNECTION_MOUSEOVER, component),
				);
				div.appendChild(addButton);
				div.appendChild(deleteButton);
				return div;
			},
		},
	});

	overlay.setVisible(false);
};

export const getOutputEndpointUUID = (nodeId: string, outputIndex: number) => {
	return `${nodeId}${OUTPUT_UUID_KEY}${outputIndex}`;
};

export const getInputEndpointUUID = (nodeId: string, inputIndex: number) => {
	return `${nodeId}${INPUT_UUID_KEY}${inputIndex}`;
};

export const getFixedNodesList = (workflowNodes: INode[]) => {
	const nodes = [...workflowNodes];

	const leftmostTop = getLeftmostTopNode(nodes);

	const diffX = DEFAULT_START_POSITION_X - leftmostTop.position[0];
	const diffY = DEFAULT_START_POSITION_Y - leftmostTop.position[1];

	nodes.map((node) => {
		node.position[0] += diffX + NODE_SIZE * 2;
		node.position[1] += diffY;
	});

	return nodes;
};
