<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ActionType, WorkflowSettings } from '@/composables/useWorkflowsCache';
import { useWorkflowSettingsCache } from '@/composables/useWorkflowsCache';
import { useUIStore } from '@/stores/ui.store';
import { N8nSuggestedActions } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';
import {
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	VIEWS,
	MODAL_CONFIRM,
	EVALUATIONS_DOCS_URL,
	ERROR_WORKFLOW_DOCS_URL,
	TIME_SAVED_DOCS_URL,
} from '@/constants';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { useSourceControlStore } from '@/stores/sourceControl.store';

const props = defineProps<{
	workflow: IWorkflowDb;
}>();

const i18n = useI18n();
const router = useRouter();
const evaluationStore = useEvaluationStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsCache = useWorkflowSettingsCache();
const uiStore = useUIStore();
const message = useMessage();
const telemetry = useTelemetry();
const sourceControlStore = useSourceControlStore();

const isPopoverOpen = ref(false);
const cachedSettings = ref<WorkflowSettings | null>(null);

const hasAINode = computed(() => {
	const nodes = props.workflow.nodes;
	return nodes.some((node) => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		return nodeType?.codex?.categories?.includes('AI');
	});
});

const hasEvaluationSetOutputsNode = computed((): boolean => {
	return evaluationStore.evaluationSetOutputsNodeExist;
});

const hasErrorWorkflow = computed(() => {
	return !!props.workflow.settings?.errorWorkflow;
});

const hasTimeSaved = computed(() => {
	return props.workflow.settings?.timeSavedPerExecution !== undefined;
});

const isActivationModalOpen = computed(() => {
	return uiStore.isModalActiveById[WORKFLOW_ACTIVE_MODAL_KEY];
});

const isProtectedEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const availableActions = computed(() => {
	if (!props.workflow.active || workflowsCache.isCacheLoading.value) {
		return [];
	}

	const actions: Array<{
		id: ActionType;
		title: string;
		description: string;
		moreInfoLink: string;
		completed: boolean;
	}> = [];
	const suggestedActionSettings = cachedSettings.value?.suggestedActions ?? {};

	// Error workflow action
	if (!suggestedActionSettings.errorWorkflow?.ignored) {
		actions.push({
			id: 'errorWorkflow',
			title: i18n.baseText('workflowProductionChecklist.errorWorkflow.title'),
			description: i18n.baseText('workflowProductionChecklist.errorWorkflow.description'),
			moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
			completed: hasErrorWorkflow.value,
		});
	}

	// Evaluations action
	if (
		hasAINode.value &&
		evaluationStore.isEvaluationEnabled &&
		!suggestedActionSettings.evaluations?.ignored
	) {
		actions.push({
			id: 'evaluations',
			title: i18n.baseText('workflowProductionChecklist.evaluations.title'),
			description: i18n.baseText('workflowProductionChecklist.evaluations.description'),
			moreInfoLink: EVALUATIONS_DOCS_URL,
			completed: hasEvaluationSetOutputsNode.value,
		});
	}

	// Time saved action
	if (!suggestedActionSettings.timeSaved?.ignored) {
		actions.push({
			id: 'timeSaved',
			title: i18n.baseText('workflowProductionChecklist.timeSaved.title'),
			description: i18n.baseText('workflowProductionChecklist.timeSaved.description'),
			moreInfoLink: TIME_SAVED_DOCS_URL,
			completed: hasTimeSaved.value,
		});
	}

	return actions;
});

async function loadWorkflowSettings() {
	if (props.workflow.id) {
		// todo add global config
		cachedSettings.value = await workflowsCache.getMergedWorkflowSettings(props.workflow.id);
	}
}

async function handleActionClick(actionId: string) {
	if (actionId === 'evaluations') {
		// Navigate to evaluations
		await router.push({
			name: VIEWS.EVALUATION_EDIT,
			params: { name: props.workflow.id },
		});
	} else if (actionId === 'errorWorkflow' || actionId === 'timeSaved') {
		// Open workflow settings modal
		uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
	}
	isPopoverOpen.value = false;
}

function isValidAction(action: string): action is ActionType {
	return ['evaluations', 'errorWorkflow', 'timeSaved'].includes(action);
}

async function handleIgnoreClick(actionId: string) {
	if (!isValidAction(actionId)) {
		return;
	}

	await workflowsCache.ignoreSuggestedAction(props.workflow.id, actionId);
	await loadWorkflowSettings();

	telemetry.track('user clicked ignore suggested action', {
		actionId,
	});
}

async function handleIgnoreAll() {
	const ignoreAllConfirmed = await message.confirm(
		i18n.baseText('workflowProductionChecklist.ignoreAllConfirmation.description'),
		i18n.baseText('workflowProductionChecklist.ignoreAllConfirmation.title'),
		{
			confirmButtonText: i18n.baseText('workflowProductionChecklist.ignoreAllConfirmation.confirm'),
		},
	);

	if (ignoreAllConfirmed === MODAL_CONFIRM) {
		await workflowsCache.ignoreAllSuggestedActionsForAllWorkflows(
			availableActions.value.map((action) => action.id),
		);
		await loadWorkflowSettings();

		telemetry.track('user clicked ignore suggested actions for all workflows');
	}
}

function openSuggestedActions() {
	isPopoverOpen.value = true;
}

function onPopoverOpened() {
	telemetry.track('user opened suggested actions checklist');
}

function handlePopoverOpenChange(open: boolean) {
	if (open) {
		isPopoverOpen.value = true;
		onPopoverOpened();
	} else if (!isActivationModalOpen.value) {
		isPopoverOpen.value = false;
	}
}

// Watch for workflow activation
watch(
	() => props.workflow.active,
	async (isActive, wasActive) => {
		if (isActive && !wasActive) {
			// Check if this is the first activation
			if (!cachedSettings.value?.firstActivatedAt) {
				setTimeout(() => {
					openSuggestedActions();
				}, 0); // Ensure UI is ready and availableActions.length > 0
			}

			// Update firstActivatedAt after opening popover
			await workflowsCache.updateFirstActivatedAt(props.workflow.id);
		}
	},
);

onMounted(async () => {
	await loadWorkflowSettings();
});
</script>

<template>
	<N8nSuggestedActions
		v-if="availableActions.length > 0"
		:open="isPopoverOpen"
		:title="i18n.baseText('workflowProductionChecklist.title')"
		:actions="availableActions"
		:ignore-all-label="i18n.baseText('workflowProductionChecklist.turnOffWorkflowSuggestions')"
		:notice="
			isProtectedEnvironment ? i18n.baseText('workflowProductionChecklist.readOnlyNotice') : ''
		"
		popover-alignment="end"
		@action-click="handleActionClick"
		@ignore-click="handleIgnoreClick"
		@ignore-all="handleIgnoreAll"
		@update:open="handlePopoverOpenChange"
	/>
</template>
