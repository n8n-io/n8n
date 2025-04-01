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
import ConsumedTokenCountText from '@/components/CanvasChat/future/components/ConsumedTokenCountText.vue';

const props = defineProps<{
	data: TreeNode;
	node: ElTreeNode;
	isSelected: boolean;
	shouldShowConsumedTokens: boolean;
}>();

const emit = defineEmits<{ toggleExpanded: [node: ElTreeNode] }>();

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
const timeTookText = computed(() => {
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
					time: locale.displayTimer(runData.value.executionTime, true),
				},
			})
		: statusText;
});
const startedAtText = computed(() =>
	locale.baseText('logs.overview.body.started', {
		interpolate: {
			time: new Date(runData.value?.startTime ?? 0).toISOString(), // TODO: confirm date format
		},
	}),
);

const subtreeConsumedTokens = computed(() =>
	props.shouldShowConsumedTokens ? getSubtreeTotalConsumedTokens(props.data) : undefined,
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
</script>

<template>
	<div
		v-if="node !== undefined"
		:class="{ [$style.container]: true, [$style.selected]: props.isSelected }"
	>
		<template v-for="level in depth" :key="level">
			<div
				:class="{
					[$style.indent]: true,
					[$style.connectorCurved]: level === depth,
					[$style.connectorStraight]: !isLastChild(level),
				}"
			/>
		</template>
		<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
		<N8nText tag="div" :bold="true" size="small" :class="$style.name">{{ node.name }}</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.timeTook">{{
			timeTookText
		}}</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.startedAt">{{
			startedAtText
		}}</N8nText>
		<N8nText
			v-if="subtreeConsumedTokens !== undefined"
			tag="div"
			color="text-light"
			size="small"
			:class="$style.consumedTokens"
		>
			<ConsumedTokenCountText
				v-if="
					subtreeConsumedTokens.totalTokens > 0 &&
					(props.data.children.length === 0 || !props.node.expanded)
				"
				:consumed-tokens="subtreeConsumedTokens"
			/>
		</N8nText>
		<div>
			<N8nIconButton
				type="secondary"
				size="medium"
				:icon="props.node.expanded ? 'chevron-down' : 'chevron-up'"
				:style="{
					visibility: props.data.children.length === 0 ? 'hidden' : '',
					color: 'var(--color-text-base)', // give higher specificity than the style from the component itself
				}"
				:class="$style.toggleButton"
				@click.stop="emit('toggleExpanded', props.node)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: stretch;
	justify-content: stretch;
	overflow: hidden;

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: var(--spacing-2xs);
	}

	& > :has(.toggleButton) {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding: 0;
	}

	& > .icon {
		border-top-left-radius: var(--border-radius-base);
		border-bottom-left-radius: var(--border-radius-base);
	}

	& > :last-of-type {
		border-top-right-radius: var(--border-radius-base);
		border-bottom-right-radius: var(--border-radius-base);
	}

	&.selected > :not(.indent),
	&:hover > :not(.indent) {
		background-color: var(--color-foreground-base);
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
	flex-grow: 0;
	flex-shrink: 0;
}

.name {
	flex-grow: 1;
	padding-inline-start: 0;
}

.timeTook {
	flex-grow: 0;
	flex-shrink: 0;
	width: 20%;
}

.startedAt {
	flex-grow: 0;
	flex-shrink: 0;
	width: 30%;
}

.consumedTokens {
	flex-grow: 0;
	flex-shrink: 0;
	width: 10%;
	text-align: right;
}

.toggleButton {
	border: none;
	background: transparent;
	margin-inline-end: var(--spacing-5xs);

	&:hover {
		background: transparent;
	}
}
</style>
