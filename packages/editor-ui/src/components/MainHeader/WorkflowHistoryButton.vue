<script lang="ts" setup>
import { computed } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { VIEWS } from '@/constants';

const props = defineProps<{
	workflow: IWorkflowDb;
	isFeatureEnabled: boolean;
	isNewWorkflow: boolean;
}>();

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => {
	return {
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: props.workflow.id,
		},
	};
});
</script>

<template>
	<RouterLink
		v-if="isFeatureEnabled"
		:to="workflowHistoryRoute"
		:class="$style.workflowHistoryButton"
	>
		<N8nIconButton
			:disabled="isNewWorkflow"
			data-test-id="workflow-history-button"
			type="tertiary"
			icon="history"
			size="medium"
			text
		/>
	</RouterLink>
</template>

<style lang="scss" module>
.workflowHistoryButton {
	width: 30px;
	height: 30px;
	color: var(--color-text-dark);
	border-radius: var(--border-radius-base);

	&:hover {
		background-color: var(--color-background-base);
	}

	:disabled {
		background: transparent;
		border: none;
		opacity: 0.5;
	}
}
</style>
