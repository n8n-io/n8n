<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch, type WatchStopHandle } from 'vue';
import { useRouter } from 'vue-router';

import NodeIssueItem from './NodeIssueItem.vue';
import CanvasRunWorkflowButton from '@/features/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useLogsStore } from '@/stores/logs.store';
import { isChatNode } from '@/utils/aiUtils';
import { useToast } from '@/composables/useToast';
import { N8nTooltip } from '@n8n/design-system';
import { nextTick } from 'vue';
import { useBuilderStore } from '../../builder.store';

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

// Workflow validation from store
const workflowIssues = computed(() =>
	workflowsStore.workflowValidationIssues.filter((issue) =>
		['credentials', 'parameters'].includes(issue.type),
	),
);
const hasValidationIssues = computed(() => workflowIssues.value.length > 0);
const formatIssueMessage = workflowsStore.formatIssueMessage;

const triggerNodes = computed(() =>
	workflowsStore.workflow.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)),
);

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
	containerRef.value?.scrollIntoView({ behavior: 'smooth' });
}

onMounted(scrollIntoView);

onBeforeUnmount(() => {
	stopExecutionWatcher();
});

watch(workflowIssues, async () => {
	await nextTick();
	scrollIntoView();
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
			<TransitionGroup
				name="fade"
				tag="ul"
				:class="$style.issuesList"
				role="list"
				aria-label="Workflow validation issues"
			>
				<NodeIssueItem
					v-for="issue in workflowIssues"
					:key="`${formatIssueMessage(issue.value)}_${issue.node}`"
					:issue="issue"
					:get-node-type="getNodeTypeByName"
					:format-issue-message="formatIssueMessage"
				/>
			</TransitionGroup>
		</template>

		<!-- No Issues Section -->
		<template v-else>
			<p :class="$style.noIssuesMessage">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.noIssues') }}
			</p>
		</template>

		<!-- Execution Button -->
		<N8nTooltip :disabled="!hasValidationIssues" :content="executeButtonTooltip" placement="left">
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
	padding: var(--spacing--xs);
	gap: var(--spacing--xs);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	line-height: var(--line-height--lg);
	position: relative;
	font-size: var(--font-size--2xs);
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

.issuesList {
	margin: 0;
	padding: 0;
	position: relative;
}

.runButton {
	align-self: stretch;
}
</style>
