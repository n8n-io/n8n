<script setup lang="ts">
import { type TreeNode as ElTreeNode } from 'element-plus';
import { type TreeNode } from '@/components/RunDataAi/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';
import { type INodeUi } from '@/Interface';
import { type ITaskData } from 'n8n-workflow';
import { N8nIconButton, N8nText } from '@n8n/design-system';
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

function handleToggleOpen() {
	//...
}
</script>

<template>
	<div v-if="node !== undefined && runData !== undefined" :class="$style.container">
		<div
			v-if="(props.node.level ?? 1) > 1"
			:class="$style.indent"
			:style="{ '--depth': props.node.level ?? 1 }"
		/>
		<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
		<N8nText tag="div" :bold="true" :class="$style.name">{{ node.name }}</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
			`${upperFirst(runData.executionStatus)} in ${runData.executionTime}ms`
		}}</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
			`Started ${new Date(runData.startTime).toLocaleString()}`
		}}</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
			`${9999} tokens`
		}}</N8nText>
		<N8nIconButton
			type="secondary"
			size="mini"
			:icon="props.node.expanded ? 'chevron-up' : 'chevron-down'"
			:style="{ visibility: props.data.children.length === 0 ? 'hidden' : '' }"
			:class="$style.toggleButton"
			style="color: var(--color-text-base)"
			@click.stop="handleToggleOpen"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: stretch;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs);
	border-radius: var(--border-radius-base);

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&:hover {
		background-color: var(--color-background-medium);
	}
}

.indent {
	flex-grow: 0;
	flex-shrink: 0;
	width: calc((var(--depth) - 1) * var(--spacing-xs));
}

.icon {
	flex-shrink: 0;
}

.name {
	flex-grow: 1;
}

.attribute {
	flex-shrink: 1;
	width: calc((var(--depth) - 1) * var(--spacing-xs));
	padding-inline-start: var(--spacing-xs);
}

.toggleButton {
	flex-shrink: 0;
	border: none;
	background-color: none;
}
</style>
