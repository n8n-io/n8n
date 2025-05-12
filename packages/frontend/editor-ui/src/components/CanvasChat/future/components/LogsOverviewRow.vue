<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { upperFirst } from 'lodash-es';
import { useI18n } from '@/composables/useI18n';
import ConsumedTokenCountText from '@/components/CanvasChat/future/components/ConsumedTokenCountText.vue';
import { I18nT } from 'vue-i18n';
import { toDayMonth, toTime } from '@/utils/formatters/dateFormatter';
import NodeName from '@/components/CanvasChat/future/components/NodeName.vue';
import {
	getSubtreeTotalConsumedTokens,
	type LatestNodeInfo,
	type LogEntry,
} from '@/components/RunDataAi/utils';

const props = defineProps<{
	data: LogEntry;
	isSelected: boolean;
	isReadOnly: boolean;
	shouldShowConsumedTokens: boolean;
	isCompact: boolean;
	latestInfo?: LatestNodeInfo;
	expanded: boolean;
}>();

const emit = defineEmits<{
	toggleExpanded: [node: LogEntry];
	triggerPartialExecution: [node: LogEntry];
	openNdv: [node: LogEntry];
}>();

const locale = useI18n();
const nodeTypeStore = useNodeTypesStore();
const type = computed(() => nodeTypeStore.getNodeType(props.data.node.type));
const isSettled = computed(
	() =>
		props.data.runData.executionStatus &&
		['crashed', 'error', 'success'].includes(props.data.runData.executionStatus),
);
const isError = computed(() => !!props.data.runData.error);
const startedAtText = computed(() => {
	const time = new Date(props.data.runData.startTime);

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
	let data: LogEntry | undefined = props.data;

	for (let i = 0; i < props.data.depth - level; i++) {
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
</script>

<template>
	<div
		role="treeitem"
		tabindex="0"
		:aria-expanded="props.data.children.length > 0 && props.expanded"
		:aria-selected="props.isSelected"
		:class="{
			[$style.container]: true,
			[$style.compact]: props.isCompact,
			[$style.error]: isError,
			[$style.selected]: props.isSelected,
		}"
	>
		<template v-for="level in props.data.depth" :key="level">
			<div
				:class="{
					[$style.indent]: true,
					[$style.connectorCurved]: level === props.data.depth,
					[$style.connectorStraight]: !isLastChild(level),
				}"
			/>
		</template>
		<div :class="$style.background" :style="{ '--indent-depth': props.data.depth }" />
		<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
		<NodeName
			:class="$style.name"
			:latest-name="latestInfo?.name ?? props.data.node.name"
			:name="props.data.node.name"
			:is-error="isError"
			:is-deleted="latestInfo?.deleted ?? false"
		/>
		<N8nText v-if="!isCompact" tag="div" color="text-light" size="small" :class="$style.timeTook">
			<I18nT v-if="isSettled" keypath="logs.overview.body.summaryText">
				<template #status>
					<N8nText v-if="isError" color="danger" :bold="true" size="small">
						<N8nIcon icon="exclamation-triangle" :class="$style.errorIcon" />{{
							upperFirst(props.data.runData.executionStatus)
						}}
					</N8nText>
					<template v-else>{{ upperFirst(props.data.runData.executionStatus) }}</template>
				</template>
				<template #time>{{ locale.displayTimer(props.data.runData.executionTime, true) }}</template>
			</I18nT>
			<template v-else>{{ upperFirst(props.data.runData.executionStatus) }}</template></N8nText
		>
		<N8nText
			v-if="!isCompact"
			tag="div"
			color="text-light"
			size="small"
			:class="$style.startedAt"
			>{{ startedAtText }}</N8nText
		>
		<N8nText
			v-if="!isCompact && subtreeConsumedTokens !== undefined"
			tag="div"
			color="text-light"
			size="small"
			:class="$style.consumedTokens"
		>
			<ConsumedTokenCountText
				v-if="
					subtreeConsumedTokens.totalTokens > 0 &&
					(props.data.children.length === 0 || !props.expanded)
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
			v-if="!isCompact || !props.latestInfo?.deleted"
			type="secondary"
			size="medium"
			icon="edit"
			style="color: var(--color-text-base)"
			:disabled="props.latestInfo?.deleted"
			:class="$style.openNdvButton"
			:aria-label="locale.baseText('logs.overview.body.open')"
			@click.stop="emit('openNdv', props.data)"
		/>
		<N8nIconButton
			v-if="
				!isCompact ||
				(!props.isReadOnly && !props.latestInfo?.deleted && !props.latestInfo?.disabled)
			"
			type="secondary"
			size="small"
			icon="play"
			style="color: var(--color-text-base)"
			:aria-label="locale.baseText('logs.overview.body.run')"
			:class="[$style.partialExecutionButton, props.data.depth > 0 ? $style.unavailable : '']"
			:disabled="props.latestInfo?.deleted || props.latestInfo?.disabled"
			@click.stop="emit('triggerPartialExecution', props.data)"
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
			@click.stop="emit('toggleExpanded', props.data)"
		>
			<N8nIcon size="medium" :icon="props.expanded ? 'chevron-down' : 'chevron-up'" />
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

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: var(--spacing-2xs);
	}
}

.background {
	position: absolute;
	left: calc(var(--indent-depth) * 32px);
	top: 0;
	width: calc(100% - var(--indent-depth) * 32px);
	height: 100%;
	border-radius: var(--border-radius-base);
	z-index: -1;

	.selected & {
		background-color: var(--color-foreground-base);
	}

	.container:hover:not(.selected) & {
		background-color: var(--color-background-light-base);
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
}

.startedAt {
	flex-grow: 0;
	flex-shrink: 0;
	width: 25%;
}

.consumedTokens {
	flex-grow: 0;
	flex-shrink: 0;
	width: 15%;
	text-align: right;
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
	color: var(--color-text-base);
	align-items: center;
	justify-content: center;

	&:last-child {
		margin-inline-end: var(--spacing-5xs);
	}

	&:hover {
		background: transparent;
	}

	&:disabled {
		visibility: hidden !important;
	}
}

.toggleButton {
	display: inline-flex;
}
</style>
