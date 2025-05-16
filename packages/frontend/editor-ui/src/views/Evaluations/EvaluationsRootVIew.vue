<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUsageStore } from '@/stores/usage.store';
import { useAsyncState } from '@vueuse/core';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';

const props = defineProps<{
	name: string;
}>();

const workflowsStore = useWorkflowsStore();
const evaluationsStore = useEvaluationStore();
const usageStore = useUsageStore();
const router = useRouter();
const toast = useToast();
const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const { initializeWorkspace } = useCanvasOperations({ router });

const { isReady } = useAsyncState(async () => {
	await evaluationsStore.fetchTestRuns(props.name);
	await usageStore.getLicenseInfo();
	const workflowId = props.name;
	const isAlreadyInitialized = workflowsStore.workflow.id === workflowId;

	if (isAlreadyInitialized) return;

	if (workflowId && workflowId !== 'new') {
		// Check if we are loading the Evaluation tab directly, without having loaded the workflow
		if (workflowsStore.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			try {
				const data = await workflowsStore.fetchWorkflow(workflowId);

				// We need to check for the evaluation node with setMetrics operation, so we need to initialize the nodeTypesStore to have node properties initialized
				if (nodeTypesStore.allNodeTypes.length === 0) {
					await nodeTypesStore.getNodeTypes();
				}

				initializeWorkspace(data);
			} catch (error) {
				toast.showError(error, i18n.baseText('nodeView.showError.openWorkflow.title'));
			}
		}
	}
}, undefined);
</script>

<template>
	<div :class="$style.evaluationsView">
		<router-view v-if="isReady" />
	</div>
</template>

<style module lang="scss">
.evaluationsView {
	width: 100%;
	height: 100%;
}
</style>
