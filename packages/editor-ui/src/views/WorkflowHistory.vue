<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();

onBeforeMount(async () => {
	await workflowHistoryStore.getWorkflowHistory(route.params.workflowId);
	if (!route.params.versionId) {
		await router.push({
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: route.params.workflowId,
				versionId: workflowHistoryStore.workflowHistory[0].id,
			},
		});
	}
});
</script>
<template>
	<div :class="$style.view">
		<n8n-heading :class="$style.header" tag="h2" size="medium" bold>Workflow name</n8n-heading>
		<div :class="$style.corner">
			<n8n-heading tag="h2" size="medium" bold>{{
				i18n.baseText('workflowHistory.title')
			}}</n8n-heading>
			<n8n-button type="tertiary" icon="times" size="small" text square />
		</div>
		<div :class="$style.content"></div>
		<workflow-history-list
			:class="$style.listComponent"
			:items="workflowHistoryStore.workflowHistory"
		/>
	</div>
</template>
<style module lang="scss">
.view {
	display: grid;
	width: 100%;
	grid-template-areas: 'header corner' 'content list';
	grid-template-columns: auto 330px;
	grid-template-rows: 65px auto;
	background-color: var(--color-background-xlight);
}

.header {
	grid-area: header;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing-l);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.corner {
	grid-area: corner;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing-3xs) 0 var(--spacing-s);
	background-color: var(--color-background-lighter);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.content {
	grid-area: content;
}

.listComponent {
	grid-area: list;
	grid-area: list;
}
</style>
