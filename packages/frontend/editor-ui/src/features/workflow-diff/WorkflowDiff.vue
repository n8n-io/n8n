<script setup lang="ts">
import type { IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/api/workflows';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnection, CanvasNode } from '@/types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';
import { ref } from 'vue';

const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

nodeTypesStore.getNodeTypes();

async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
	const workflowData = await getWorkflow(rootStore.restApiContext, id);
	return workflowData;
}

const props = defineProps<{
	sourceWorkflowId: string;
	targetWorkflowId: string;
}>();

const { state: sourceWorkflow } = useAsyncState<
	| {
			workflow: IWorkflowDb;
			workflowObject: Workflow;
			nodes: CanvasNode[];
			connections: CanvasConnection[];
	  }
	| undefined
>(
	async () => {
		const workflow = await fetchWorkflow(props.sourceWorkflowId);
		const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);

		const { nodes, connections } = useCanvasMapping({
			nodes: ref(workflow.nodes),
			connections: ref(workflow.connections),
			// @ts-ignore they match....
			workflowObject: ref(workflowObject),
		});

		return { workflow, workflowObject, nodes: nodes.value, connections: connections.value };
	},
	undefined,
	{
		resetOnExecute: true,
		shallow: false,
	},
);

const { state: targetWorkflow } = useAsyncState<
	| {
			workflow: IWorkflowDb;
			workflowObject: Workflow;
			nodes: CanvasNode[];
			connections: CanvasConnection[];
	  }
	| undefined
>(
	async () => {
		const workflow = await fetchWorkflow(props.targetWorkflowId);
		const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);

		const { nodes, connections } = useCanvasMapping({
			nodes: ref(workflow.nodes),
			connections: ref(workflow.connections),
			// @ts-ignore they match....
			workflowObject: ref(workflowObject),
		});

		return { workflow, workflowObject, nodes: nodes.value, connections: connections.value };
	},
	undefined,
	{
		resetOnExecute: true,
		shallow: false,
	},
);

// const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
// 	nodes: sourceWorkflow.value?.nodes ?? [],
// 	connections,
// 	workflowObject: sourceWorkflow.value,
// });

// const { state: targetWorkflow } = useAsyncState(
// 	() => fetchWorkflow(props.targetWorkflowId),
// 	undefined,
// 	{
// 		resetOnExecute: true,
// 		shallow: false,
// 	},
// );
</script>

<template>
	<div class="workflow-diff">
		<div>
			<template v-if="sourceWorkflow">
				<Canvas
					:id="sourceWorkflow.workflow.id"
					:nodes="sourceWorkflow.nodes"
					:connections="sourceWorkflow.connections"
					:read-only="true"
					v-bind="$attrs"
				/>
			</template>
		</div>
		<div style="border-left: 1px solid black">
			<template v-if="targetWorkflow">
				<Canvas
					:id="targetWorkflow.workflow.id"
					:nodes="targetWorkflow.nodes"
					:connections="targetWorkflow.connections"
					:read-only="true"
					v-bind="$attrs"
				/>
			</template>
			<!-- <pre>{{ targetWorkflow?.nodes }}</pre> -->
		</div>
	</div>
</template>

<style scoped>
.workflow-diff {
	display: grid;
	grid-template-columns: 1fr 1fr;
	width: 100%;
}
</style>
