<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { type INodeIssueData, type INodeIssueTypes } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';

const emit = defineEmits<{
	workflowExecuted: [];
}>();

const router = useRouter();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const i18n = useI18n();
const { runWorkflow } = useRunWorkflow({ router });

const triggerNodes = computed(() => {
	const filteredNodes = workflowsStore.workflow.nodes.filter((node) =>
		nodeTypesStore.isTriggerNode(node.type),
	);

	return filteredNodes;
});
const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

const nodesIssues = computed(() => {
	const issues: INodeIssueData[] = [];
	workflowsStore.workflow.nodes.forEach((node) => {
		const nodeHasIssues = !!Object.keys(node.issues ?? {}).length;
		const isConnected =
			Object.keys(workflowsStore.outgoingConnectionsByNodeName(node.name)).length > 0 ||
			Object.keys(workflowsStore.incomingConnectionsByNodeName(node.name)).length > 0;

		if (!node.disabled && isConnected && nodeHasIssues) {
			Object.keys(node.issues ?? {}).forEach((issueKey) => {
				if (!node?.issues?.[issueKey]) return;
				const issueValue = node?.issues?.[issueKey];
				const issueType = issueKey as INodeIssueTypes;
				if (
					issueType === 'parameters' &&
					typeof issueValue === 'object' &&
					!Array.isArray(issueValue)
				) {
					Object.keys(node?.issues?.[issueType] ?? {})?.forEach((paramIssue: string) => {
						issues.push({
							node: node.name,
							type: issueType,
							value: node?.issues?.[issueType]?.[paramIssue] as unknown as string,
						});
					});
				}
				if (
					issueType === 'credentials' &&
					typeof issueValue === 'object' &&
					!Array.isArray(issueValue)
				) {
					Object.keys(node?.issues?.[issueType] ?? {})?.forEach((paramIssue: string) => {
						issues.push({
							node: node.name,
							type: issueType,
							value: node?.issues?.[issueType]?.[paramIssue] as unknown as string,
						});
					});
				}
			});
		}
	});

	return issues;
});

function formatIssueMessage(issue: INodeIssueData['value']) {
	if (Array.isArray(issue)) {
		return issue.join(', ').replace(/\.$/, '');
	}
	return issue;
}

function getNodeType(nodeName: string) {
	const node = workflowsStore.workflow.nodes.find((n) => n.name === nodeName);
	if (!node) return null;

	return nodeTypesStore.getNodeType(node.type);
}

async function onExecute() {
	await runWorkflow({
		triggerNode: workflowsStore.selectedTriggerNodeName,
	});

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
	<div :class="$style.container">
		<template v-if="nodesIssues.length > 0">
			<p>{{ i18n.baseText('aiAssistant.builder.executeMessage.description') }}</p>
			<TransitionGroup name="fade" tag="ul" :class="$style.pendingItems">
				<li
					v-for="issue in nodesIssues"
					:key="`${formatIssueMessage(issue.value)}_${issue.node}`"
					:class="$style.nodeIssue"
				>
					<NodeIcon
						:node-type="getNodeType(issue.node)"
						:size="14"
						:shrink="false"
						:show-tooltip="true"
						tooltip-position="left"
						:class="$style.nodeIcon"
					/>
					<div :class="$style.issueMessage">
						<span :class="$style.nodeName">{{ issue.node }}:</span>
						{{ formatIssueMessage(issue.value) }}
					</div>
					<n8n-icon-button
						:class="$style.editButton"
						type="tertiary"
						size="small"
						:outline="true"
						icon="pencil"
						@click="ndvStore.setActiveNodeName(issue.node, 'other')"
					/>
				</li>
			</TransitionGroup>
		</template>
		<p v-else>{{ i18n.baseText('aiAssistant.builder.executeMessage.noIssues') }}</p>

		<CanvasRunWorkflowButton
			:disabled="nodesIssues.length > 0"
			:waiting-for-webhook="isExecutionWaitingForWebhook"
			:hide-label="true"
			:executing="isWorkflowRunning"
			size="medium"
			:trigger-nodes="nodesIssues.length > 0 ? [] : triggerNodes"
			:get-node-type="nodeTypesStore.getNodeType"
			:selected-trigger-node-name="workflowsStore.selectedTriggerNodeName"
			@execute="onExecute"
			@select-trigger-node="workflowsStore.setSelectedTriggerNodeName"
		/>
	</div>
</template>

<style lang="scss" scoped>
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
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-xlarge);
	line-height: 1.6;
	position: relative;
	font-size: var(--font-size-2xs);
}
.nodeName {
	font-weight: bold;
	flex-shrink: 0;
}
.pendingItems {
	margin: 0;
}
.nodeIssue {
	list-style: none;
	display: flex;

	&:not(:first-child) {
		padding: var(--spacing-3xs) 0;
		border-top: 1px solid var(--color-foreground-light);
	}
}
.nodeIcon {
	margin-right: var(--spacing-2xs);
	margin-top: var(--spacing-4xs);
	align-self: flex-start;
}
.editButton {
	--button-border-color: transparent;
	margin-left: auto;
	align-self: center;
}
.issueMessage {
	padding-right: var(--spacing-xs);
}
</style>
