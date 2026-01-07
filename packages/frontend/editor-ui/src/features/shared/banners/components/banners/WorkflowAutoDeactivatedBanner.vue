<script lang="ts" setup>
import { computed } from 'vue';
import BaseBanner from './BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { WorkflowFEMeta } from 'n8n-workflow';

const workflowsStore = useWorkflowsStore();
const threshold = computed(
	() =>
		(workflowsStore.workflow.meta as WorkflowFEMeta | undefined)?.autoDeactivationThreshold ?? 3,
);
</script>

<template>
	<BaseBanner name="WORKFLOW_AUTO_DEACTIVATED" theme="warning" custom-icon="triangle-alert">
		<template #mainContent>
			<span>
				{{
					locale.baseText('banners.workflowAutoDeactivated.message', {
						interpolate: { threshold: String(threshold) },
					})
				}}
			</span>
		</template>
	</BaseBanner>
</template>
