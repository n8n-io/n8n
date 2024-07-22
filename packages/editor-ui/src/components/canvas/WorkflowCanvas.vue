<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, toRef, useCssModule } from 'vue';
import type { Workflow } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { EventBus } from 'n8n-design-system';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(
	defineProps<{
		id?: string;
		workflow: IWorkflowDb;
		workflowObject: Workflow;
		fallbackNodes?: IWorkflowDb['nodes'];
		eventBus?: EventBus;
		readOnly?: boolean;
	}>(),
	{
		id: 'canvas',
		fallbackNodes: () => [],
	},
);

const $style = useCssModule();

const workflow = toRef(props, 'workflow');
const workflowObject = toRef(props, 'workflowObject');

const nodes = computed(() =>
	props.workflow.nodes.length > 0 ? props.workflow.nodes : props.fallbackNodes,
);
const connections = computed(() => props.workflow.connections);

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes,
	connections,
	workflowObject,
});
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.canvas">
			<Canvas
				v-if="workflow"
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
