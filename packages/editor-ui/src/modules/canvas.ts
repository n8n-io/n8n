import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { jsPlumb } from 'jsplumb';
import { v4 as uuid } from 'uuid';
import { useRootStore } from '@/store';
import { INodeUi, XYPosition } from '@/Interface';
import * as CanvasHelpers from '@/views/canvasHelpers';
import { START_NODE_TYPE } from '@/constants';
import '@/plugins/N8nCustomConnectorType';
import '@/plugins/PlusEndpointType';

export const useCanvasStore = defineStore('canvas', () => {
	const rootStore = useRootStore();
	const jsPlumbInstance = jsPlumb.getInstance();

	const nodes = computed<INodeUi[]>(() => rootStore.getters.allNodes);
	const triggerNodes = computed<INodeUi[]>(
		() => nodes.value.filter(
				node => node.type === START_NODE_TYPE || rootStore.getters['nodeTypes/isTriggerNode'](node.type),
			),
	);
	const isDemo = ref<boolean>(false);
	const nodeViewScale = ref<number>(1);
	const canvasAddButtonPosition = ref<XYPosition>([1, 1]);

	const setRecenteredCanvasAddButtonPosition = (offset?: XYPosition) => {
		const position = CanvasHelpers.getMidCanvasPosition(nodeViewScale.value, offset || [0, 0]);

		position[0] -= CanvasHelpers.PLACEHOLDER_TRIGGER_NODE_SIZE / 2;
		position[1] -= CanvasHelpers.PLACEHOLDER_TRIGGER_NODE_SIZE / 2;

		canvasAddButtonPosition.value = CanvasHelpers.getNewNodePosition(nodes.value, position);
	};

	const getPlaceholderTriggerNodeUI = (): INodeUi => {
		setRecenteredCanvasAddButtonPosition();

		return {
			id: uuid(),
			...CanvasHelpers.DEFAULT_PLACEHOLDER_TRIGGER_BUTTON,
			position: canvasAddButtonPosition.value,
		};
	};

	const getNodesWithPlaceholderNode = (): INodeUi[] =>
		triggerNodes.value.length > 0 ? nodes.value : [getPlaceholderTriggerNodeUI(), ...nodes.value];

	const setZoomLevel = (zoomLevel: number) => {
		nodeViewScale.value = zoomLevel;
		jsPlumbInstance.setZoom(zoomLevel);
	};

	const resetZoom = () => {
		const {scale, offset} = CanvasHelpers.scaleReset({
			scale: nodeViewScale.value,
			offset: rootStore.getters.getNodeViewOffsetPosition,
		});

		setZoomLevel(scale);
		rootStore.commit('setNodeViewOffsetPosition', {newOffset: offset});
	};

	const zoomIn = () => {
		const {scale, offset: [xOffset, yOffset]} = CanvasHelpers.scaleBigger({
			scale: nodeViewScale.value,
			offset: rootStore.getters.getNodeViewOffsetPosition,
		});

		setZoomLevel(scale);
		rootStore.commit('setNodeViewOffsetPosition', {newOffset: [xOffset, yOffset]});
	};

	const zoomOut = () => {
		const {scale, offset: [xOffset, yOffset]} = CanvasHelpers.scaleSmaller({
			scale: nodeViewScale.value,
			offset: rootStore.getters.getNodeViewOffsetPosition,
		});

		setZoomLevel(scale);
		rootStore.commit('setNodeViewOffsetPosition', {newOffset: [xOffset, yOffset]});
	};

	const zoomToFit = () => {
		const nodes = getNodesWithPlaceholderNode();
		if (!nodes.length) { // some unknown workflow executions
			return;
		}

		const {zoomLevel, offset} = CanvasHelpers.getZoomToFit(nodes, !isDemo.value);

		setZoomLevel(zoomLevel);
		rootStore.commit('setNodeViewOffsetPosition', {newOffset: offset});
	};

	return {
		jsPlumbInstance,
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
	};
});
