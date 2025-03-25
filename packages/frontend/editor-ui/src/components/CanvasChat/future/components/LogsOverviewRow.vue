<script setup lang="ts">
import { type TreeNode as ElTreeNode } from 'element-plus';
import { getSubtreeTotalConsumedTokens, type TreeNode } from '@/components/RunDataAi/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';
import { type INodeUi } from '@/Interface';
import { type ExecutionStatus, type ITaskData } from 'n8n-workflow';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { upperFirst } from 'lodash-es';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{ data: TreeNode; node: ElTreeNode; isSelected: boolean }>();

const locale = useI18n();
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
const runOutcomeText = computed(() => {
	const finalStatuses: ExecutionStatus[] = ['crashed', 'error', 'success'];
	const status = runData.value?.executionStatus;

	if (!status) {
		return '';
	}

	const statusText = upperFirst(status);

	return finalStatuses.includes(status)
		? locale.baseText('logs.overview.body.summaryText', {
				interpolate: {
					status: statusText,
					time: runData.value.executionTime,
				},
			})
		: statusText;
});
const startedText = computed(() =>
	locale.baseText('logs.overview.body.started', {
		interpolate: {
			time: new Date(runData.value?.startTime ?? 0).toLocaleString(),
		},
	}),
);

const subtreeConsumedTokensText = computed(() =>
	locale.baseText('logs.overview.body.tokens', {
		interpolate: {
			count: getSubtreeTotalConsumedTokens(props.data).totalTokens,
		},
	}),
);

function isLastChild(level: number) {
	let parent = props.data.parent;
	let data: TreeNode | undefined = props.data;

	for (let i = 0; i < depth.value - level; i++) {
		data = parent;
		parent = parent?.parent;
	}

	const siblings = parent?.children ?? [];

	return data === siblings[siblings.length - 1];
}

function handleClickToggleButton() {
	props.node.expanded = !props.node.expanded;
}
</script>

<template>
	<div v-if="node !== undefined && runData !== undefined" :class="$style.container">
		<template v-for="level in depth" :key="level">
			<div
				:class="{
					[$style.indent]: true,
					[$style.connectorCurved]: level === depth,
					[$style.connectorStraight]: !isLastChild(level),
				}"
			/>
		</template>
		<div :class="[$style.selectable, props.isSelected ? $style.selected : '']">
			<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
			<N8nText tag="div" :bold="true" size="small" :class="$style.name">{{ node.name }}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				runOutcomeText
			}}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				startedText
			}}</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.attribute">{{
				subtreeConsumedTokensText
			}}</N8nText>
			<N8nIconButton
				type="secondary"
				size="medium"
				:icon="props.node.expanded ? 'chevron-down' : 'chevron-up'"
				:style="{
					visibility: props.data.children.length === 0 ? 'hidden' : '',
					color: 'var(--color-text-base)',
				}"
				:class="$style.toggleButton"
				@click.stop="handleClickToggleButton"
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

	&.selected,
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

	&.connectorCurved:before {
		content: '';
		position: absolute;
		left: var(--spacing-s);
		bottom: var(--spacing-s);
		border: 2px solid var(--color-canvas-dot);
		width: var(--spacing-l);
		height: var(--spacing-l);
		border-radius: var(--border-radius-large);
	}

	&.connectorStraight:after {
		content: '';
		position: absolute;
		left: var(--spacing-s);
		top: 0;
		border-left: 2px solid var(--color-canvas-dot);
		height: 100%;
	}
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

.toggleButton {
	flex-shrink: 0;
	border: none;
	background: transparent;
	margin-inline-end: var(--spacing-5xs);
	color: var(--color-text-base);

	&:hover {
		background: transparent;
	}
}
</style>
