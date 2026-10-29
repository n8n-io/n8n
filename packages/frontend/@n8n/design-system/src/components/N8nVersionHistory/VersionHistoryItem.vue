<script setup lang="ts">
import { computed } from 'vue';

import type { VersionHistoryItem, VersionHistoryStatus } from './VersionHistory.types';
import VersionHistoryRail from './VersionHistoryRail.vue';
import { useI18n } from '../../composables/useI18n';
import N8nActionToggle from '../N8nActionToggle/ActionToggle.vue';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import N8nStatusDot, { type StatusDotAppearance, type StatusDotVariant } from '../N8nStatusDot';
import N8nText from '../N8nText/Text.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

const props = defineProps<{
	item: VersionHistoryItem;
	selected?: boolean;
	/** Line from the top of the row content to the dot. */
	connectAbove?: boolean;
	/** Line from the dot to the bottom of the row content. */
	connectBelow?: boolean;
}>();

const emit = defineEmits<{
	select: [id: string];
	compare: [id: string];
	action: [action: string];
}>();

defineSlots<{
	/** Replaces the compare control and the menu for this row. */
	actions?: (props: { item: VersionHistoryItem }) => unknown;
}>();

// Published and latest are filled. Every other row uses a neutral ring.
const STATUS_DOT: Record<
	VersionHistoryStatus,
	{ variant: StatusDotVariant; appearance: StatusDotAppearance }
> = {
	published: { variant: 'success', appearance: 'fill' },
	latest: { variant: 'warning', appearance: 'fill' },
	default: { variant: 'neutral', appearance: 'outline' },
};

/**
 * The compare control is this icon button on every row.
 * A custom actions slot replaces it.
 */
const compareButtonProps = {
	variant: 'ghost' as const,
	icon: 'file-diff' as const,
	size: 'medium' as const,
};

const { t } = useI18n();

const statusDot = computed(() => STATUS_DOT[props.item.status ?? 'default']);
const actions = computed(() => props.item.actions ?? []);
const compareLabel = computed(() => t('versionHistory.compare'));
const accessibleName = computed(() =>
	[
		props.item.label,
		props.item.detail,
		props.item.author,
		props.item.createdAt,
		props.item.statusLabel,
	]
		.filter((part): part is string => Boolean(part))
		.join(', '),
);

function onSelect() {
	emit('select', props.item.id);
}

function onCompare() {
	if (props.item.compareDisabled) return;
	emit('compare', props.item.id);
}

function onAction(action: string) {
	emit('action', action);
}
</script>

<template>
	<div
		:class="[$style.body, selected && $style.selected]"
		data-test-id="version-history-item"
		:data-version-id="item.id"
	>
		<VersionHistoryRail
			mark="dot"
			:connect-above="connectAbove"
			:connect-below="connectBelow"
			@click="onSelect"
		>
			<N8nStatusDot :variant="statusDot.variant" :appearance="statusDot.appearance" />
		</VersionHistoryRail>
		<button
			type="button"
			:class="$style.select"
			role="menuitem"
			:aria-label="accessibleName"
			:aria-current="selected ? 'true' : undefined"
			data-test-id="version-history-select"
			@click="onSelect"
		>
			<span :class="$style.content">
				<span :class="$style.mainRow">
					<N8nText bold size="small" color="text-dark" :class="$style.label">
						{{ item.label }}
					</N8nText>
					<N8nText v-if="item.detail" size="small" color="text-light" :class="$style.detail">
						<span aria-hidden="true">· </span>{{ item.detail }}
					</N8nText>
				</span>
				<span v-if="item.author || item.createdAt" :class="$style.metaRow">
					<N8nText v-if="item.author" size="small" color="text-base" :class="$style.author">
						{{ item.author }}<template v-if="item.createdAt">, </template>
					</N8nText>
					<time v-if="item.createdAt" :datetime="item.createdAtIso" :class="$style.time">
						<N8nText size="small" color="text-base">{{ item.createdAt }}</N8nText>
					</time>
				</span>
			</span>
		</button>
		<!-- Actions stay outside the select control. A click on them does not select the version. -->
		<div :class="$style.actions">
			<slot name="actions" :item="item">
				<N8nTooltip placement="top" :content="compareLabel" :disabled="item.compareDisabled">
					<N8nIconButton
						v-bind="compareButtonProps"
						:disabled="item.compareDisabled"
						:aria-label="compareLabel"
						data-test-id="version-history-compare"
						@click.stop="onCompare"
					/>
				</N8nTooltip>
				<N8nActionToggle
					v-if="actions.length"
					:actions="actions"
					:disabled="item.actionsDisabled"
					placement="bottom-end"
					@action="onAction"
				/>
			</slot>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/_focus.scss';

.body {
	display: flex;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	padding-inline: var(--version-history--body-pad, var(--spacing--3xs));
	border-radius: var(--radius);
	background-color: transparent;

	&:hover,
	&.selected {
		background-color: var(--color--background--light-1);
	}
}

button.select {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	margin: 0;
	padding: var(--spacing--4xs);
	border: none;
	border-radius: var(--radius);
	appearance: none;
	background-color: transparent;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.mainRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.label {
	flex-shrink: 0;
}

.detail {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metaRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--5xs);
	margin-top: var(--spacing--5xs);
	min-width: 0;
}

.author {
	min-width: 0;
	overflow-wrap: anywhere;
}

.time {
	white-space: nowrap;
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
