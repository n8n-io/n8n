<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, ref, toRef, useCssModule } from 'vue';
import type { Workflow } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';
import type { CanvasEventBusEvents } from '@/types';
import { useVueFlow } from '@vue-flow/core';

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
	}>(),
	{
		id: 'canvas',
		eventBus: () => createEventBus<CanvasEventBusEvents>(),
		fallbackNodes: () => [],
		showFallbackNodes: true,
	},
);

const $style = useCssModule();

const { onNodesInitialized } = useVueFlow({ id: props.id });

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
onNodesInitialized(() => {
	if (!initialFitViewDone.value || props.showFallbackNodes) {
		props.eventBus.emit('fitView');
		initialFitViewDone.value = true;
	}
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="canvas-wrapper">
		<div :class="$style.canvas">
			<Canvas
				v-if="workflow"
				:id="id"
				:nodes="mappedNodes"
				:connections="mappedConnections"
				:event-bus="eventBus"
				:read-only="readOnly"
				v-bind="$attrs"
			/>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: block;
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
}
</style>
