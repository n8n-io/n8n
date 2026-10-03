<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nPopover } from '@n8n/design-system';
import type { WorkflowValidationIssue } from '@/Interface';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIssueItem from '@/features/ai/assistant/components/Agent/NodeIssueItem.vue';
import { findNodesMissingErrorHandling } from './workflowHealthChecks';

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();

const isOpen = ref(false);

const issues = computed<WorkflowValidationIssue[]>(() => {
	const store = workflowDocumentStore.value;
	const errorHandlingIssues = findNodesMissingErrorHandling({
		nodes: store.allNodes,
		errorWorkflow: store.settings.errorWorkflow,
		outgoingConnectionsByNodeName: store.outgoingConnectionsByNodeName,
		incomingConnectionsByNodeName: store.incomingConnectionsByNodeName,
	}).map((node) => ({
		node: node.name,
		type: 'errorHandling',
		value: i18n.baseText('workflowHealthCheck.errorHandling'),
	}));
	return [...store.nodeValidationIssues, ...errorHandlingIssues];
});

// Replicates ExecuteMessage.vue's local helper
function getNodeTypeByName(nodeName: string) {
	const node = workflowDocumentStore.value.getNodeByName(nodeName);
	return node ? nodeTypesStore.getNodeType(node.type) : null;
}

function formatNodeIssueMessage(value: string | string[]) {
	return workflowDocumentStore.value.formatNodeIssueMessage(value);
}

function onIssueClick() {
	isOpen.value = false; // NDV opening is NodeIssueItem's job
}
</script>

<template>
	<N8nPopover
		:open="isOpen"
		width="360px"
		max-height="320px"
		align="end"
		@update:open="isOpen = $event"
	>
		<template #trigger>
			<N8nButton variant="ghost" data-test-id="workflow-health-check-button">
				{{ i18n.baseText('workflowHealthCheck.button') }}
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.panel" data-test-id="workflow-health-check-panel">
				<ul
					v-if="issues.length > 0"
					:class="$style.list"
					role="list"
					:aria-label="i18n.baseText('workflowHealthCheck.issuesListLabel')"
				>
					<NodeIssueItem
						v-for="issue in issues"
						:key="`${issue.node}_${issue.type}_${String(issue.value)}`"
						:issue="issue"
						:get-node-type="getNodeTypeByName"
						:format-node-issue-message="formatNodeIssueMessage"
						@click="onIssueClick"
					/>
				</ul>
				<div v-else :class="$style.empty" data-test-id="workflow-health-check-empty">
					<N8nIcon icon="circle-check" color="success" />
					{{ i18n.baseText('workflowHealthCheck.noIssues') }}
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.panel {
	padding: var(--spacing--xs);
	font-size: var(--font-size--sm);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.empty {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
