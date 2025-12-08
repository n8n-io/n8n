<script setup lang="ts">
import type { INodeTypeDescription } from 'n8n-workflow';
// Types for node issues
interface WorkflowNodeIssue {
	node: string;
	type: string;
	value: string | string[];
}
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nIcon } from '@n8n/design-system';

interface Props {
	/** The node issue to display */
	issue: WorkflowNodeIssue;
	/** Function to get node type information */
	getNodeType: (nodeName: string) => INodeTypeDescription | null;
	/** Function to format issue messages */
	formatIssueMessage: (value: WorkflowNodeIssue['value']) => string;
}

interface Emits {
	click: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const ndvStore = useNDVStore();

function handleEditClick() {
	ndvStore.setActiveNodeName(props.issue.node, 'other');

	emit('click');
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

		<!-- Navigate chevron -->
		<N8nIcon :class="$style.chevron" icon="chevron-right" />
	</li>
</template>

<style lang="scss" module>
.nodeIssue {
	list-style: none;
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) 0;
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}
}

.nodeIcon {
	margin-right: var(--spacing--2xs);
	flex-shrink: 0;
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

.chevron {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
	color: var(--color--text);
}
</style>
