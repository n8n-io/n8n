<script setup lang="ts">
import { type TreeNode as ElTreeNode } from 'element-plus';
import { getSubtreeTotalConsumedTokens, type TreeNode } from '@/components/RunDataAi/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, useTemplateRef, watch } from 'vue';
import { type INodeUi } from '@/Interface';
import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { type ITaskData } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { upperFirst } from 'lodash-es';
import { useI18n } from '@/composables/useI18n';
import ConsumedTokenCountText from '@/components/CanvasChat/future/components/ConsumedTokenCountText.vue';
import { I18nT } from 'vue-i18n';
import { toDayMonth, toTime } from '@/utils/formatters/dateFormatter';

const props = defineProps<{
	data: TreeNode;
	node: ElTreeNode;
	isSelected: boolean;
	isReadOnly: boolean;
	shouldShowConsumedTokens: boolean;
	isCompact: boolean;
}>();

const emit = defineEmits<{
	toggleExpanded: [node: ElTreeNode];
	triggerPartialExecution: [node: TreeNode];
	openNdv: [node: TreeNode];
}>();

const locale = useI18n();
const containerRef = useTemplateRef('containerRef');
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
const isSettled = computed(
	() =>
		runData.value?.executionStatus &&
		['crashed', 'error', 'success'].includes(runData.value.executionStatus),
);
const isError = computed(() => !!runData.value?.error);
const startedAtText = computed(() => {
	const time = new Date(runData.value?.startTime ?? 0);

	return locale.baseText('logs.overview.body.started', {
		interpolate: {
			time: `${toTime(time, true)}, ${toDayMonth(time)}`,
		},
	});
});

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
	const lastSibling = siblings[siblings.length - 1];

	return (
		(data === undefined && lastSibling === undefined) ||
		(data?.node === lastSibling?.node && data?.runIndex === lastSibling?.runIndex)
	);
}

// When selected, scroll into view
watch(
	[() => props.isSelected, containerRef],
	([isSelected, ref]) => {
		if (isSelected && ref) {
			ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div
		v-if="node !== undefined"
		ref="containerRef"
		:class="{
			[$style.container]: true,
			[$style.compact]: props.isCompact,
			[$style.error]: isError,
			[$style.selected]: props.isSelected,
		}"
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
		<div :class="$style.background" :style="{ '--indent-depth': depth }" />
		<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
		<N8nText
			tag="div"
			:bold="true"
			size="small"
			:class="$style.name"
			:color="isError ? 'danger' : undefined"
			>{{ node.name }}
		</N8nText>
		<N8nText tag="div" color="text-light" size="small" :class="$style.timeTook">
			<I18nT v-if="isSettled && runData" keypath="logs.overview.body.summaryText">
				<template #status>
					<N8nText v-if="isError" color="danger" :bold="true" size="small">
						<N8nIcon icon="exclamation-triangle" :class="$style.errorIcon" />{{
							upperFirst(runData.executionStatus)
						}}
					</N8nText>
					<template v-else>{{ upperFirst(runData.executionStatus) }}</template>
				</template>
				<template #time>{{ locale.displayTimer(runData.executionTime, true) }}</template>
			</I18nT>
			<template v-else>{{ upperFirst(runData?.executionStatus) }}</template></N8nText
		>
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
		<N8nIcon
			v-if="isError && isCompact"
			size="medium"
			color="danger"
			icon="exclamation-triangle"
			:class="$style.compactErrorIcon"
		/>
		<N8nIconButton
			v-if="!props.isReadOnly"
			type="secondary"
			size="small"
			icon="play"
			style="color: var(--color-text-base)"
			:aria-label="locale.baseText('logs.overview.body.run')"
			:class="[$style.partialExecutionButton, depth > 0 ? $style.unavailable : '']"
			@click.stop="emit('triggerPartialExecution', props.data)"
		/>
		<N8nIconButton
			type="secondary"
			size="small"
			icon="external-link-alt"
			style="color: var(--color-text-base)"
			:class="$style.openNdvButton"
			:aria-label="locale.baseText('logs.overview.body.open')"
			@click.stop="emit('openNdv', props.data)"
		/>
		<N8nButton
			v-if="!isCompact || props.data.children.length > 0"
			type="secondary"
			size="small"
			:square="true"
			:style="{
				visibility: props.data.children.length === 0 ? 'hidden' : '',
				color: 'var(--color-text-base)', // give higher specificity than the style from the component itself
			}"
			:class="$style.toggleButton"
			:aria-label="locale.baseText('logs.overview.body.toggleRow')"
			@click.stop="emit('toggleExpanded', props.node)"
		>
			<N8nIcon size="medium" :icon="props.node.expanded ? 'chevron-down' : 'chevron-up'" />
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: stretch;
	overflow: hidden;
	position: relative;
	z-index: 1;

	--row-gap-thickness: 1px;

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: var(--spacing-2xs);
		margin-bottom: var(--row-gap-thickness);
	}
}

.background {
	position: absolute;
	left: calc(var(--row-gap-thickness) + var(--indent-depth) * 32px);
	top: 0;
	width: calc(100% - var(--indent-depth) * 32px - var(--row-gap-thickness));
	height: calc(100% - var(--row-gap-thickness));
	border-radius: var(--border-radius-base);
	z-index: -1;

	.selected &,
	.container:hover & {
		background-color: var(--color-foreground-base);
	}

	.selected:not(:hover).error & {
		background-color: var(--color-danger-tint-2);
	}
}

.indent {
	flex-grow: 0;
	flex-shrink: 0;
	width: var(--spacing-xl);
	align-self: stretch;
	position: relative;
	overflow: hidden;
	margin-bottom: 0;

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
	margin-left: var(--row-gap-thickness);
	flex-grow: 0;
	flex-shrink: 0;
}

.name {
	flex-basis: 0;
	flex-grow: 1;
	padding-inline-start: 0;
}

.timeTook {
	flex-grow: 0;
	flex-shrink: 0;
	width: 20%;

	.errorIcon {
		margin-right: var(--spacing-4xs);
		vertical-align: text-bottom;
	}

	.compact & {
		flex-shrink: 1;
	}

	.compact:hover & {
		width: auto;
	}

	.compact:not(:hover) & {
		display: none;
	}
}

.startedAt {
	flex-grow: 0;
	flex-shrink: 0;
	width: 30%;

	.compact & {
		display: none;
	}
}

.consumedTokens {
	flex-grow: 0;
	flex-shrink: 0;
	width: 10%;
	text-align: right;

	.compact & {
		flex-shrink: 1;
	}

	.compact:hover & {
		width: auto;
	}

	.compact &:empty,
	.compact:not(:hover) & {
		display: none;
	}
}

.compactErrorIcon {
	flex-grow: 0;
	flex-shrink: 0;

	.container:hover & {
		display: none;
	}
}

.partialExecutionButton,
.openNdvButton {
	transition: none;

	/* By default, take space but keep invisible */
	visibility: hidden;

	.container.compact & {
		/* When compact, collapse to save space */
		display: none;
	}

	.container:hover &:not(.unavailable) {
		visibility: visible;
		display: inline-flex;
	}
}

.partialExecutionButton,
.openNdvButton,
.toggleButton {
	flex-grow: 0;
	flex-shrink: 0;
	border: none;
	background: transparent;
	margin-inline-end: var(--spacing-5xs);
	color: var(--color-text-base);
	align-items: center;
	justify-content: center;

	&:hover {
		background: transparent;
	}
}

.toggleButton {
	display: inline-flex;
}
</style>
