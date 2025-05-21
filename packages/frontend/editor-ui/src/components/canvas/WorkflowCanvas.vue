<script setup lang="ts">
import type { IWorkflowDb } from '@/Interface';
import Canvas from '@/components/canvas/Canvas.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { CanvasEventBusEvents } from '@/types';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { useVueFlow, type DefaultEdge } from '@vue-flow/core';
import { throttledRef } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';
import { computed, ref, toRef, useCssModule } from 'vue';

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

const showExpressionReference = ref(false);

const connectedExpressions = computed(() => {
	const nodeNameIdMap = new Map<string, string>();

	const expressionConnections = mappedNodes.value.reduce((acc, node) => {
		if (!node.data) return acc;

		const iNode = workflowObject.value.getNode(node.data.name);

		if (!iNode) return acc;
		nodeNameIdMap.set(node.data.name, node.id);

		const sourceNodeNames = new Set(workflowObject.value.getReferencedNodeNamesFromNode(iNode));

		acc.set(node.id, sourceNodeNames);
		return acc;
	}, new Map<string, Set<string>>());

	return expressionConnections
		.entries()
		.reduce<DefaultEdge[]>((acc, [targetNodeId, sourceNodeNames]) => {
			sourceNodeNames.values().forEach((nodeName) => {
				const id = nodeNameIdMap.get(nodeName);

				if (!id) return;

				acc.push({
					id: `${id}->${targetNodeId}`,
					source: id,
					target: targetNodeId,
					type: 'expression-edge',
					data: {
						source: {
							type: 'expression-connection',
						},
						references: [...sourceNodeNames.values()],
					},
					animated: true,
				});
			});
			return acc;
		}, []);
});

const allConnections = computed(() => {
	if (!showExpressionReference.value) {
		return mappedConnections.value;
	}
	return mappedConnections.value.concat(connectedExpressions.value);
});

const initialFitViewDone = ref(false); // Workaround for https://github.com/bcakmakoglu/vue-flow/issues/1636
onNodesInitialized(() => {
	if (!initialFitViewDone.value || props.showFallbackNodes) {
		props.eventBus.emit('fitView');
		initialFitViewDone.value = true;
	}
});

const mappedNodesThrottled = throttledRef(mappedNodes, 200);
const mappedConnectionsThrottled = throttledRef(allConnections, 200);
</script>

<template>
	<div :class="$style.wrapper" data-test-id="canvas-wrapper">
		<div :class="$style.canvas">
			<Canvas
				v-if="workflow"
				:id="id"
				:nodes="executing ? mappedNodesThrottled : mappedNodes"
				:connections="executing ? mappedConnectionsThrottled : allConnections"
				:event-bus="eventBus"
				:read-only="readOnly"
				v-bind="$attrs"
				@show-expression-reference="showExpressionReference = !showExpressionReference"
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
