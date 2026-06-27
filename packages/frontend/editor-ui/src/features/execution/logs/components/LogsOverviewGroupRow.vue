<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import LogsViewConsumedTokenCountText from '@/features/execution/logs/components/LogsViewConsumedTokenCountText.vue';
import LogsViewNodeName from '@/features/execution/logs/components/LogsViewNodeName.vue';
import { getSubtreeTotalConsumedTokens } from '@/features/execution/logs/logs.utils';
import { useLogsTreeIndents } from '@/features/execution/logs/composables/useLogsTreeIndents';
import type { LogGroupEntry } from '@/features/execution/logs/logs.types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import AnimatedSpinner from '@/app/components/AnimatedSpinner.vue';

const props = defineProps<{
	data: LogGroupEntry;
	isSelected: boolean;
	isCompact: boolean;
	shouldShowTokenCountColumn: boolean;
	expanded: boolean;
}>();

const emit = defineEmits<{
	toggleExpanded: [];
	toggleSelected: [];
}>();

const container = useTemplateRef('containerRef');
const locale = useI18n();

const indents = useLogsTreeIndents(() => props.data);

const status = computed(() => props.data.executionStatus);
const isRunning = computed(() => status.value === 'running');
const isWaiting = computed(() => status.value === 'waiting');
const isError = computed(() => status.value === 'error');
const isWarning = computed(() => status.value === 'warning' || status.value === 'issues');
const isSuccess = computed(() => status.value === 'success');

const memberCountText = computed(() =>
	locale.baseText('logs.overview.body.group.nodeCount', {
		adjustToNumber: props.data.executedMemberCount,
		interpolate: { count: props.data.executedMemberCount },
	}),
);

const subtreeConsumedTokens = computed(() =>
	props.shouldShowTokenCountColumn ? getSubtreeTotalConsumedTokens(props.data, false) : undefined,
);

// Focus when selected: for scrolling into view and keyboard navigation to work
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
		data-test-id="logs-overview-group-row"
		:aria-expanded="props.expanded"
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
		<LogsViewNodeName :class="$style.name" :name="data.group.name" :is-error="isError" />
		<N8nText tag="span" color="text-light" size="small" :class="$style.count">
			{{ memberCountText }}
		</N8nText>
		<N8nText v-if="!isCompact" tag="div" color="text-light" size="small" :class="$style.status">
			<AnimatedSpinner v-if="isRunning" :class="$style.statusIcon" />
			<N8nIcon v-else-if="isWaiting" icon="status-waiting" :class="$style.statusIcon" />
			<N8nText v-else-if="isError" color="danger" :bold="true" size="small">
				<N8nIcon icon="triangle-alert" :class="$style.statusIcon" />
			</N8nText>
			<N8nIcon v-else-if="isWarning" icon="status-warning" :class="$style.statusIcon" />
			<N8nIcon v-else-if="isSuccess" icon="circle-check" :class="$style.statusIcon" />
		</N8nText>
		<N8nText
			v-if="!isCompact && subtreeConsumedTokens !== undefined"
			tag="div"
			color="text-light"
			size="small"
			:class="$style.consumedTokens"
		>
			<LogsViewConsumedTokenCountText
				v-if="subtreeConsumedTokens.totalTokens > 0 && !props.expanded"
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
		<N8nButton
			variant="ghost"
			icon-only
			size="small"
			:icon="props.expanded ? 'chevron-down' : 'chevron-up'"
			icon-size="medium"
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

.name {
	flex-shrink: 1;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	margin-left: var(--row-gap-thickness);
	overflow: hidden;
	text-overflow: ellipsis;
}

.count {
	flex-grow: 1;
	flex-shrink: 0;
	padding-inline-start: 0;
}

.status {
	flex-grow: 0;
	flex-shrink: 0;
	width: 20%;

	.statusIcon {
		vertical-align: text-bottom;
	}
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

.toggleButton {
	display: inline-flex;
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
}
</style>
