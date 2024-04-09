<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowsStoreV2 } from '@/stores/workflows.store.v2';
import type { CanvasConnection, CanvasElement } from '@/types';
import { mapLegacyConnections, normalizeElementEndpoints } from '@/utils/canvasUtilsV2';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

const router = useRouter();
const route = useRoute();

const nodeTypesStore = useNodeTypesStore();
const workflowsStoreV2 = useWorkflowsStoreV2();

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStoreV2.workflowsById[workflowId.value]);

const connections = computed<CanvasConnection[]>(() =>
	mapLegacyConnections(workflow.value?.connections ?? [], workflow.value?.nodes ?? []),
);

const elements = computed<CanvasElement[]>(() => [
	...workflow.value?.nodes.map<CanvasElement>((node) => {
		const nodeType = nodeTypesStore.getNodeType(node.type);

		return {
			id: node.id,
			type: 'node', // @TODO Handle "n8n-nodes-base.stickyNote" type
			position: node.position,
			metadata: node,
			inputs: normalizeElementEndpoints(nodeType?.inputs ?? []),
			outputs: normalizeElementEndpoints(nodeType?.outputs ?? []),
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
