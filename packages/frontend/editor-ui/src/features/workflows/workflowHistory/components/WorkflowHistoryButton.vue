<script lang="ts" setup>
import { computed } from 'vue';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';

import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
const locale = useI18n();

const props = defineProps<{
	workflowId: string;
	isNewWorkflow: boolean;
}>();

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => ({
	name: VIEWS.WORKFLOW_HISTORY,
	params: {
		workflowId: props.workflowId,
	},
}));
</script>

<template>
	<N8nTooltip placement="bottom">
		<RouterLink :to="workflowHistoryRoute">
			<N8nIconButton
				:disabled="isNewWorkflow"
				data-test-id="workflow-history-button"
				type="highlight"
				icon="history"
				size="medium"
			/>
		</RouterLink>
		<template #content>
			<span v-if="isNewWorkflow">
				{{ locale.baseText('workflowHistory.button.tooltip.empty') }}
			</span>
			<span v-else>{{ locale.baseText('workflowHistory.button.tooltip') }}</span>
		</template>
	</N8nTooltip>
</template>
