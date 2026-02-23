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

const { onNodesInitialized, viewport, viewportRef, getNodes, fitBounds } = useVueFlow(props.id);

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
		const canvasElement = viewportRef.value;

		if (!canvasElement) {
			return;
		}

		// Find nodes by IDs
		const targetNodes = getNodes.value.filter((node) => ids.includes(node.id));

		if (targetNodes.length === 0) {
			return;
		}

		const insertionDone = onNodesInitialized(() => {
			// Get the current viewport after nodes are initialized
			const vp = viewport.value;
			const canvasWidth = canvasElement.clientWidth;
			const canvasHeight = canvasElement.clientHeight;

			// Get the rect of the newly added nodes
			const nodesRect = getRectOfNodes(targetNodes);

			// Check if nodes are visible in current viewport
			const screenX = nodesRect.x * vp.zoom + vp.x;
			const screenY = nodesRect.y * vp.zoom + vp.y;
			const screenWidth = nodesRect.width * vp.zoom;
			const screenHeight = nodesRect.height * vp.zoom;

			const isFullyVisible =
				screenX >= 0 &&
				screenY >= 0 &&
				screenX + screenWidth <= canvasWidth &&
				screenY + screenHeight <= canvasHeight;

			if (!isFullyVisible) {
				// Calculate viewport bounds in canvas coordinates
				const viewportRect = {
					x: -vp.x / vp.zoom,
					y: -vp.y / vp.zoom,
					width: canvasWidth / vp.zoom,
					height: canvasHeight / vp.zoom,
				};

				// Combine current viewport with nodes rect
				const minX = Math.min(viewportRect.x, nodesRect.x);
				const minY = Math.min(viewportRect.y, nodesRect.y);
				const maxX = Math.max(viewportRect.x + viewportRect.width, nodesRect.x + nodesRect.width);
				const maxY = Math.max(viewportRect.y + viewportRect.height, nodesRect.y + nodesRect.height);

				const combinedRect = {
					x: minX,
					y: minY,
					width: maxX - minX,
					height: maxY - minY,
				};

				void fitBounds(combinedRect, { padding: 0.15, duration: 100 });
			}

			props.eventBus.emit('nodes:select', { ids });
			insertionDone.off();
		});
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
