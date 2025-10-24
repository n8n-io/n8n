import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	type Dimensions,
	type FitView,
	type GraphNode,
	type SetCenter,
	type SetViewport,
	type ViewportTransform,
	type ZoomTo,
} from '@vue-flow/core';
import { CanvasNodeRenderType, type CanvasNodeData } from '../canvas.types';
import { usePostHog } from '@/stores/posthog.store';
import { CANVAS_ZOOMED_VIEW_EXPERIMENT, NDV_IN_FOCUS_PANEL_EXPERIMENT } from '@/constants';

export const useExperimentalNdvStore = defineStore('experimentalNdv', () => {
	const workflowStore = useWorkflowsStore();
	const postHogStore = usePostHog();
	const isZoomedViewEnabled = computed(
		() =>
			postHogStore.getVariant(CANVAS_ZOOMED_VIEW_EXPERIMENT.name) ===
			CANVAS_ZOOMED_VIEW_EXPERIMENT.variant,
	);
	const isNdvInFocusPanelEnabled = computed(
		() =>
			postHogStore.getVariant(NDV_IN_FOCUS_PANEL_EXPERIMENT.name) ===
			NDV_IN_FOCUS_PANEL_EXPERIMENT.variant,
	);
	const maxCanvasZoom = computed(() => (isZoomedViewEnabled.value ? 2 : 4));

	const previousViewport = ref<ViewportTransform>();
	const collapsedNodes = shallowRef<Partial<Record<string, boolean>>>({});
	const nodeNameToBeFocused = ref<string | undefined>();
	const isMapperOpen = ref(false);

	function setNodeExpanded(nodeId: string, isExpanded?: boolean) {
		collapsedNodes.value = {
			...collapsedNodes.value,
			[nodeId]: isExpanded === undefined ? !collapsedNodes.value[nodeId] : !isExpanded,
		};
	}

	function collapseAllNodes() {
		collapsedNodes.value = workflowStore.allNodes.reduce<Partial<Record<string, boolean>>>(
			(acc, node) => {
				acc[node.id] = true;
				return acc;
			},
			{},
		);
	}

	function expandAllNodes() {
		collapsedNodes.value = {};
	}

	function isActive(canvasZoom: number) {
		return isZoomedViewEnabled.value && Math.abs(canvasZoom - maxCanvasZoom.value) < 0.000001;
	}

	function setNodeNameToBeFocused(nodeName: string) {
		nodeNameToBeFocused.value = nodeName;
	}

	function setMapperOpen(value: boolean) {
		isMapperOpen.value = value;
	}

	interface FocusNodeOptions {
		canvasViewport: ViewportTransform;
		canvasDimensions: Dimensions;
		setCenter: SetCenter;
	}

	function focusNode(
		node: GraphNode<CanvasNodeData>,
		{ canvasDimensions, canvasViewport, setCenter }: FocusNodeOptions,
	) {
		collapsedNodes.value = { ...collapsedNodes.value, [node.id]: false };

		const topMargin = 80; // pixels
		const nodeWidth = node.dimensions.width * (isActive(canvasViewport.zoom) ? 1 : 1.5);

		if (nodeNameToBeFocused.value === node.data.name) {
			nodeNameToBeFocused.value = undefined;
		}

		// Move the node to top center of the canvas
		void setCenter(
			node.position.x + nodeWidth / 2,
			node.position.y + (canvasDimensions.height * (1 / 2) - topMargin) / maxCanvasZoom.value,
			{
				duration: 200,
				zoom: maxCanvasZoom.value,
				interpolate: 'linear',
			},
		);
	}

	interface ToggleZoomModeOptions {
		canvasViewport: ViewportTransform;
		canvasDimensions: Dimensions;
		selectedNodes: Array<GraphNode<CanvasNodeData>>;
		setViewport: SetViewport;
		fitView: FitView;
		zoomTo: ZoomTo;
		setCenter: SetCenter;
	}

	function toggleZoomMode(options: ToggleZoomModeOptions) {
		if (isActive(options.canvasViewport.zoom)) {
			if (previousViewport.value === undefined) {
				void options.fitView({ duration: 200, interpolate: 'linear' });
				return;
			}

			void options.setViewport(previousViewport.value, { duration: 200, interpolate: 'linear' });
			return;
		}

		previousViewport.value = options.canvasViewport;

		const toFocus = options.selectedNodes
			.filter((node) => node.data.render.type === CanvasNodeRenderType.Default)
			.toSorted((a, b) =>
				a.position.y === b.position.y ? a.position.x - b.position.x : a.position.y - b.position.y,
			)[0];

		if (toFocus) {
			focusNode(toFocus, options);
			return;
		}

		void options.zoomTo(maxCanvasZoom.value, { duration: 200, interpolate: 'linear' });
	}

	return {
		isZoomedViewEnabled,
		isNdvInFocusPanelEnabled,
		maxCanvasZoom,
		previousZoom: computed(() => previousViewport.value),
		collapsedNodes: computed(() => collapsedNodes.value),
		nodeNameToBeFocused: computed(() => nodeNameToBeFocused.value),
		isMapperOpen: computed(() => isMapperOpen.value),
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
		toggleZoomMode,
		focusNode,
		setNodeNameToBeFocused,
		setMapperOpen,
	};
});
