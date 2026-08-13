<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import LogsViewConsumedTokenCountText from '@/features/execution/logs/components/LogsViewConsumedTokenCountText.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import upperFirst from 'lodash/upperFirst';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { toDayMonth, toTime } from '@/app/utils/formatters/dateFormatter';
import LogsViewNodeName from '@/features/execution/logs/components/LogsViewNodeName.vue';
import {
	getGroupExecutionStatus,
	getGroupTiming,
	getSubtreeTotalConsumedTokens,
	hasSubExecution,
} from '@/features/execution/logs/logs.utils';
import { useTimestamp } from '@vueuse/core';
import {
	type LatestNodeInfo,
	type LogEntry,
	isGroupLog,
	isNodeLog,
} from '@/features/execution/logs/logs.types';

import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import AnimatedSpinner from '@/app/components/AnimatedSpinner.vue';
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
const nodeData = computed(() => (isNodeLog(props.data) ? props.data : undefined));
const groupData = computed(() => (isGroupLog(props.data) ? props.data : undefined));
const runData = computed(() => nodeData.value?.runData);
const type = computed(() =>
	nodeData.value ? nodeTypeStore.getNodeType(nodeData.value.node.type) : null,
);
const displayName = computed(() =>
	groupData.value
		? groupData.value.group.name
		: (props.latestInfo?.name ?? nodeData.value?.node.name ?? ''),
);
// Groups have no run data of their own; derive their status from members
const groupStatus = computed(() =>
	groupData.value ? getGroupExecutionStatus(groupData.value) : undefined,
);
const isRunning = computed(() =>
	groupData.value ? groupStatus.value === 'running' : runData.value?.executionStatus === 'running',
);
const isWaiting = computed(() =>
	groupData.value ? groupStatus.value === 'waiting' : runData.value?.executionStatus === 'waiting',
);
const isSettled = computed(() => !isRunning.value && !isWaiting.value);
const isError = computed(() =>
	groupData.value ? groupData.value.hasError : !!runData.value?.error,
);
const statusTextKeyPath = computed<BaseTextKey>(() =>
	isSettled.value ? 'logs.overview.body.summaryText.in' : 'logs.overview.body.summaryText.for',
);
// Groups have no run data of their own; aggregate their members instead.
// Feed the live clock while unsettled so the total ticks up during execution.
const groupTiming = computed(() =>
	groupData.value
		? getGroupTiming(groupData.value, isSettled.value ? undefined : now.value)
		: undefined,
);
const startTime = computed(() =>
	groupData.value ? groupTiming.value?.startTime : runData.value?.startTime,
);
const startedAtText = computed(() => {
	if (startTime.value === undefined) {
		return '—';
	}

	const time = new Date(startTime.value);

	return locale.baseText('logs.overview.body.started', {
		interpolate: {
			time: `${toTime(time, true)}, ${toDayMonth(time)}`,
		},
	});
});
const statusText = computed(() =>
	upperFirst(groupData.value ? (groupStatus.value ?? '') : (runData.value?.executionStatus ?? '')),
);
const timeText = computed(() => {
	if (groupData.value) {
		if (!groupTiming.value) {
			return undefined;
		}

		return locale.displayTimer(
			isSettled.value
				? groupTiming.value.executionTime
				: Math.floor(groupTiming.value.executionTime / 1000) * 1000,
			true,
		);
	}

	return runData.value
		? locale.displayTimer(
				isSettled.value
					? runData.value.executionTime
					: Math.floor((now.value - runData.value.startTime) / 1000) * 1000,
				true,
			)
		: undefined;
});

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
				// Don't steal focus if the chat input is currently focused
				const activeElement = document.activeElement;
				const isChatInputFocused =
					activeElement?.getAttribute('data-test-id') === 'chat-input' ||
					activeElement?.closest('[data-test-id="canvas-chat"]') !== null;

				if (!isChatInputFocused) {
					container.value?.focus();
				}
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
		<NodeIcon v-if="!groupData" :node-type="type" :size="16" :class="$style.icon" />
		<LogsViewNodeName
			:class="[$style.name, groupData ? $style.groupName : '']"
			:name="displayName"
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
		<N8nTooltip
			v-if="canOpenNdv && (!isCompact || !props.latestInfo?.deleted)"
			:content="locale.baseText('logs.overview.body.openTooltip')"
			as-child
		>
			<N8nIconButton
				v-if="!groupData && canOpenNdv && (!isCompact || !props.latestInfo?.deleted)"
				variant="ghost"
				size="small"
				icon="square-pen"
				icon-size="medium"
				:style="{
					visibility: props.data.isSubExecution ? 'hidden' : undefined,
				}"
				:disabled="props.latestInfo?.deleted"
				:class="$style.openNdvButton"
				:aria-label="locale.baseText('logs.overview.body.open')"
				@click.stop="emit('openNdv')"
			/>
		</N8nTooltip>
		<N8nTooltip
			v-if="
				!isCompact ||
				(!props.isReadOnly && !props.latestInfo?.deleted && !props.latestInfo?.disabled)
			"
			:content="locale.baseText('logs.overview.body.run')"
			as-child
		>
			<N8nIconButton
				v-if="
					!groupData &&
					(!isCompact ||
						(!props.isReadOnly && !props.latestInfo?.deleted && !props.latestInfo?.disabled))
				"
				variant="ghost"
				size="small"
				icon="play"
				:aria-label="locale.baseText('logs.overview.body.run')"
				:class="[$style.partialExecutionButton, indents.length > 0 ? $style.unavailable : '']"
				:disabled="props.latestInfo?.deleted || props.latestInfo?.disabled"
				@click.stop="emit('triggerPartialExecution')"
			/>
		</N8nTooltip>
		<!-- Groups omit the action buttons above; reserve their width so columns stay aligned with node rows -->
		<template v-if="groupData && !isCompact">
			<div v-if="canOpenNdv" :class="$style.buttonSpacer" />
			<div :class="$style.buttonSpacer" />
		</template>
		<template v-if="isCompact && !hasChildren">
			<AnimatedSpinner v-if="isRunning" :class="$style.statusIcon" />
			<N8nIcon v-else-if="isWaiting" icon="status-waiting" :class="$style.statusIcon" />
		</template>
		<N8nButton
			v-if="!isCompact || hasChildren"
			variant="ghost"
			iconOnly
			size="small"
			:icon="props.expanded ? 'chevron-down' : 'chevron-up'"
			icon-size="medium"
			:style="{
				visibility: hasChildren ? undefined : 'hidden',
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
	/* stylelint-disable-next-line @n8n/css-var-naming */
	left: calc(var(--indent-depth) * 32px);
	top: 0;
	/* stylelint-disable-next-line @n8n/css-var-naming */
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
		background-color: var(--callout--color--background--danger);
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
		border: 2px solid var(--canvas--dot--color);
		width: var(--spacing--lg);
		height: var(--spacing--lg);
		border-radius: var(--radius--lg);
	}

	&.connectorStraight:after {
		content: '';
		position: absolute;
		left: var(--spacing--sm);
		top: 0;
		border-left: 2px solid var(--canvas--dot--color);
		height: 100%;
	}
}

.icon {
	flex-grow: 0;
	flex-shrink: 0;
}

.name {
	flex-basis: 0;
	flex-grow: 1;
	padding-inline-start: 0;
}

/* Groups have no icon, so inset the label to match where node labels start */
.groupName {
	padding-inline-start: var(--spacing--2xs);
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

/* Matches a single small icon button's footprint (row padding comes from .container > *) */
.buttonSpacer {
	flex-grow: 0;
	flex-shrink: 0;
	width: var(--height--sm);
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
