<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useEvaluationStore } from '@/features/ai/evaluation.ee/evaluation.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ActionType, WorkflowSettings } from '@/app/composables/useWorkflowsCache';
import { useWorkflowSettingsCache } from '@/app/composables/useWorkflowsCache';
import { useUIStore } from '@/app/stores/ui.store';
import type { IWorkflowDb } from '@/Interface';
import {
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	VIEWS,
	MODAL_CONFIRM,
	EVALUATIONS_DOCS_URL,
	ERROR_WORKFLOW_DOCS_URL,
	TIME_SAVED_DOCS_URL,
	TIME_SAVED_NODE_EXPERIMENT,
	TIME_SAVED_NODE_TYPE,
} from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { MCP_DOCS_PAGE_URL, MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';

import { N8nSuggestedActions } from '@n8n/design-system';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { usePostHog } from '@/app/stores/posthog.store';

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
const settingsStore = useSettingsStore();
const { isEligibleForMcpAccess } = useMcp();
const usersStore = useUsersStore();
const posthogStore = usePostHog();

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

const hasSavedTimeNodes = computed(() => {
	if (!posthogStore.isFeatureEnabled(TIME_SAVED_NODE_EXPERIMENT.name)) {
		return false;
	}

	if (!props.workflow?.nodes) return false;
	return props.workflow.nodes.some(
		(node) => node.type === TIME_SAVED_NODE_TYPE && node.disabled !== true,
	);
});

const hasTimeSaved = computed(() => {
	return props.workflow.settings?.timeSavedPerExecution !== undefined || hasSavedTimeNodes.value;
});

const isActivationModalOpen = computed(() => {
	return uiStore.isModalActiveById[WORKFLOW_ACTIVE_MODAL_KEY];
});

const isProtectedEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const isMcpModuleEnabled = computed(() => {
	return settingsStore.isModuleActive('mcp');
});

const isMcpAccessEnabled = computed(() => {
	return settingsStore.moduleSettings.mcp?.mcpAccessEnabled ?? false;
});

const isWorkflowEligibleForMcpAccess = computed(() => {
	return isEligibleForMcpAccess(props.workflow);
});

const canToggleInstanceMCPAccess = computed(() => isOwner.value || isAdmin.value);

const availableActions = computed(() => {
	if (props.workflow.activeVersionId === null || workflowsCache.isCacheLoading.value) {
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

	// MCP access action
	const mcpAction = getMcpAction();
	if (mcpAction) {
		actions.push(mcpAction);
	}

	return actions;

	function getMcpAction(): {
		id: ActionType;
		title: string;
		description: string;
		moreInfoLink: string;
		completed: boolean;
	} | null {
		if (!isMcpModuleEnabled.value || !isWorkflowEligibleForMcpAccess.value) return null;

		const baseAction = {
			title: i18n.baseText('mcp.productionChecklist.title'),
			moreInfoLink: MCP_DOCS_PAGE_URL,
		};

		// Instance-level MCP access is disabled - show action to enable it
		if (!isMcpAccessEnabled.value) {
			// Only show to admins if not ignored
			if (
				!canToggleInstanceMCPAccess.value ||
				suggestedActionSettings['instance-mcp-access']?.ignored
			) {
				return null;
			}

			return {
				...baseAction,
				id: 'instance-mcp-access',
				description: i18n.baseText('mcp.productionChecklist.instance.description'),
				completed: false,
			};
		}

		// Workflow-level MCP access (instance-level is enabled)
		if (suggestedActionSettings['workflow-mcp-access']?.ignored) {
			return null;
		}

		return {
			...baseAction,
			id: 'workflow-mcp-access',
			description: i18n.baseText('mcp.productionChecklist.workflow.description'),
			completed: props.workflow.settings?.availableInMCP ?? false,
		};
	}
});

async function loadWorkflowSettings() {
	if (props.workflow.id) {
		// todo add global config
		cachedSettings.value = await workflowsCache.getMergedWorkflowSettings(props.workflow.id);
	}
}

async function handleActionClick(actionId: string) {
	switch (actionId) {
		case 'evaluations':
			// Navigate to evaluations
			await router.push({
				name: VIEWS.EVALUATION_EDIT,
				params: { name: props.workflow.id },
			});
			break;
		case 'errorWorkflow':
		case 'timeSaved':
		case 'workflow-mcp-access':
			// Open workflow settings modal
			uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			break;
		case 'instance-mcp-access':
			// Open settings page
			await router.push({ name: MCP_SETTINGS_VIEW });
			break;
		default:
			break;
	}
	isPopoverOpen.value = false;
}

function isValidAction(action: string): action is ActionType {
	return [
		'evaluations',
		'errorWorkflow',
		'timeSaved',
		'workflow-mcp-access',
		'instance-mcp-access',
	].includes(action);
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
	() => !!props.workflow.activeVersionId,
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
