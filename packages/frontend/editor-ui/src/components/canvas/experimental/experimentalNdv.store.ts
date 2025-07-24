import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import {
	type Dimensions,
	type FitView,
	type GraphNode,
	type SetCenter,
	type SetViewport,
	type ViewportTransform,
	type ZoomTo,
} from '@vue-flow/core';
import { CanvasNodeRenderType, type CanvasNodeData } from '@/types';

export const useExperimentalNdvStore = defineStore('experimentalNdv', () => {
	const workflowStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const isEnabled = computed(
		() =>
			!Number.isNaN(settingsStore.experimental__minZoomNodeSettingsInCanvas) &&
			settingsStore.experimental__minZoomNodeSettingsInCanvas > 0,
	);
	const maxCanvasZoom = computed(() =>
		isEnabled.value ? settingsStore.experimental__minZoomNodeSettingsInCanvas : 4,
	);

	const previousViewport = ref<ViewportTransform>();
	const collapsedNodes = shallowRef<Partial<Record<string, boolean>>>({});

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
		return isEnabled.value && Math.abs(canvasZoom - maxCanvasZoom.value) < 0.000001;
	}

	interface FocusNodeOptions {
		collapseOthers?: boolean;
		canvasViewport: ViewportTransform;
		canvasDimensions: Dimensions;
		setCenter: SetCenter;
	}

	function focusNode(
		node: GraphNode<CanvasNodeData>,
		{ collapseOthers = true, canvasDimensions, canvasViewport, setCenter }: FocusNodeOptions,
	) {
		collapsedNodes.value = collapseOthers
			? workflowStore.allNodes.reduce<Partial<Record<string, boolean>>>((acc, n) => {
					acc[n.id] = n.id !== node.id;
					return acc;
				}, {})
			: { ...collapsedNodes.value, [node.id]: false };

		const topMargin = 80; // pixels
		const nodeWidth = node.dimensions.width * (isActive(canvasViewport.zoom) ? 1 : 1.5);

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
			focusNode(toFocus, { ...options, collapseOthers: false });
			return;
		}

		void options.zoomTo(maxCanvasZoom.value, { duration: 200, interpolate: 'linear' });
	}

	return {
		isEnabled,
		maxCanvasZoom,
		previousZoom: computed(() => previousViewport.value),
		collapsedNodes: computed(() => collapsedNodes.value),
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
		toggleZoomMode,
		focusNode,
	};
});
