import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import normalizeWheel from 'normalize-wheel';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useUIStore } from '@/stores/ui';
import { INodeUi, XYPosition } from '@/Interface';
import {
	scaleBigger,
	scaleReset,
	scaleSmaller,
} from '@/utils';
import { START_NODE_TYPE } from '@/constants';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { newInstance as newJsPlumbInstance } from "@jsplumb/browser-ui";
import { N8nPlusEndpointHandler } from '@/plugins/endpoints/N8nPlusEndpointType';
import * as N8nPlusEndpointRenderer from '@/plugins/endpoints/N8nPlusEndpointRenderer';
import { N8nConnector } from '@/plugins/connectors/N8nCustomConnector';
import { EndpointFactory, Connectors } from '@jsplumb/core';
//
// import '@/plugins/N8nCustomConnectorType';
// import '@/plugins/PlusEndpointType';
// import * as jsPlumbBrowserUI from "@jsplumb/browser-ui";
// import '@/plugins/N8nCustomConnectorType';
import { DEFAULT_PLACEHOLDER_TRIGGER_BUTTON, getMidCanvasPosition, getNewNodePosition, getZoomToFit, PLACEHOLDER_TRIGGER_NODE_SIZE, CONNECTOR_FLOWCHART_TYPE } from '@/utils/nodeViewUtils';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	console.log('Before');
	const newInstance = ref<BrowserJsPlumbInstance>();
	// console.log("🚀 ~ file: canvas.ts ~ line 21 ~ useCanvasStore ~ jsPlumbInstanceNew", jsPlumbInstanceNew);
	// const jsPlumbInstance = jsPlumb.getInstance();

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const triggerNodes = computed<INodeUi[]>(
		() => nodes.value.filter(
				node => node.type === START_NODE_TYPE || nodeTypesStore.isTriggerNode(node.type),
			),
	);
	const isDemo = ref<boolean>(false);
	const nodeViewScale = ref<number>(1);
	const canvasAddButtonPosition = ref<XYPosition>([1, 1]);

	Connectors.register(N8nConnector.type, N8nConnector);
	// N8nPlusEndpointRenderer.register();
	// EndpointFactory.registerHandler(N8nPlusEndpointHandler);

	const setRecenteredCanvasAddButtonPosition = (offset?: XYPosition) => {
		const position = getMidCanvasPosition(nodeViewScale.value, offset || [0, 0]);

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

	const getNodesWithPlaceholderNode = (): INodeUi[] =>
		triggerNodes.value.length > 0 ? nodes.value : [getPlaceholderTriggerNodeUI(), ...nodes.value];

	const setZoomLevel = (zoomLevel: number, offset: XYPosition) => {
		nodeViewScale.value = zoomLevel;
		// jsPlumbInstance.setZoom(zoomLevel);
		uiStore.nodeViewOffsetPosition = offset;
	};

	const resetZoom = () => {
		const {scale, offset} = scaleReset({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomIn = () => {
		const {scale, offset} = scaleBigger({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomOut = () => {
		const {scale, offset} = scaleSmaller({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomToFit = () => {
		const nodes = getNodesWithPlaceholderNode();
		if (!nodes.length) { // some unknown workflow executions
			return;
		}
		const {zoomLevel, offset} = getZoomToFit(nodes, !isDemo.value);
		setZoomLevel(zoomLevel, offset);
	};

	const wheelMoveWorkflow = (e: WheelEvent) => {
		const normalized = normalizeWheel(e);
		const offsetPosition = uiStore.nodeViewOffsetPosition;
		const nodeViewOffsetPositionX = offsetPosition[0] - (e.shiftKey ? normalized.pixelY : normalized.pixelX);
		const nodeViewOffsetPositionY = offsetPosition[1] - (e.shiftKey ? normalized.pixelX : normalized.pixelY);
		uiStore.nodeViewOffsetPosition = [nodeViewOffsetPositionX, nodeViewOffsetPositionY];
	};

	const wheelScroll = (e: WheelEvent) => {
		//* Control + scroll zoom
		if (e.ctrlKey) {
			if (e.deltaY > 0) {
				zoomOut();
			} else {
				zoomIn();
			}

			e.preventDefault();
			return;
		}
		wheelMoveWorkflow(e);
	};

	function initInstance(container: Element) {
		newInstance.value = newJsPlumbInstance({
			container,
			connector: CONNECTOR_FLOWCHART_TYPE,
			dragOptions: {
				// drag(params) {
				// 		console.log("🚀 ~ file: NodeView.vue:3314 ~ drag ~ params", params);
				// },
				// beforeStart(params) {
				// 	console.log("🚀 ~ file: NodeView.vue:3314 ~ beforeStart ~ params", params);
				// },
				// stop(params) {
				// 	console.log("🚀 ~ file: NodeView.vue:3314 ~ stop ~ params", params);
				// },
				grid: {w: 20, h: 20},
			},
		});
		window.__plumbInstance = () => newInstance.value;
	}
	return {
		// jsPlumbInstance,
		// jsPlumbInstanceNew,
		isDemo,
		nodeViewScale,
		canvasAddButtonPosition,
		setRecenteredCanvasAddButtonPosition,
		getNodesWithPlaceholderNode,
		setZoomLevel,
		resetZoom,
		zoomIn,
		zoomOut,
		zoomToFit,
		wheelScroll,
		initInstance,
		newInstance,
	};
});
