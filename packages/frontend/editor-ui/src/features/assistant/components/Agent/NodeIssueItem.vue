<script setup lang="ts">
import type { INodeTypeDescription } from 'n8n-workflow';
// Types for node issues
interface WorkflowNodeIssue {
	node: string;
	type: string;
	value: string | string[];
}
import { useNDVStore } from '@/stores/ndv.store';
import NodeIcon from '@/components/NodeIcon.vue';
import { N8nIcon } from '@n8n/design-system';

interface Props {
	/** The node issue to display */
	issue: WorkflowNodeIssue;
	/** Function to get node type information */
	getNodeType: (nodeName: string) => INodeTypeDescription | null;
	/** Function to format issue messages */
	formatIssueMessage: (value: WorkflowNodeIssue['value']) => string;
}

const props = defineProps<Props>();

const ndvStore = useNDVStore();

function handleEditClick() {
	ndvStore.setActiveNodeName(props.issue.node, 'other');
}
</script>

<template>
	<li
		:class="$style.nodeIssue"
		role="listitem"
		:aria-label="`Edit ${issue.node} node`"
		@click="handleEditClick"
	>
		<!-- Node icon with tooltip -->
		<NodeIcon
			:node-type="getNodeType(issue.node)"
			:size="14"
			:shrink="false"
			:show-tooltip="true"
			tooltip-position="left"
			:class="$style.nodeIcon"
			:aria-label="`${issue.node} node`"
		/>

		<!-- Issue message -->
		<div :class="$style.issueMessage" :aria-label="`Issue: ${formatIssueMessage(issue.value)}`">
			<span :class="$style.nodeName">{{ issue.node }}:</span>
			{{ formatIssueMessage(issue.value) }}
		</div>

		<!-- Edit button -->
		<N8nIcon size="large" icon="pencil" />
	</li>
</template>

<style lang="scss" module>
.nodeIssue {
	list-style: none;
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) 0;
	border-bottom: 1px solid var(--color--foreground--tint-1);
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}

	&:first-child {
		padding-top: 0;
	}

	&:last-child {
		border-bottom: none;
	}
}

.nodeIcon {
	margin-right: var(--spacing--2xs);
	margin-top: var(--spacing--4xs);
	flex-shrink: 0;
	align-self: flex-start;
}

.nodeName {
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.issueMessage {
	flex: 1;
	padding-right: var(--spacing--xs);
	line-height: var(--line-height--md);
}

.editButton {
	--button-border-color: transparent;
	margin-left: auto;
	flex-shrink: 0;
	align-self: center;
}
</style>
