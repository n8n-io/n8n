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
	test: (ids: string[]) => {
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

		const nodeRect = getRectOfNodes(targetNodes);

		// Get canvas dimensions
		const canvasWidth = canvasElement.clientWidth;
		const canvasHeight = canvasElement.clientHeight;

		// Transform node rectangle from canvas coordinates to screen coordinates
		const screenRect = {
			x: nodeRect.x * vp.zoom + vp.x,
			y: nodeRect.y * vp.zoom + vp.y,
			width: nodeRect.width * vp.zoom,
			height: nodeRect.height * vp.zoom,
		};

		// Check if ALL nodes are fully visible within the viewport (not just intersecting)
		const isFullyVisible =
			screenRect.x >= 0 &&
			screenRect.y >= 0 &&
			screenRect.x + screenRect.width <= canvasWidth &&
			screenRect.y + screenRect.height <= canvasHeight;

		if (!isFullyVisible) {
			const insertionDone = onNodesInitialized(() => {
				props.eventBus.emit('fitView');
				props.eventBus.emit('nodes:select', { ids });
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
