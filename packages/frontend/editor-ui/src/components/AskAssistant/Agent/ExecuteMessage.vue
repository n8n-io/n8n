<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import NodeIssueItem from './NodeIssueItem.vue';
import { useLogsStore } from '@/stores/logs.store';
import { isChatNode } from '@/utils/aiUtils';
import { useToast } from '@/composables/useToast';

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

// Workflow execution composable
const { runWorkflow } = useRunWorkflow({ router });

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

async function onExecute() {
	const selectedTriggerNode =
		workflowsStore.selectedTriggerNodeName ?? availableTriggerNodes.value[0]?.name;
	const selectedTriggerNodeType = workflowsStore.getNodeByName(selectedTriggerNode);

	// If the selected trigger is a chat node, open logs panel instead of executing
	// the execution will be handled by the chat node itself
	if (isChatNode(selectedTriggerNodeType!)) {
		toast.showMessage({
			title: i18n.baseText('aiAssistant.builder.toast.title'),
			message: i18n.baseText('aiAssistant.builder.toast.description'),
			type: 'info',
		});
		logsStore.toggleOpen(true);
	} else {
		await runWorkflow({
			triggerNode: workflowsStore.selectedTriggerNodeName,
		});
	}

	// Watch for execution completion
	const executionWatcher = watch(
		() => workflowsStore.isWorkflowRunning,
		(newVal, oldVal) => {
			if (oldVal && !newVal) {
				// Workflow execution has finished
				executionWatcher(); // Stop watching
				emit('workflowExecuted');
			}
		},
	);
}
</script>

<template>
	<div :class="$style.container" role="region" aria-label="Workflow execution panel">
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
		<CanvasRunWorkflowButton
			:class="$style.runButton"
			:disabled="hasValidationIssues"
			:waiting-for-webhook="isExecutionWaitingForWebhook"
			:hide-label="true"
			:executing="isWorkflowRunning"
			:include-chat-trigger="true"
			size="medium"
			:trigger-nodes="availableTriggerNodes"
			:get-node-type="nodeTypesStore.getNodeType"
			:selected-trigger-node-name="workflowsStore.selectedTriggerNodeName"
			@execute="onExecute"
			@select-trigger-node="workflowsStore.setSelectedTriggerNodeName"
		/>
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
	padding: var(--spacing-xs);
	gap: var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	line-height: var(--font-line-height-loose);
	position: relative;
	font-size: var(--font-size-2xs);
}

.description {
	margin: 0 0 var(--spacing-2xs) 0;
	color: var(--color-text-base);
	line-height: var(--font-line-height-regular);
}

.noIssuesMessage {
	margin: 0;
	color: var(--color-text-dark);
}

.issuesList {
	margin: 0;
	padding: 0;
	position: relative;
}

.runButton {
	margin-top: var(--spacing-2xs);
	align-self: stretch;
}
</style>
