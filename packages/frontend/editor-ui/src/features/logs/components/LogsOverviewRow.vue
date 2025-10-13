<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import LogsViewConsumedTokenCountText from '@/features/logs/components/LogsViewConsumedTokenCountText.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import upperFirst from 'lodash/upperFirst';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { toDayMonth, toTime } from '@/utils/formatters/dateFormatter';
import LogsViewNodeName from '@/features/logs/components/LogsViewNodeName.vue';
import { getSubtreeTotalConsumedTokens, hasSubExecution } from '@/features/logs/logs.utils';
import { useTimestamp } from '@vueuse/core';
import type { LatestNodeInfo, LogEntry } from '@/features/logs/logs.types';

import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import AnimatedSpinner from '@/components/AnimatedSpinner.vue';
const props = defineProps<{
	data: LogEntry;
	isSelected: boolean;
	isReadOnly: boolean;
	shouldShowTokenCountColumn: boolean;
	isCompact: boolean;
	latestInfo?: LatestNodeInfo;
	expanded: boolean;
	canOpenNdv: boolean;
}>();

const emit = defineEmits<{
	toggleExpanded: [];
	toggleSelected: [];
	triggerPartialExecution: [];
	openNdv: [];
}>();

const container = useTemplateRef('containerRef');
const locale = useI18n();
const now = useTimestamp({ interval: 1000 });
const nodeTypeStore = useNodeTypesStore();
const type = computed(() => nodeTypeStore.getNodeType(props.data.node.type));
const isRunning = computed(() => props.data.runData?.executionStatus === 'running');
const isWaiting = computed(() => props.data.runData?.executionStatus === 'waiting');
const isSettled = computed(() => !isRunning.value && !isWaiting.value);
const isError = computed(() => !!props.data.runData?.error);
const statusTextKeyPath = computed<BaseTextKey>(() =>
	isSettled.value ? 'logs.overview.body.summaryText.in' : 'logs.overview.body.summaryText.for',
);
const startedAtText = computed(() => {
	if (props.data.runData === undefined) {
		return '—';
	}

	const time = new Date(props.data.runData.startTime);

	return locale.baseText('logs.overview.body.started', {
		interpolate: {
			time: `${toTime(time, true)}, ${toDayMonth(time)}`,
		},
	});
});
const statusText = computed(() => upperFirst(props.data.runData?.executionStatus ?? ''));
const timeText = computed(() =>
	props.data.runData
		? locale.displayTimer(
				isSettled.value
					? props.data.runData.executionTime
					: Math.floor((now.value - props.data.runData.startTime) / 1000) * 1000,
				true,
			)
		: undefined,
);

const subtreeConsumedTokens = computed(() =>
	props.shouldShowTokenCountColumn ? getSubtreeTotalConsumedTokens(props.data, false) : undefined,
);

const hasChildren = computed(() => props.data.children.length > 0 || hasSubExecution(props.data));

const indents = computed(() => {
	const ret: Array<{ straight: boolean; curved: boolean }> = [];

	let data: LogEntry = props.data;

	while (data.parent !== undefined) {
		const siblings = data.parent?.children ?? [];
		const lastSibling = siblings[siblings.length - 1];

		ret.unshift({ straight: lastSibling?.id !== data.id, curved: data === props.data });
		data = data.parent;
	}

	return ret;
});

// Focus when selected: For scrolling into view and for keyboard navigation to work
watch(
	() => props.isSelected,
	(isSelected) => {
		void nextTick(() => {
			if (isSelected) {
				container.value?.focus();
			}
		});
	},
	{ immediate: true },
);
</script>

<template>
	<div
		ref="containerRef"
		role="treeitem"
		tabindex="-1"
		:aria-expanded="props.data.children.length > 0 && props.expanded"
		:aria-selected="props.isSelected"
		:class="{
			[$style.container]: true,
			[$style.compact]: props.isCompact,
			[$style.error]: isError,
			[$style.selected]: props.isSelected,
		}"
		@click.stop="emit('toggleSelected')"
	>
		<div
			v-for="(indent, level) in indents"
			:key="level"
			:class="{
				[$style.indent]: true,
				[$style.connectorCurved]: indent.curved,
				[$style.connectorStraight]: indent.straight,
			}"
		/>
		<div :class="$style.background" :style="{ '--indent-depth': indents.length }" />
		<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
		<LogsViewNodeName
			:class="$style.name"
			:name="latestInfo?.name ?? props.data.node.name"
			:is-error="isError"
			:is-deleted="latestInfo?.deleted ?? false"
		/>
		<N8nText v-if="!isCompact" tag="div" color="text-light" size="small" :class="$style.timeTook">
			<I18nT v-if="timeText !== undefined" :keypath="statusTextKeyPath" scope="global">
				<template #status>
					<N8nText :color="isError ? 'danger' : undefined" :bold="isError" size="small">
						<AnimatedSpinner v-if="isRunning" :class="$style.statusTextIcon" />
						<N8nIcon v-else-if="isWaiting" icon="status-waiting" :class="$style.statusTextIcon" />
						<N8nIcon v-else-if="isError" icon="triangle-alert" :class="$style.statusTextIcon" />
						{{ statusText }}
					</N8nText>
				</template>
				<template #time>{{ timeText }}</template>
			</I18nT>
			<template v-else>—</template>
		</N8nText>
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
			<LogsViewConsumedTokenCountText
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
			icon="triangle-alert"
			:class="$style.compactErrorIcon"
		/>
		<N8nIconButton
			v-if="canOpenNdv && (!isCompact || !props.latestInfo?.deleted)"
			type="secondary"
			size="small"
			icon="square-pen"
			icon-size="medium"
			:style="{
				visibility: props.data.isSubExecution ? 'hidden' : '',
			}"
			:disabled="props.latestInfo?.deleted"
			:class="$style.openNdvButton"
			:aria-label="locale.baseText('logs.overview.body.open')"
			@click.stop="emit('openNdv')"
		/>
		<N8nIconButton
			v-if="
				!isCompact ||
				(!props.isReadOnly && !props.latestInfo?.deleted && !props.latestInfo?.disabled)
			"
			type="secondary"
			size="small"
			icon="play"
			:aria-label="locale.baseText('logs.overview.body.run')"
			:class="[$style.partialExecutionButton, indents.length > 0 ? $style.unavailable : '']"
			:disabled="props.latestInfo?.deleted || props.latestInfo?.disabled"
			@click.stop="emit('triggerPartialExecution')"
		/>
		<template v-if="isCompact && !hasChildren">
			<AnimatedSpinner v-if="isRunning" :class="$style.statusIcon" />
			<N8nIcon v-else-if="isWaiting" icon="status-waiting" :class="$style.statusIcon" />
		</template>
		<N8nButton
			v-if="!isCompact || hasChildren"
			type="secondary"
			size="small"
			:icon="props.expanded ? 'chevron-down' : 'chevron-up'"
			icon-size="medium"
			:square="true"
			:style="{
				visibility: hasChildren ? '' : 'hidden',
			}"
			:class="$style.toggleButton"
			:aria-label="locale.baseText('logs.overview.body.toggleRow')"
			@click.stop="emit('toggleExpanded')"
		/>
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
	padding-inline-end: var(--spacing--5xs);
	cursor: pointer;

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: var(--spacing--2xs);
	}
}

.background {
	position: absolute;
	left: calc(var(--indent-depth) * 32px);
	top: 0;
	width: calc(100% - var(--indent-depth) * 32px);
	height: 100%;
	border-radius: var(--radius);
	z-index: -1;

	.selected & {
		background-color: var(--color--foreground);
	}

	.container:hover:not(.selected) & {
		background-color: var(--color--background--light-1);
	}

	.selected:not(:hover).error & {
		background-color: var(--color-callout-danger-background);
	}
}

.indent {
	flex-grow: 0;
	flex-shrink: 0;
	width: var(--spacing--xl);
	align-self: stretch;
	position: relative;
	overflow: hidden;
	margin-bottom: 0;

	&.connectorCurved:before {
		content: '';
		position: absolute;
		left: var(--spacing--sm);
		bottom: var(--spacing--sm);
		border: 2px solid var(--color-canvas-dot);
		width: var(--spacing--lg);
		height: var(--spacing--lg);
		border-radius: var(--radius--lg);
	}

	&.connectorStraight:after {
		content: '';
		position: absolute;
		left: var(--spacing--sm);
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

	.statusTextIcon {
		margin-right: var(--spacing--5xs);
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
	width: 26px;
	display: flex;
	align-items: center;
	justify-content: center;

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
	color: var(--color--text);
	align-items: center;
	justify-content: center;

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

.statusIcon {
	color: var(--color--text--tint-1);
	flex-grow: 0;
	flex-shrink: 0;
	width: 26px;
	height: 26px;
	padding: var(--spacing--3xs);

	&.placeholder {
		color: transparent;
	}
}
</style>
