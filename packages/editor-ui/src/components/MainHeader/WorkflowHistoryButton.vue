<script lang="ts" setup>
import { computed } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';

const locale = useI18n();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

const props = defineProps<{
	workflow: IWorkflowDb;
	isNewWorkflow: boolean;
}>();

const isFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => {
	return {
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: props.workflow.id,
		},
	};
});

const goToUpgrade = () => {
	void uiStore.goToUpgrade('workflow-history', 'upgrade-workflow-history');
};
</script>

<template>
	<N8nTooltip placement="top">
		<RouterLink :to="workflowHistoryRoute" :class="$style.workflowHistoryButton">
			<N8nIconButton
				:disabled="isNewWorkflow || !isFeatureEnabled"
				data-test-id="workflow-history-button"
				type="tertiary"
				icon="history"
				size="medium"
				text
			/>
		</RouterLink>
		<template #content>
			<span v-if="isFeatureEnabled && isNewWorkflow">
				{{ locale.baseText('workflowHistory.button.tooltip.empty') }}
			</span>
			<span v-else-if="isFeatureEnabled">{{
				locale.baseText('workflowHistory.button.tooltip.enabled')
			}}</span>
			<i18n-t keypath="workflowHistory.button.tooltip.disabled">
				<template #link>
					<N8nLink size="small" @click="goToUpgrade">
						{{ locale.baseText('workflowHistory.button.tooltip.disabled.link') }}
					</N8nLink>
				</template>
			</i18n-t>
		</template>
	</N8nTooltip>
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
