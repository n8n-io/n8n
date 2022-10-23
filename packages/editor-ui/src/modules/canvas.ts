import { ref } from "vue";
import { defineStore } from "pinia";
import { jsPlumb } from 'jsplumb';
import { useRootStore } from "@/store";
import { INodeUi } from "@/Interface";
import * as CanvasHelpers from "@/views/canvasHelpers";
import '@/plugins/N8nCustomConnectorType';
import '@/plugins/PlusEndpointType';

export const useCanvasStore = defineStore('canvas', () => {
	const rootStore = useRootStore();
	const jsPlumbInstance = jsPlumb.getInstance();

	const nodeViewHtmlElement = ref<HTMLDivElement | null | undefined>(null);
	const nodeViewScale = ref<number>(1);
	const nodesWithPlaceholderNode = ref<INodeUi[]>([]);

	const setZoomLevel = (zoomLevel: number) => {
		nodeViewScale.value = zoomLevel;
		const element = nodeViewHtmlElement.value;
		if (!element) {
			return;
		}

		// https://docs.jsplumbtoolkit.com/community/current/articles/zooming.html
		const prependProperties = ['webkit', 'moz', 'ms', 'o'];
		const scaleString = 'scale(' + zoomLevel + ')';

		for (let i = 0; i < prependProperties.length; i++) {
			// @ts-ignore
			element.style[prependProperties[i] + 'Transform'] = scaleString;
		}
		element.style['transform'] = scaleString;

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
		if (nodesWithPlaceholderNode.value.length === 0) { // some unknown workflow executions
			return;
		}

		const {zoomLevel, offset} = CanvasHelpers.getZoomToFit(nodesWithPlaceholderNode.value);

		setZoomLevel(zoomLevel);
		rootStore.commit('setNodeViewOffsetPosition', {newOffset: offset});
	};

	return {
		jsPlumbInstance,
		nodeViewHtmlElement,
		nodeViewScale,
		nodesWithPlaceholderNode,
		setZoomLevel,
		resetZoom,
		zoomIn,
		zoomOut,
		zoomToFit,
	};
});
