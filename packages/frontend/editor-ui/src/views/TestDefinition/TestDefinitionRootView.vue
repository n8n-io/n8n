<script setup lang="ts">
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useAsyncState } from '@vueuse/core';
import { useRouter } from 'vue-router';

const props = defineProps<{
	workflowId: string;
}>();

const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const workflowStore = useWorkflowsStore();

const { isReady } = useAsyncState(async () => {
	const workflowId = props.workflowId;
	const isAlreadyInitialized = workflowStore.workflow.id === workflowId;

	if (isAlreadyInitialized) return;

	const workflow = await workflowStore.fetchWorkflow(workflowId);
	workflowHelpers.initState(workflow);
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
