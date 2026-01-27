<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { AutoSaveState, VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useDebounce } from '@/app/composables/useDebounce';
import { LOADING_ANIMATION_MIN_DURATION } from '@/app/constants/durations';

const locale = useI18n();

const props = defineProps<{
	workflowId: string;
	isNewWorkflow: boolean;
}>();

const uiStore = useUIStore();
const autosaveStore = useWorkflowAutosaveStore();
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
	(isSaving) => {
		if (isSaving) {
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

const isScheduled = computed(() => autosaveStore.autoSaveState === AutoSaveState.Scheduled);

// The button should be disabled until autosave is complete
const isDisabled = computed(
	() => props.isNewWorkflow || isScheduled.value || isWorkflowSaving.value,
);
</script>

<template>
	<N8nTooltip v-if="workflowId" placement="bottom" :show-after="300">
		<component
			:is="isDisabled ? 'div' : RouterLink"
			:to="isDisabled ? undefined : workflowHistoryRoute"
		>
			<N8nIconButton
				:disabled="isDisabled"
				:loading="isWorkflowSaving"
				data-test-id="workflow-history-button"
				type="highlight"
				icon="history"
				size="medium"
			/>
		</component>
		<template #content>
			<span v-if="isNewWorkflow">
				{{ locale.baseText('workflowHistory.button.tooltip.empty') }}
			</span>
			<span v-else-if="isScheduled">
				{{ locale.baseText('workflowHistory.button.tooltip.scheduled') }}
			</span>
			<span v-else-if="isWorkflowSaving">
				{{ locale.baseText('workflowHistory.button.tooltip.saving') }}
			</span>
			<span v-else>{{ locale.baseText('workflowHistory.button.tooltip') }}</span>
		</template>
	</N8nTooltip>
</template>
