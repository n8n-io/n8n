<script setup lang="ts">
import { type TreeNode as ElTreeNode } from 'element-plus';
import { type TreeNode } from '@/components/RunDataAi/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';
import { type INodeUi } from '@/Interface';
import { type ITaskData } from 'n8n-workflow';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { upperFirst } from 'lodash-es';

const props = defineProps<{ data: TreeNode; node: ElTreeNode }>();

const workflowsStore = useWorkflowsStore();
const nodeTypeStore = useNodeTypesStore();
const node = computed<INodeUi | undefined>(() => workflowsStore.nodesByName[props.data.node]);
const runData = computed<ITaskData | undefined>(() =>
	node.value
		? workflowsStore.workflowExecutionData?.data?.resultData.runData[node.value.name]?.[
				props.data.runIndex
			]
		: undefined,
);
const type = computed(() => (node.value ? nodeTypeStore.getNodeType(node.value.type) : undefined));
const depth = computed(() => (props.node.level ?? 1) - 1);
const isLastChild = computed(() => {
	const siblings = props.data.parent?.children ?? [];

	return props.data === siblings[siblings.length - 1];
});
</script>

<template>
	<div v-if="node !== undefined && runData !== undefined" :class="$style.container">
		<div v-for="level in depth" :key="level" :class="$style.indent">
			<div v-if="level === depth" :class="$style.connectorCurved" />
			<!-- TODO: the condition below is incomplete -->
			<div v-if="level !== depth || !isLastChild" :class="$style.connectorStraight" />
		</div>
		<div :class="$style.selectable">
			<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
			<N8nText tag="div" :bold="true" size="small" :class="$style.name">{{ node.name }}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				`${upperFirst(runData.executionStatus)} in ${runData.executionTime}ms`
			}}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				`Started ${new Date(runData.startTime).toLocaleString()}`
			}}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				`${9999} Tokens`
			}}</N8nText>
			<N8nIcon
				size="medium"
				:icon="props.node.expanded ? 'chevron-down' : 'chevron-up'"
				:style="{
					visibility: props.data.children.length === 0 ? 'hidden' : '',
				}"
				:class="$style.toggleIcon"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: stretch;
	overflow: hidden;
}

.selectable {
	flex-grow: 1;
	width: 0;
	display: flex;
	align-items: center;
	justify-content: stretch;
	border-radius: var(--border-radius-base);

	&:hover {
		background-color: var(--color-foreground-base);
	}

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: var(--spacing-2xs);
	}
}

.indent {
	flex-grow: 0;
	flex-shrink: 0;
	width: var(--spacing-xl);
	align-self: stretch;
	position: relative;
	overflow: hidden;
}

.connectorCurved {
	position: absolute;
	left: var(--spacing-s);
	bottom: var(--spacing-s);
	border: 2px solid var(--color-canvas-dot);
	width: var(--spacing-l);
	height: var(--spacing-l);
	border-radius: var(--border-radius-large);
}

.connectorStraight {
	position: absolute;
	left: var(--spacing-s);
	top: 0;
	border-left: 2px solid var(--color-canvas-dot);
	height: 100%;
}

.icon {
	flex-shrink: 0;
}

.name {
	flex-grow: 1;
	padding-inline-start: 0;
}

.attribute {
	flex-shrink: 1;
}

.toggleIcon {
	flex-shrink: 0;
	border: none;
	margin-inline-end: var(--spacing-5xs);
	color: var(--color-text-base);
}
</style>
