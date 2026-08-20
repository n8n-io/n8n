<script setup lang="ts">
import type { WorkflowOverview } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref } from 'vue';

import InstanceAiWorkflowOverviewPreview from '../components/InstanceAiWorkflowOverviewPreview.vue';
import { generateWorkflowOverviewApi, getWorkflowOverviewApi } from '../instanceAi.api';

const props = defineProps<{
	workflowId: string;
}>();

const rootStore = useRootStore();

const overview = ref<WorkflowOverview | null>(null);
const isLoading = ref(true);
const isGenerating = ref(false);
// Backend-computed: the stored overview was built from the workflow's current
// saved version, so a refresh would be a no-op. Refetched on every tab entry
// (this is a routed view), which keeps it in step with saves made on the canvas.
const upToDate = ref(false);

onMounted(async () => {
	try {
		const response = await getWorkflowOverviewApi(rootStore.restApiContext, props.workflowId);
		overview.value = response.overview;
		upToDate.value = response.upToDate === true;
	} catch {
		// No stored overview / no access — the empty state offers generation.
	} finally {
		isLoading.value = false;
	}
});

async function generate() {
	if (isGenerating.value) return;
	isGenerating.value = true;
	try {
		const response = await generateWorkflowOverviewApi(rootStore.restApiContext, props.workflowId);
		if (response.overview) overview.value = response.overview;
		upToDate.value = response.upToDate === true;
	} catch {
		// Keep whatever is shown; the button stays available for a retry.
	} finally {
		isGenerating.value = false;
	}
}
</script>

<template>
	<div :class="$style.view" data-test-id="workflow-overview-view">
		<InstanceAiWorkflowOverviewPreview
			v-if="!isLoading"
			:overview="overview"
			can-generate
			:is-generating="isGenerating"
			:up-to-date="upToDate"
			@generate="generate"
		/>
	</div>
</template>

<style lang="scss" module>
.view {
	height: 100%;
	width: 100%;
}
</style>
