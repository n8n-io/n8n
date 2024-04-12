<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowsStoreV2 } from '@/stores/workflows.store.v2';
import type { CanvasConnection, CanvasElement, CanvasElementData } from '@/types';
import { mapLegacyConnections, normalizeElementEndpoints } from '@/utils/canvasUtilsV2';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { NodeHelpers } from 'n8n-workflow';

const route = useRoute();

const nodeTypesStore = useNodeTypesStore();
const workflowsStoreV2 = useWorkflowsStoreV2();

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStoreV2.workflowsById[workflowId.value]);
const workflowObject = computed(() => workflowsStoreV2.getWorkflowObject(workflowId.value));

const connections = computed<CanvasConnection[]>(() =>
	mapLegacyConnections(workflow.value?.connections ?? [], workflow.value?.nodes ?? []),
);

const elements = computed<CanvasElement[]>(() => [
	...workflow.value?.nodes.map<CanvasElement>((node) => {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		const workflowObjectNode = workflowObject.value.getNode(node.name);

		const inputs =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeInputs(
							workflowObject.value,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		const outputs =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeOutputs(
							workflowObject.value,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		const data: CanvasElementData = {
			type: node.type,
			typeVersion: node.typeVersion,
			inputs,
			outputs,
		};

		return {
			id: node.id,
			label: 'node',
			type: 'canvas-node',
			position: { x: node.position[0], y: node.position[1] },
			data,
		};
	}),
]);

onMounted(() => {
	void initialize();
});

async function initialize() {
	await nodeTypesStore.getNodeTypes();
	await workflowsStoreV2.fetchWorkflow(workflowId.value);
	console.log(workflow.value);
}
</script>

<template>
	<div id="node-view">
		<Canvas v-if="workflow" :elements="elements" :connections="connections" />
	</div>
</template>

<style lang="scss">
#node-view {
	display: block;
	position: relative;
	width: 100%;
	height: 100%;
	background-color: var(--color-canvas-background);
	overflow: hidden;
}
</style>
