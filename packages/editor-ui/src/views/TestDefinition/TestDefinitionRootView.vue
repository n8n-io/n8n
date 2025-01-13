<script setup lang="ts">
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const workflowStore = useWorkflowsStore();

async function initWorkflow() {
	const workflowId = router.currentRoute.value.params.name as string;
	const isAlreadyInitialized = workflowStore.workflow.id === workflowId;

	if (isAlreadyInitialized) return;

	const workflow = await workflowStore.fetchWorkflow(workflowId);
	void workflowHelpers.initState(workflow);
}

onMounted(initWorkflow);
</script>

<template>
	<router-view />
</template>
