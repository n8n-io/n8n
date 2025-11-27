<script setup lang="ts">
import type { ContextMenuAction } from '@/features/shared/contextMenu/composables/useContextMenuItems';
import type { IWorkflowDb } from '@/Interface';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { getRectOfNodes, useVueFlow } from '@vue-flow/core';
import { throttledRef } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';
import { computed, ref, toRef, useCssModule, useTemplateRef } from 'vue';
import type { CanvasEventBusEvents } from '../canvas.types';
import { useCanvasMapping } from '../composables/useCanvasMapping';
import Canvas from './Canvas.vue';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(
	defineProps<{
		id?: string;
		workflow: IWorkflowDb;
		workflowObject: Workflow;
		fallbackNodes?: IWorkflowDb['nodes'];
		showFallbackNodes?: boolean;
		eventBus?: EventBus<CanvasEventBusEvents>;
		readOnly?: boolean;
		executing?: boolean;
		suppressInteraction?: boolean;
	}>(),
	{
		id: 'canvas',
		eventBus: () => createEventBus<CanvasEventBusEvents>(),
		fallbackNodes: () => [],
		showFallbackNodes: true,
		suppressInteraction: false,
	},
);

const canvasRef = useTemplateRef('canvas');
const $style = useCssModule();

const {
	onNodesInitialized,
	getSelectedNodes,
	getViewport,
	viewport,
	viewportRef,
	getNodes,
	fitBounds,
} = useVueFlow(props.id);

const workflow = toRef(props, 'workflow');
const workflowObject = toRef(props, 'workflowObject');

const nodes = computed(() => {
	return props.showFallbackNodes
		? [...props.workflow.nodes, ...props.fallbackNodes]
		: props.workflow.nodes;
});
const connections = computed(() => props.workflow.connections);

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes,
	connections,
	workflowObject,
});

const initialFitViewDone = ref(false); // Workaround for https://github.com/bcakmakoglu/vue-flow/issues/1636
const { off } = onNodesInitialized(() => {
	if (!initialFitViewDone.value) {
		props.eventBus.emit('fitView');
		initialFitViewDone.value = true;
		off();
	}
});

const mappedNodesThrottled = throttledRef(mappedNodes, 200);
const mappedConnectionsThrottled = throttledRef(mappedConnections, 200);

defineExpose({
	executeContextMenuAction: (action: ContextMenuAction, nodeIds: string[]) =>
		canvasRef.value?.executeContextMenuAction(action, nodeIds),
	ensureNodesAreVisible: (ids: string[]) => {
		const vp = viewport.value;
		const canvasElement = viewportRef.value;

		if (!canvasElement) {
			return;
		}

		// Find nodes by IDs
		const targetNodes = getNodes.value.filter((node) => ids.includes(node.id));

		if (targetNodes.length === 0) {
			return;
		}

		// Get canvas dimensions
		const canvasWidth = canvasElement.clientWidth;
		const canvasHeight = canvasElement.clientHeight;

		// Calculate current viewport bounds in canvas coordinates
		const currentViewportRect = {
			x: -vp.x / vp.zoom,
			y: -vp.y / vp.zoom,
			width: canvasWidth / vp.zoom,
			height: canvasHeight / vp.zoom,
		};

		// Get the rect of the newly added nodes
		const addedNodesRectRaw = getRectOfNodes(targetNodes);

		// Add padding around the added nodes rect (10% on each side)
		const padding = Math.max(addedNodesRectRaw.width, addedNodesRectRaw.height) * 0.1;
		const addedNodesRect = {
			x: addedNodesRectRaw.x - padding,
			y: addedNodesRectRaw.y - padding,
			width: addedNodesRectRaw.width + padding * 2,
			height: addedNodesRectRaw.height + padding * 2,
		};

		// Combine the current viewport with the added nodes to get the union
		const x = Math.min(currentViewportRect.x, addedNodesRect.x);
		const y = Math.min(currentViewportRect.y, addedNodesRect.y);
		const x2 = Math.max(
			currentViewportRect.x + currentViewportRect.width,
			addedNodesRect.x + addedNodesRect.width,
		);
		const y2 = Math.max(
			currentViewportRect.y + currentViewportRect.height,
			addedNodesRect.y + addedNodesRect.height,
		);
		const combinedRect = {
			x,
			y,
			width: x2 - x,
			height: y2 - y,
		};

		// Transform combined rectangle to screen coordinates for visibility check
		const screenRect = {
			x: addedNodesRect.x * vp.zoom + vp.x,
			y: addedNodesRect.y * vp.zoom + vp.y,
			width: addedNodesRect.width * vp.zoom,
			height: addedNodesRect.height * vp.zoom,
		};

		// Check if ALL nodes are fully visible within the viewport (not just intersecting)
		const isFullyVisible =
			screenRect.x >= 0 &&
			screenRect.y >= 0 &&
			screenRect.x + screenRect.width <= canvasWidth &&
			screenRect.y + screenRect.height <= canvasHeight;

		if (!isFullyVisible) {
			const insertionDone = onNodesInitialized(() => {
				void fitBounds(combinedRect, { padding: 0.1, duration: 300 });
				insertionDone.off();
			});
		}
	},
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="canvas-wrapper">
		<div id="canvas" :class="$style.canvas">
			<Canvas
				v-if="workflow"
				:id="id"
				ref="canvas"
				:nodes="executing ? mappedNodesThrottled : mappedNodes"
				:connections="executing ? mappedConnectionsThrottled : mappedConnections"
				:event-bus="eventBus"
				:read-only="readOnly"
				:executing="executing"
				:suppress-interaction="suppressInteraction"
				v-bind="$attrs"
			/>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.canvas {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
	align-items: stretch;
	justify-content: stretch;
}
</style>
