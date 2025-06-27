<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import type { IWorkflowSettings } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useI18n } from '@n8n/i18n';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import type { IconColor } from '@n8n/design-system';
import { type IAccordionItem } from '@n8n/design-system/components/N8nInfoAccordion/InfoAccordion.vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

interface IWorkflowSaveSettings {
	saveFailedExecutions: boolean;
	saveSuccessfulExecutions: boolean;
	saveTestExecutions: boolean;
}

const props = withDefaults(
	defineProps<{
		initiallyExpanded?: boolean;
	}>(),
	{
		initiallyExpanded: false,
	},
);

const i18n = useI18n();
const router = useRouter();
const workflowSaving = useWorkflowSaving({ router });
const locale = useI18n();

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const npsSurveyStore = useNpsSurveyStore();

const defaultValues = ref({
	saveFailedExecutions: 'all',
	saveSuccessfulExecutions: 'all',
	saveManualExecutions: false,
});
const workflowSaveSettings = ref({
	saveFailedExecutions: false,
	saveSuccessfulExecutions: false,
	saveTestExecutions: false,
} as IWorkflowSaveSettings);

const accordionItems = computed((): IAccordionItem[] => [
	{
		id: 'productionExecutions',
		label: locale.baseText('executionsLandingPage.emptyState.accordion.productionExecutions'),
		icon: productionExecutionsIcon.value.icon,
		iconColor: productionExecutionsIcon.value.color,
		tooltip:
			productionExecutionsStatus.value === 'unknown'
				? locale.baseText(
						'executionsLandingPage.emptyState.accordion.productionExecutionsWarningTooltip',
					)
				: null,
	},
	{
		id: 'manualExecutions',
		label: locale.baseText('executionsLandingPage.emptyState.accordion.testExecutions'),
		icon: workflowSaveSettings.value.saveTestExecutions ? 'check' : 'x',
		iconColor: workflowSaveSettings.value.saveTestExecutions ? 'success' : 'danger',
	},
]);
const shouldExpandAccordion = computed(() => {
	if (!props.initiallyExpanded) {
		return false;
	}
	return (
		!workflowSaveSettings.value.saveFailedExecutions ||
		!workflowSaveSettings.value.saveSuccessfulExecutions ||
		!workflowSaveSettings.value.saveTestExecutions
	);
});
const productionExecutionsIcon = computed((): { color: IconColor; icon: IconName } => {
	if (productionExecutionsStatus.value === 'saving') {
		return { icon: 'check', color: 'success' };
	} else if (productionExecutionsStatus.value === 'not-saving') {
		return { icon: 'x', color: 'danger' };
	}
	return { icon: 'triangle-alert', color: 'warning' };
});
const productionExecutionsStatus = computed(() => {
	if (
		workflowSaveSettings.value.saveSuccessfulExecutions ===
		workflowSaveSettings.value.saveFailedExecutions
	) {
		if (workflowSaveSettings.value.saveSuccessfulExecutions) {
			return 'saving';
		}
		return 'not-saving';
	} else {
		return 'unknown';
	}
});
const workflowSettings = computed(() => deepCopy(workflowsStore.workflowSettings));
const accordionIcon = computed((): { color: IconColor; icon: IconName } | undefined => {
	if (
		!workflowSaveSettings.value.saveTestExecutions ||
		productionExecutionsStatus.value !== 'saving'
	) {
		return { icon: 'triangle-alert', color: 'warning' };
	}
	return undefined;
});
const currentWorkflowId = computed(() => workflowsStore.workflowId);
const isNewWorkflow = computed(() => {
	return (
		!currentWorkflowId.value ||
		currentWorkflowId.value === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
		currentWorkflowId.value === 'new'
	);
});
const workflowName = computed(() => workflowsStore.workflowName);
const currentWorkflowTagIds = computed(() => workflowsStore.workflowTags);

watch(workflowSettings, (newSettings: IWorkflowSettings) => {
	updateSettings(newSettings);
});

onMounted(() => {
	defaultValues.value.saveFailedExecutions = settingsStore.saveDataErrorExecution;
	defaultValues.value.saveSuccessfulExecutions = settingsStore.saveDataSuccessExecution;
	defaultValues.value.saveManualExecutions = settingsStore.saveManualExecutions;
	updateSettings(workflowSettings.value);
});

function updateSettings(wfSettings: IWorkflowSettings): void {
	workflowSaveSettings.value.saveFailedExecutions =
		wfSettings.saveDataErrorExecution === undefined
			? defaultValues.value.saveFailedExecutions === 'all'
			: wfSettings.saveDataErrorExecution === 'all';
	workflowSaveSettings.value.saveSuccessfulExecutions =
		wfSettings.saveDataSuccessExecution === undefined
			? defaultValues.value.saveSuccessfulExecutions === 'all'
			: wfSettings.saveDataSuccessExecution === 'all';
	workflowSaveSettings.value.saveTestExecutions =
		wfSettings.saveManualExecutions === undefined
			? defaultValues.value.saveManualExecutions
			: (wfSettings.saveManualExecutions as boolean);
}

function onAccordionClick(event: MouseEvent): void {
	if (event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
	}
}

function onItemTooltipClick(item: string, event: MouseEvent): void {
	if (item === 'productionExecutions' && event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
	}
}

function openWorkflowSettings(): void {
	uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
}

async function onSaveWorkflowClick(): Promise<void> {
	let currentId: string | undefined = undefined;
	if (currentWorkflowId.value !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		currentId = currentWorkflowId.value;
	} else if (
		router.currentRoute.value.params.name &&
		router.currentRoute.value.params.name !== 'new'
	) {
		const routeName = router.currentRoute.value.params.name;
		currentId = Array.isArray(routeName) ? routeName[0] : routeName;
	}
	if (!currentId) {
		return;
	}
	const saved = await workflowSaving.saveCurrentWorkflow({
		id: currentId,
		name: workflowName.value,
		tags: currentWorkflowTagIds.value,
	});
	if (saved) {
		await npsSurveyStore.fetchPromptsData();
	}
}
</script>

<template>
	<N8nInfoAccordion
		:class="[$style.accordion, 'mt-2xl']"
		:title="i18n.baseText('executionsLandingPage.emptyState.accordion.title')"
		:items="accordionItems"
		:initially-expanded="shouldExpandAccordion"
		:header-icon="accordionIcon"
		@click:body="onAccordionClick"
		@tooltip-click="onItemTooltipClick"
	>
		<template #customContent>
			<footer class="mt-2xs">
				{{ i18n.baseText('executionsLandingPage.emptyState.accordion.footer') }}
				<N8nTooltip :disabled="!isNewWorkflow">
					<template #content>
						<div>
							<N8nLink @click.prevent="onSaveWorkflowClick">{{
								i18n.baseText('executionsLandingPage.emptyState.accordion.footer.tooltipLink')
							}}</N8nLink>
							{{ i18n.baseText('executionsLandingPage.emptyState.accordion.footer.tooltipText') }}
						</div>
					</template>
					<N8nLink
						:class="{ [$style.disabled]: isNewWorkflow }"
						size="small"
						@click.prevent="openWorkflowSettings"
					>
						{{ i18n.baseText('executionsLandingPage.emptyState.accordion.footer.settingsLink') }}
					</N8nLink>
				</N8nTooltip>
			</footer>
		</template>
	</N8nInfoAccordion>
</template>

<style module lang="scss">
.accordion {
	background: none;
	width: 320px;

	// Accordion header
	& > div:nth-child(1) {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding-block: var(--spacing-2xs);
		padding-inline: var(--spacing-s);
		width: 100%;
		user-select: none;
		color: var(--color-text-base) !important;
	}

	// Accordion description
	& > div:nth-child(2) {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0 var(--spacing-s) var(--spacing-2xs) !important;

		span {
			width: 100%;
		}
	}

	footer {
		text-align: left;
		width: 100%;
		font-size: var(--font-size-2xs);
	}

	.disabled a {
		color: currentColor;
		cursor: not-allowed;
		opacity: 0.5;
		text-decoration: none;
	}
}
</style>
