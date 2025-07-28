<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsCache } from '@/composables/useWorkflowsCache';
import { useUIStore } from '@/stores/ui.store';
import { N8nSuggestedActions } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';
import { WORKFLOW_SETTINGS_MODAL_KEY, VIEWS } from '@/constants';

const props = defineProps<{
	workflow: IWorkflowDb;
}>();

const i18n = useI18n();
const router = useRouter();
const evaluationStore = useEvaluationStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsCache = useWorkflowsCache();
const uiStore = useUIStore();

const suggestedActionsComponent = ref<InstanceType<typeof N8nSuggestedActions>>();
const workflowSettings = ref<Awaited<ReturnType<typeof workflowsCache.getWorkflowSettings>>>(null);

const hasAINode = computed(() => {
	const nodes = props.workflow.nodes;
	return nodes.some((node) => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		return nodeType?.codex?.categories?.includes('AI');
	});
});

const hasEvaluationSetOutputsNode = computed(() => {
	return evaluationStore.evaluationSetOutputsNodeExist;
});

const hasErrorWorkflow = computed(() => {
	return !!props.workflow.settings?.errorWorkflow;
});

const hasTimeSaved = computed(() => {
	return props.workflow.settings?.timeSavedPerExecution !== undefined;
});

const availableActions = computed(() => {
	if (!props.workflow.active || !workflowSettings.value) {
		return [];
	}

	const actions = [];
	const suggestedActions = workflowSettings.value.suggestedActions || {};

	// Evaluations action
	if (
		hasAINode.value &&
		!hasEvaluationSetOutputsNode.value &&
		!suggestedActions.evaluations?.ignored
	) {
		actions.push({
			id: 'evaluations',
			title: i18n.baseText('workflowSuggestedActions.evaluations.title'),
			description: i18n.baseText('workflowSuggestedActions.evaluations.description'),
			buttonLabel: i18n.baseText('workflowSuggestedActions.evaluations.button'),
			moreInfoLink: 'https://docs.n8n.io/advanced-ai/evaluations/overview/',
		});
	}

	// Error workflow action
	if (!hasErrorWorkflow.value && !suggestedActions.errorWorkflow?.ignored) {
		actions.push({
			id: 'errorWorkflow',
			title: i18n.baseText('workflowSuggestedActions.errorWorkflow.title'),
			description: i18n.baseText('workflowSuggestedActions.errorWorkflow.description'),
			buttonLabel: i18n.baseText('workflowSuggestedActions.errorWorkflow.button'),
			moreInfoLink:
				'https://docs.n8n.io/flow-logic/error-handling/#create-and-set-an-error-workflow',
		});
	}

	// Time saved action
	if (!hasTimeSaved.value && !suggestedActions.timeSaved?.ignored) {
		actions.push({
			id: 'timeSaved',
			title: i18n.baseText('workflowSuggestedActions.timeSaved.title'),
			description: i18n.baseText('workflowSuggestedActions.timeSaved.description'),
			buttonLabel: i18n.baseText('workflowSuggestedActions.timeSaved.button'),
			moreInfoLink: 'https://docs.n8n.io/insights/#setting-the-time-saved-by-a-workflow',
		});
	}

	return actions;
});

const showRedDot = computed(() => {
	return availableActions.value.length > 0;
});

async function loadWorkflowSettings() {
	if (props.workflow.id) {
		workflowSettings.value = await workflowsCache.getWorkflowSettings(props.workflow.id);
	}
}

async function handleActionClick(actionId: string) {
	if (actionId === 'evaluations') {
		// Navigate to evaluations
		await router.push({
			name: VIEWS.EVALUATION,
			params: { name: props.workflow.id },
		});
	} else if (actionId === 'errorWorkflow' || actionId === 'timeSaved') {
		// Open workflow settings modal
		uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
	}
}

function isValidAction(action: string): action is 'evaluations' | 'errorWorkflow' | 'timeSaved' {
	return ['evaluations', 'errorWorkflow', 'timeSaved'].includes(action);
}

async function handleIgnoreClick(actionId: string) {
	if (!isValidAction(actionId)) {
		return;
	}

	await workflowsCache.ignoreSuggestedAction(props.workflow.id, actionId);
	await loadWorkflowSettings();
}

function openSuggestedActions() {
	suggestedActionsComponent.value?.openPopover();
}

// Watch for workflow activation
watch(
	() => props.workflow.active,
	async (isActive, wasActive) => {
		if (isActive && !wasActive) {
			// Workflow was just activated
			await loadWorkflowSettings();

			// Check if this is the first activation
			if (!workflowSettings.value?.firstActivatedAt && availableActions.value.length > 0) {
				// Open suggested actions popover before updating firstActivatedAt
				setTimeout(() => {
					openSuggestedActions();
				}, 500); // Small delay to ensure UI is ready
			}

			// Update firstActivatedAt after opening popover
			await workflowsCache.updateFirstActivatedAt(props.workflow.id);
		}
	},
);

onMounted(async () => {
	await loadWorkflowSettings();
});

defineExpose({
	openSuggestedActions,
});
</script>

<template>
	<N8nSuggestedActions
		v-if="availableActions.length > 0"
		ref="suggestedActionsComponent"
		:actions="availableActions"
		:show-red-dot="showRedDot"
		@action-click="handleActionClick"
		@ignore-click="handleIgnoreClick"
	/>
</template>
