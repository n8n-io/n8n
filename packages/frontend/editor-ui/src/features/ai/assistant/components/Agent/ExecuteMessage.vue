<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch, type WatchStopHandle } from 'vue';
import { useRouter } from 'vue-router';

import NodeIssueItem from './NodeIssueItem.vue';
import CredentialsSetupCard from './CredentialsSetupCard.vue';
import SetupPanelCards from '@/features/setupPanel/components/SetupPanelCards.vue';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useLogsStore } from '@/app/stores/logs.store';
import { isChatNode } from '@/app/utils/aiUtils';
import { useToast } from '@/app/composables/useToast';
import { N8nTooltip, N8nIcon, N8nButton } from '@n8n/design-system';
import { nextTick } from 'vue';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { SETUP_CREDENTIALS_MODAL_KEY, SETUP_PANEL_AIWB } from '@/app/constants';
import type { WorkflowValidationIssue } from '@/Interface';
import { usePostHog } from '@/app/stores/posthog.store';
import { useBuilderSetupState } from '@/features/ai/assistant/composables/useBuilderSetupState';

interface Emits {
	/** Emitted when workflow execution completes */
	workflowExecuted: [];
}

const emit = defineEmits<Emits>();

// Initialize composables and stores
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const i18n = useI18n();
const logsStore = useLogsStore();
const toast = useToast();
const builderStore = useBuilderStore();

// Feature flag for setup panel cards in AIWB
const posthogStore = usePostHog();
const useSetupPanelCards = computed(() =>
	posthogStore.isVariantEnabled(SETUP_PANEL_AIWB.name, SETUP_PANEL_AIWB.variant),
);

// Setup state for the new setup panel cards (only used when feature flag is active)
const builderSetupState = useBuilderSetupState();
const hasSetupCards = computed(
	() => useSetupPanelCards.value && builderSetupState.setupCards.value.length > 0,
);

// Workflow execution composable
const { runWorkflow } = useRunWorkflow({ router });

let executionWatcherStop: WatchStopHandle | undefined;

const containerRef = ref<HTMLElement>();

const stopExecutionWatcher = () => {
	if (executionWatcherStop) {
		executionWatcherStop();
		executionWatcherStop = undefined;
	}
};

/**
 * Sets up a watcher that fires exactly once per execution cycle.
 */
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

const hasValidationIssues = computed(() => {
	if (useSetupPanelCards.value) {
		const cards = builderSetupState.setupCards.value;
		return cards.length > 0 && !builderSetupState.isAllComplete.value;
	}
	return builderStore.workflowTodos.length > 0;
});
const triggerNodes = computed(() =>
	workflowsStore.workflow.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)),
);

const issuesByType = computed(() => {
	const credentials: WorkflowValidationIssue[] = [];
	const other: WorkflowValidationIssue[] = [];

	for (const issue of builderStore.workflowTodos) {
		(issue.type === 'credentials' ? credentials : other).push(issue);
	}

	return { credentials, other };
});

/**
 * Converts a locale string pattern with placeholders into a regex.
 * E.g., "Credentials for {type} are not set." → /Credentials for .+ are not set\./i
 */
function localePatternToRegex(localeKey: BaseTextKey): RegExp {
	const pattern = i18n.baseText(localeKey, { interpolate: { type: '.+' } });
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const withPlaceholder = escaped.replace('\\.\\+', '.+');
	return new RegExp(withPlaceholder, 'i');
}

const credentialsNotSetPattern = localePatternToRegex('nodeIssues.credentials.notSet');
const parameterRequiredPattern = /Parameter\s+".+"\s+is\s+required/i;

/**
 * Custom formatter for issue messages in the execute panel.
 * Transforms verbose validation messages into user-friendly action prompts.
 */
function formatIssueMessage(issue: string | string[]): string {
	const baseMessage = workflowsStore.formatIssueMessage(issue);

	// Transform "Parameter "X" is required" → "Choose model" (for Model) or keep original
	if (parameterRequiredPattern.test(baseMessage)) {
		// Extract parameter name and check if it's "Model"
		const match = baseMessage.match(/Parameter\s+"(.+)"\s+is\s+required/i);
		if (match?.[1]?.toLowerCase() === 'model') {
			return i18n.baseText('aiAssistant.builder.executeMessage.chooseModel' as BaseTextKey);
		}
	}

	// Transform "Credentials for '...' are not set" → "Choose credentials"
	if (credentialsNotSetPattern.test(baseMessage)) {
		return i18n.baseText('aiAssistant.builder.executeMessage.chooseCredentials' as BaseTextKey);
	}

	return baseMessage;
}

// Helper to get node type
function getNodeTypeByName(nodeName: string) {
	const node = workflowsStore.workflow.nodes.find((n) => n.name === nodeName);

	if (!node) return null;
	return nodeTypesStore.getNodeType(node.type);
}

// Reactive workflow state
const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);
/**
 * Determines available trigger nodes for execution
 * Excludes trigger nodes when there are validation issues to prevent dropdown rendering
 */
const availableTriggerNodes = computed(() => (hasValidationIssues.value ? [] : triggerNodes.value));
const executeButtonTooltip = computed(() =>
	hasValidationIssues.value
		? i18n.baseText('aiAssistant.builder.executeMessage.validationTooltip')
		: '',
);

const hasTodosHidden = computed(() =>
	useSetupPanelCards.value
		? builderSetupState.hasTodosHiddenByPinnedData.value
		: builderStore.hasTodosHiddenByPinnedData,
);

const showUnpinSection = computed(
	() =>
		builderStore.isCodeBuilder && hasTodosHidden.value && builderStore.hasHadSuccessfulExecution,
);

function onUnpinAll() {
	builderStore.unpinAllNodes();
	builderStore.trackWorkflowBuilderJourney('user_clicked_unpin_all');
}

async function onExecute() {
	if (hasValidationIssues.value) {
		return;
	}

	ensureExecutionWatcher();

	const selectedTriggerNode =
		workflowsStore.selectedTriggerNodeName ?? availableTriggerNodes.value[0]?.name;
	const selectedTriggerNodeType = selectedTriggerNode
		? workflowsStore.getNodeByName(selectedTriggerNode)
		: null;

	// If the selected trigger is a chat node, open logs panel instead of executing
	// the execution will be handled by the chat node itself
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

function scrollIntoView() {
	containerRef.value?.scrollIntoView({
		behavior: 'smooth',
		block: 'nearest',
		inline: 'nearest',
	});
}

function trackBuilderPlaceholders(issue: WorkflowValidationIssue) {
	builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
		node_type: workflowsStore.getNodeByName(issue.node)?.type,
		type: issue.type,
	});
}

function openCredentialsModal() {
	uiStore.openModalWithData({ name: SETUP_CREDENTIALS_MODAL_KEY, data: { source: 'builder' } });
	builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
		type: 'credentials',
		count: issuesByType.value.credentials.length,
		source: 'builder',
	});
}

onMounted(scrollIntoView);

// Track when all todos are resolved while the component is visible
watch(hasValidationIssues, (hasIssues, hadIssues) => {
	if (hadIssues && !hasIssues) {
		builderStore.trackWorkflowBuilderJourney('no_placeholder_values_left');
	}
});

onBeforeUnmount(() => {
	stopExecutionWatcher();
});
</script>

<template>
	<div
		ref="containerRef"
		:class="$style.container"
		role="region"
		aria-label="Workflow execution panel"
	>
		<!-- Validation Issues Section (new setup panel cards) -->
		<template v-if="hasSetupCards">
			<p v-if="hasValidationIssues" :class="$style.description">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.description') }}
			</p>
			<SetupPanelCards :state="builderSetupState" :sequential="true" />
		</template>

		<!-- Validation Issues Section (legacy) -->
		<template v-else-if="hasValidationIssues">
			<p :class="$style.description">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.description') }}
			</p>
			<div :class="$style.issuesBox">
				<CredentialsSetupCard
					v-if="issuesByType.credentials.length > 0"
					:issues="issuesByType.credentials"
					:get-node-type="getNodeTypeByName"
					@click="openCredentialsModal"
				/>

				<TransitionGroup
					v-if="issuesByType.other.length > 0"
					name="fade"
					tag="ul"
					:class="$style.issuesList"
					role="list"
					aria-label="Workflow validation issues"
				>
					<NodeIssueItem
						v-for="issue in issuesByType.other"
						:key="`${formatIssueMessage(issue.value)}_${issue.node}`"
						:issue="issue"
						:get-node-type="getNodeTypeByName"
						:format-issue-message="formatIssueMessage"
						@click="() => trackBuilderPlaceholders(issue)"
					/>
				</TransitionGroup>
			</div>
		</template>

		<!-- No Issues Section -->
		<template v-else-if="triggerNodes.length > 0">
			<p :class="$style.noIssuesMessage">
				{{
					hasTodosHidden
						? i18n.baseText('aiAssistant.builder.executeMessage.noIssuesWithPinData')
						: i18n.baseText('aiAssistant.builder.executeMessage.noIssues')
				}}
				<N8nTooltip v-if="hasTodosHidden" placement="top">
					<template #content>
						{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinTooltip') }}
					</template>
					<N8nIcon icon="circle-help" size="small" :class="$style.infoIcon" />
				</N8nTooltip>
			</p>
		</template>

		<!-- Execution Button -->
		<N8nTooltip
			v-if="triggerNodes.length > 0 && (!useSetupPanelCards || !hasValidationIssues)"
			:disabled="!hasValidationIssues"
			:content="executeButtonTooltip"
			placement="left"
		>
			<CanvasRunWorkflowButton
				:class="$style.runButton"
				:disabled="hasValidationIssues || builderStore.hasNoCreditsRemaining"
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

		<!-- Unpin All Section -->
		<div v-if="showUnpinSection" :class="$style.unpinSection">
			<N8nButton
				type="secondary"
				size="medium"
				icon="pin"
				:label="i18n.baseText('aiAssistant.builder.executeMessage.unpinAll')"
				@click="onUnpinAll"
			/>
			<span :class="$style.unpinIndividuallyText">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinIndividually') }}
				<N8nTooltip placement="top">
					<template #content>
						{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinTooltip') }}
					</template>
					<N8nIcon icon="circle-help" size="small" :class="$style.infoIcon" />
				</N8nTooltip>
			</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
/* Fade transition animations for issue list */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

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

.noIssuesMessage {
	margin: 0;
	color: var(--color--text--shade-1);
}

.issuesBox {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.issuesList {
	margin: 0;
	padding: 0;
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.runButton {
	align-self: stretch;
}

.unpinSection {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.unpinIndividuallyText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.infoIcon {
	color: var(--color--text--tint-1);
	cursor: help;
}
</style>
