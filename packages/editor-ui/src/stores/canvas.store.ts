import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { INodeUi, XYPosition } from '@/Interface';
import {
	applyScale,
	getScaleFromWheelEventDelta,
	normalizeWheelEventDelta,
	scaleBigger,
	scaleReset,
	scaleSmaller,
} from '@/utils/canvasUtils';
import { MANUAL_TRIGGER_NODE_TYPE, START_NODE_TYPE } from '@/constants';
import type {
	BeforeStartEventParams,
	BrowserJsPlumbInstance,
	DragStopEventParams,
} from '@jsplumb/browser-ui';
import { newInstance } from '@jsplumb/browser-ui';
import type { Connection } from '@jsplumb/core';
import { MoveNodeCommand } from '@/models/history';
import {
	DEFAULT_PLACEHOLDER_TRIGGER_BUTTON,
	getMidCanvasPosition,
	getNewNodePosition,
	getZoomToFit,
	PLACEHOLDER_TRIGGER_NODE_SIZE,
	CONNECTOR_FLOWCHART_TYPE,
	GRID_SIZE,
	CONNECTOR_PAINT_STYLE_DEFAULT,
	CONNECTOR_PAINT_STYLE_PRIMARY,
	CONNECTOR_ARROW_OVERLAYS,
	getMousePosition,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_EXPANDED,
} from '@/utils/nodeViewUtils';
import type { PointXY } from '@jsplumb/util';
import { useLoadingService } from '@/composables/useLoadingService';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const historyStore = useHistoryStore();
	const sourceControlStore = useSourceControlStore();
	const loadingService = useLoadingService();

	const jsPlumbInstanceRef = ref<BrowserJsPlumbInstance>();
	const isDragging = ref<boolean>(false);
	const lastSelectedConnection = ref<Connection>();

	const newNodeInsertPosition = ref<XYPosition | null>(null);

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const triggerNodes = computed<INodeUi[]>(() =>
		nodes.value.filter(
			(node) => node.type === START_NODE_TYPE || nodeTypesStore.isTriggerNode(node.type),
		),
	);
	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter((node) => node.type.includes('langchain')),
	);
	const isDemo = ref<boolean>(false);
	const nodeViewScale = ref<number>(1);
	const canvasAddButtonPosition = ref<XYPosition>([1, 1]);
	const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
	const lastSelectedConnectionComputed = computed<Connection | undefined>(
		() => lastSelectedConnection.value,
	);

	watch(readOnlyEnv, (readOnly) => {
		if (jsPlumbInstanceRef.value) {
			jsPlumbInstanceRef.value.elementsDraggable = !readOnly;
		}
	});

	const setLastSelectedConnection = (connection: Connection | undefined) => {
		lastSelectedConnection.value = connection;
	};

	const setRecenteredCanvasAddButtonPosition = (offset?: XYPosition) => {
		const position = getMidCanvasPosition(nodeViewScale.value, offset ?? [0, 0]);

		position[0] -= PLACEHOLDER_TRIGGER_NODE_SIZE / 2;
		position[1] -= PLACEHOLDER_TRIGGER_NODE_SIZE / 2;

		canvasAddButtonPosition.value = getNewNodePosition(nodes.value, position);
	};

	const getPlaceholderTriggerNodeUI = (): INodeUi => {
		setRecenteredCanvasAddButtonPosition();

		return {
			id: uuid(),
			...DEFAULT_PLACEHOLDER_TRIGGER_BUTTON,
			position: canvasAddButtonPosition.value,
		};
	};

	const getAutoAddManualTriggerNode = (): INodeUi | null => {
		const manualTriggerNode = nodeTypesStore.getNodeType(MANUAL_TRIGGER_NODE_TYPE);

		if (!manualTriggerNode) {
			console.error('Could not find the manual trigger node');
			return null;
		}
		return {
			id: uuid(),
			name: manualTriggerNode.defaults.name?.toString() ?? manualTriggerNode.displayName,
			type: MANUAL_TRIGGER_NODE_TYPE,
			parameters: {},
			position: canvasAddButtonPosition.value,
			typeVersion: 1,
		};
	};

	const getNodesWithPlaceholderNode = (): INodeUi[] =>
		triggerNodes.value.length > 0 ? nodes.value : [getPlaceholderTriggerNodeUI(), ...nodes.value];

	const canvasPositionFromPagePosition = (position: XYPosition): XYPosition => {
		const sidebarWidth = isDemo.value
			? 0
			: uiStore.sidebarMenuCollapsed
				? SIDEBAR_WIDTH
				: SIDEBAR_WIDTH_EXPANDED;

		const relativeX = position[0] - sidebarWidth;
		const relativeY = isDemo.value
			? position[1]
			: position[1] - uiStore.bannersHeight - uiStore.headerHeight;

		return [relativeX, relativeY];
	};

	const setZoomLevel = (zoomLevel: number, offset: XYPosition) => {
		nodeViewScale.value = zoomLevel;
		jsPlumbInstanceRef.value?.setZoom(zoomLevel);
		uiStore.nodeViewOffsetPosition = offset;
	};

	const resetZoom = () => {
		const { scale, offset } = scaleReset({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
			origin: canvasPositionFromPagePosition([window.innerWidth / 2, window.innerHeight / 2]),
		});
		setZoomLevel(scale, offset);
	};

	const zoomIn = () => {
		const { scale, offset } = scaleBigger({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
			origin: canvasPositionFromPagePosition([window.innerWidth / 2, window.innerHeight / 2]),
		});
		setZoomLevel(scale, offset);
	};

	const zoomOut = () => {
		const { scale, offset } = scaleSmaller({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
			origin: canvasPositionFromPagePosition([window.innerWidth / 2, window.innerHeight / 2]),
		});
		setZoomLevel(scale, offset);
	};

	const zoomToFit = () => {
		const nodes = getNodesWithPlaceholderNode();
		if (!nodes.length) {
			// some unknown workflow executions
			return;
		}
		const { zoomLevel, offset } = getZoomToFit(nodes, !isDemo.value);
		setZoomLevel(zoomLevel, offset);
	};

	const wheelMoveWorkflow = (deltaX: number, deltaY: number, shiftKeyPressed = false) => {
		const offsetPosition = uiStore.nodeViewOffsetPosition;
		const nodeViewOffsetPositionX = offsetPosition[0] - (shiftKeyPressed ? deltaY : deltaX);
		const nodeViewOffsetPositionY = offsetPosition[1] - (shiftKeyPressed ? deltaX : deltaY);
		uiStore.nodeViewOffsetPosition = [nodeViewOffsetPositionX, nodeViewOffsetPositionY];
	};

	const wheelScroll = (e: WheelEvent) => {
		// Prevent browser back/forward gesture, default pinch to zoom etc.
		e.preventDefault();

		const { deltaX, deltaY } = normalizeWheelEventDelta(e);

		if (e.ctrlKey || e.metaKey) {
			const scaleFactor = getScaleFromWheelEventDelta(deltaY);
			const { scale, offset } = applyScale(scaleFactor)({
				scale: nodeViewScale.value,
				offset: uiStore.nodeViewOffsetPosition,
				origin: canvasPositionFromPagePosition(getMousePosition(e)),
			});
			setZoomLevel(scale, offset);
			return;
		}
		wheelMoveWorkflow(deltaX, deltaY, e.shiftKey);
	};

	function initInstance(container: Element) {
		// Make sure to clean-up previous instance if it exists
		if (jsPlumbInstanceRef.value) {
			jsPlumbInstanceRef.value.destroy();
			jsPlumbInstanceRef.value.reset();
			jsPlumbInstanceRef.value = undefined;
		}

		jsPlumbInstanceRef.value = newInstance({
			container,
			connector: CONNECTOR_FLOWCHART_TYPE,
			resizeObserver: false,
			endpoint: {
				type: 'Dot',
				options: { radius: 5 },
			},
			paintStyle: CONNECTOR_PAINT_STYLE_DEFAULT,
			hoverPaintStyle: CONNECTOR_PAINT_STYLE_PRIMARY,
			connectionOverlays: CONNECTOR_ARROW_OVERLAYS,
			elementsDraggable: !readOnlyEnv.value,
			dragOptions: {
				cursor: 'pointer',
				grid: { w: GRID_SIZE, h: GRID_SIZE },
				start: (params: BeforeStartEventParams) => {
					const draggedNode = params.drag.getDragElement();
					const nodeName = draggedNode.getAttribute('data-name');
					if (!nodeName) return;
					isDragging.value = true;

					const isSelected = uiStore.isNodeSelected(nodeName);

					if (params.e && !isSelected) {
						// Only the node which gets dragged directly gets an event, for all others it is
						// undefined. So check if the currently dragged node is selected and if not clear
						// the drag-selection.
						jsPlumbInstanceRef.value?.clearDragSelection();
						uiStore.resetSelectedNodes();
					}

					uiStore.addActiveAction('dragActive');
					return true;
				},
				stop: (params: DragStopEventParams) => {
					const draggedNode = params.drag.getDragElement();
					const nodeName = draggedNode.getAttribute('data-name');
					if (!nodeName) return;
					const nodeData = workflowStore.getNodeByName(nodeName);
					isDragging.value = false;
					if (uiStore.isActionActive('dragActive') && nodeData) {
						const moveNodes = uiStore.getSelectedNodes.slice();
						const selectedNodeNames = moveNodes.map((node: INodeUi) => node.name);
						if (!selectedNodeNames.includes(nodeData.name)) {
							// If the current node is not in selected add it to the nodes which
							// got moved manually
							moveNodes.push(nodeData);
						}

						if (moveNodes.length > 1) {
							historyStore.startRecordingUndo();
						}
						// This does for some reason just get called once for the node that got clicked
						// even though "start" and "drag" gets called for all. So lets do for now
						// some dirty DOM query to get the new positions till I have more time to
						// create a proper solution
						let newNodePosition: XYPosition;
						moveNodes.forEach((node: INodeUi) => {
							const element = document.getElementById(node.id);
							if (element === null) {
								return;
							}

							newNodePosition = [
								parseInt(element.style.left.slice(0, -2), 10),
								parseInt(element.style.top.slice(0, -2), 10),
							];

							const updateInformation = {
								name: node.name,
								properties: {
									position: newNodePosition,
								},
							};
							const oldPosition = node.position;
							if (oldPosition[0] !== newNodePosition[0] || oldPosition[1] !== newNodePosition[1]) {
								historyStore.pushCommandToUndo(
									new MoveNodeCommand(node.name, oldPosition, newNodePosition),
								);
								workflowStore.updateNodeProperties(updateInformation);
							}
						});
						if (moveNodes.length > 1) {
							historyStore.stopRecordingUndo();
						}
						if (uiStore.isActionActive('dragActive')) {
							uiStore.removeActiveAction('dragActive');
						}
					}
				},
				filter: '.node-description, .node-description .node-name, .node-description .node-subtitle',
			},
		});
		jsPlumbInstanceRef.value?.setDragConstrainFunction((pos: PointXY) => {
			const isReadOnly = uiStore.isReadOnlyView;
			if (isReadOnly) {
				// Do not allow to move nodes in readOnly mode
				return null;
			}
			return pos;
		});
	}

	const jsPlumbInstance = computed(() => jsPlumbInstanceRef.value as BrowserJsPlumbInstance);
	return {
		isDemo,
		nodeViewScale,
		canvasAddButtonPosition,
		newNodeInsertPosition,
		jsPlumbInstance,
		isLoading: loadingService.isLoading,
		aiNodes,
		lastSelectedConnection: lastSelectedConnectionComputed,
		setLastSelectedConnection,
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		setRecenteredCanvasAddButtonPosition,
		getNodesWithPlaceholderNode,
		canvasPositionFromPagePosition,
		setZoomLevel,
		resetZoom,
		zoomIn,
		zoomOut,
		zoomToFit,
		wheelScroll,
		initInstance,
		getAutoAddManualTriggerNode,
	};
});
