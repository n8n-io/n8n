<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch, type WatchStopHandle } from 'vue';
import { useRouter } from 'vue-router';

import NodeIssueItem from './NodeIssueItem.vue';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useLogsStore } from '@/app/stores/logs.store';
import { isChatNode } from '@/app/utils/aiUtils';
import { useToast } from '@/app/composables/useToast';
import { N8nTooltip } from '@n8n/design-system';
import { nextTick } from 'vue';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import type { WorkflowValidationIssue } from '@/Interface';

interface Emits {
	/** Emitted when workflow execution completes */
	workflowExecuted: [];
}

const emit = defineEmits<Emits>();

// Initialize composables and stores
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const logsStore = useLogsStore();
const toast = useToast();
const builderStore = useBuilderStore();

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

const hasValidationIssues = computed(() => builderStore.workflowTodos.length > 0);
const triggerNodes = computed(() =>
	workflowsStore.workflow.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)),
);

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
		<!-- Validation Issues Section -->
		<template v-if="hasValidationIssues">
			<p :class="$style.description">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.description') }}
			</p>
			<div :class="$style.issuesBox">
				<TransitionGroup
					name="fade"
					tag="ul"
					:class="$style.issuesList"
					role="list"
					aria-label="Workflow validation issues"
				>
					<NodeIssueItem
						v-for="issue in builderStore.workflowTodos"
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
				{{ i18n.baseText('aiAssistant.builder.executeMessage.noIssues') }}
			</p>
		</template>

		<!-- Execution Button -->
		<N8nTooltip
			v-if="triggerNodes.length > 0"
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
</style>
