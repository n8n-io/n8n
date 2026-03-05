<script setup lang="ts">
import { onMounted, computed, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

import BuilderSetupCard from './BuilderSetupCard.vue';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useBuilderSetupCards } from '@/features/ai/assistant/composables/useBuilderSetupCards';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useLogsStore } from '@/app/stores/logs.store';
import { useToast } from '@/app/composables/useToast';
import { isChatNode } from '@/app/utils/aiUtils';

interface Emits {
	workflowExecuted: [];
}

const emit = defineEmits<Emits>();

const router = useRouter();
const i18n = useI18n();
const builderStore = useBuilderStore();
const setupPanelStore = useSetupPanelStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const logsStore = useLogsStore();
const toast = useToast();

const { runWorkflow } = useRunWorkflow({ router });

const {
	currentStepIndex,
	currentCard,
	isAllComplete,
	totalCards,
	firstTriggerName,
	setCredential,
	unsetCredential,
	goToNext,
	goToPrev,
	continueCurrent,
} = useBuilderSetupCards();

const triggerNodes = computed(() =>
	workflowsStore.workflow.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)),
);

const availableTriggerNodes = computed(() => (isAllComplete.value ? triggerNodes.value : []));

const executeButtonTooltip = computed(() =>
	!isAllComplete.value ? i18n.baseText('aiAssistant.builder.executeMessage.validationTooltip') : '',
);

const lastStepCompleted = ref(false);

const showCard = computed(
	() => currentCard.value && !(isAllComplete.value && builderStore.wizardHasExecutedWorkflow),
);

const showWizard = computed(() => !lastStepCompleted.value);

const isHovering = ref(false);

function onMouseEnter() {
	isHovering.value = true;
}

function onMouseLeave() {
	isHovering.value = false;
	setupPanelStore.clearHighlightedNodes();
}

// Highlight the active card's node only while hovering over the wizard
watch(
	[isHovering, () => currentCard.value?.state.node.id, showCard],
	([hovering, nodeId, visible]) => {
		if (hovering && nodeId && visible) {
			setupPanelStore.setHighlightedNodes([nodeId]);
		} else {
			setupPanelStore.clearHighlightedNodes();
		}
	},
);

const descriptionText = computed(() => {
	if (!isAllComplete.value) {
		return i18n.baseText('aiAssistant.builder.executeMessage.description');
	}
	return builderStore.hasTodosHiddenByPinnedData
		? i18n.baseText('aiAssistant.builder.executeMessage.noIssuesWithPinData')
		: i18n.baseText('aiAssistant.builder.executeMessage.noIssues');
});

const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

let executionWatcherStop: (() => void) | undefined;

const stopExecutionWatcher = () => {
	if (executionWatcherStop) {
		executionWatcherStop();
		executionWatcherStop = undefined;
	}
};

const ensureExecutionWatcher = () => {
	if (executionWatcherStop) return;

	const RUNNING_STATES = ['running', 'waiting'];

	executionWatcherStop = watch(
		() => workflowsStore.workflowExecutionData?.status,
		async (status) => {
			await nextTick();

			if (!status || RUNNING_STATES.includes(status)) return;

			stopExecutionWatcher();

			if (status !== 'canceled') {
				emit('workflowExecuted');
			}
		},
	);
};

async function onExecute() {
	if (!isAllComplete.value) return;

	builderStore.wizardHasExecutedWorkflow = true;
	ensureExecutionWatcher();

	const selectedTriggerNode =
		workflowsStore.selectedTriggerNodeName ?? availableTriggerNodes.value[0]?.name;
	const selectedTriggerNodeType = selectedTriggerNode
		? workflowsStore.getNodeByName(selectedTriggerNode)
		: null;

	if (selectedTriggerNodeType && isChatNode(selectedTriggerNodeType)) {
		toast.showMessage({
			title: i18n.baseText('aiAssistant.builder.toast.title'),
			message: i18n.baseText('aiAssistant.builder.toast.description'),
			type: 'info',
		});
		logsStore.toggleOpen(true);
		return;
	}

	const runOptions: Parameters<typeof runWorkflow>[0] = {};
	if (selectedTriggerNode) {
		runOptions.triggerNode = selectedTriggerNode;
	}

	await runWorkflow(runOptions);
}

function onGoToNext() {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_step_navigated', {
		step: currentStepIndex.value + 2,
		total: totalCards.value,
		direction: 'next',
	});
	goToNext();
}

function onGoToPrev() {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_step_navigated', {
		step: currentStepIndex.value,
		total: totalCards.value,
		direction: 'prev',
	});
	goToPrev();
}

function onCredentialSelected(payload: {
	credentialType: string;
	credentialId: string;
	nodeName: string;
}) {
	setCredential(payload.credentialType, payload.credentialId, payload.nodeName);
}

function onCredentialDeselected(payload: { credentialType: string; nodeName: string }) {
	unsetCredential(payload.credentialType, payload.nodeName);
}

function onStepExecuted() {
	const card = currentCard.value;
	if (!card?.state.isComplete) return;

	const isLastStep = currentStepIndex.value >= totalCards.value - 1;

	if (isLastStep) {
		// Last step executed successfully — dismiss the wizard
		lastStepCompleted.value = true;
		return;
	}

	// Auto-advance after step execution if the card is now complete.
	// Only for cards with parameters — credential-only cards are already
	// handled by the composable's auto-advance watcher.
	const hasParams = (card?.state.templateParameterNames?.length ?? 0) > 0;
	if (hasParams) {
		setTimeout(() => goToNext(), 300);
	}
}

onMounted(() => {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_shown', {
		total: totalCards.value,
	});
});

onBeforeUnmount(() => {
	stopExecutionWatcher();
});
</script>

<template>
	<div
		v-if="showWizard"
		data-test-id="builder-setup-wizard"
		:class="$style.container"
		role="region"
		aria-label="Workflow setup wizard"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
	>
		<p :class="$style.description">
			{{ descriptionText }}
		</p>

		<BuilderSetupCard
			v-if="showCard"
			:key="currentStepIndex"
			:state="currentCard!.state"
			:step-index="currentStepIndex"
			:total-cards="totalCards"
			:first-trigger-name="firstTriggerName"
			@go-to-next="onGoToNext"
			@go-to-prev="onGoToPrev"
			@step-executed="onStepExecuted"
			@continue-current="continueCurrent"
			@credential-selected="onCredentialSelected"
			@credential-deselected="onCredentialDeselected"
		/>

		<N8nTooltip
			v-if="triggerNodes.length > 0"
			:disabled="isAllComplete"
			:content="executeButtonTooltip"
			placement="left"
		>
			<CanvasRunWorkflowButton
				:class="$style.runButton"
				:disabled="!isAllComplete || builderStore.hasNoCreditsRemaining"
				:waiting-for-webhook="isExecutionWaitingForWebhook"
				:hide-tooltip="true"
				:label="i18n.baseText('aiAssistant.builder.executeMessage.execute')"
				:executing="isWorkflowRunning"
				:include-chat-trigger="true"
				size="medium"
				:trigger-nodes="availableTriggerNodes"
				:get-node-type="nodeTypesStore.getNodeType"
				:selected-trigger-node-name="workflowsStore.selectedTriggerNodeName"
				@execute="onExecute"
				@select-trigger-node="workflowsStore.setSelectedTriggerNodeName"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	line-height: var(--line-height--lg);
	position: relative;
	font-size: var(--font-size--sm);
}

.description {
	margin: 0;
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
}

.runButton {
	align-self: stretch;
}
</style>
