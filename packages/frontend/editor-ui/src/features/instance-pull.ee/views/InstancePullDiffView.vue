<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { getWorkflowDiff } from '@/features/instance-pull.ee/instance-pull.api';
import type { IWorkflowDb } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

const route = useRoute();
const rootStore = useRootStore();
const toast = useToast();
const i18n = useI18n();

// `source` = the workflow currently on this (prd) instance (may be absent on a
// first publish); `target` = the incoming version from the PR package.
const sourceWorkflow = ref<IWorkflowDb | undefined>(undefined);
const targetWorkflow = ref<IWorkflowDb | undefined>(undefined);
const loading = ref(true);

onMounted(async () => {
	try {
		const prNumber = Number(route.params.prNumber);
		const diff = await getWorkflowDiff(rootStore.restApiContext, prNumber);
		// The diff view only reads the structural fields the payload carries.
		sourceWorkflow.value = (diff.source ?? undefined) as IWorkflowDb | undefined;
		targetWorkflow.value = diff.target as IWorkflowDb;
	} catch (error) {
		toast.showError(error, 'Could not load workflow diff');
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<div :class="$style.diffView">
		<WorkflowDiffView
			v-if="!loading && targetWorkflow"
			:source-workflow="sourceWorkflow"
			:target-workflow="targetWorkflow"
			:source-label="i18n.baseText('workflowDiff.label.before')"
			:target-label="i18n.baseText('workflowDiff.label.after')"
		/>
	</div>
</template>

<style module lang="scss">
.diffView {
	height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column;
}
</style>
