<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useDebounce } from '@/app/composables/useDebounce';
import { LOADING_ANIMATION_MIN_DURATION } from '@/app/constants/durations';
const locale = useI18n();

const props = defineProps<{
	workflowId: string;
	isNewWorkflow: boolean;
}>();

const uiStore = useUIStore();
const isWorkflowSaving = ref(false);
const { debounce } = useDebounce();

const debouncedRemoveSaveIndicator = debounce(
	() => {
		isWorkflowSaving.value = false;
	},
	{ debounceTime: LOADING_ANIMATION_MIN_DURATION, trailing: true },
);

watch(
	() => uiStore.isActionActive.workflowSaving,
	(value) => {
		if (value) {
			isWorkflowSaving.value = true;
		} else {
			debouncedRemoveSaveIndicator();
		}
	},
);

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => ({
	name: VIEWS.WORKFLOW_HISTORY,
	params: {
		workflowId: props.workflowId,
	},
}));
</script>

<template>
	<N8nTooltip v-if="workflowId" placement="bottom" :show-after="300">
		<RouterLink :to="workflowHistoryRoute">
			<N8nIconButton
				:disabled="isNewWorkflow"
				:loading="isWorkflowSaving"
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
