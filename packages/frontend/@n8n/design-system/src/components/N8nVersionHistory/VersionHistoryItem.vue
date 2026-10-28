<script setup lang="ts">
import { computed } from 'vue';

import type { VersionHistoryItem } from './VersionHistory.types';
import N8nActionToggle from '../N8nActionToggle/ActionToggle.vue';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import N8nText from '../N8nText/Text.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

const props = defineProps<{
	item: VersionHistoryItem;
	selected?: boolean;
	showCompare?: boolean;
	compareLabel: string;
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

const status = computed(() => props.item.status ?? 'default');
const actions = computed(() => props.item.actions ?? []);
const compareLabel = computed(() => props.item.compareLabel ?? props.compareLabel);

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
	<li
		:class="[$style.item, selected && $style.selected]"
		data-test-id="version-history-item"
		:data-version-id="item.id"
	>
		<button
			type="button"
			:class="$style.select"
			:aria-current="selected ? 'true' : undefined"
			@click="onSelect"
		>
			<span :class="$style.timelineColumn">
				<span
					:class="[$style.indicator, $style[status]]"
					:aria-label="item.statusLabel"
					:aria-hidden="item.statusLabel ? undefined : 'true'"
				/>
			</span>
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
		<div v-if="showCompare || actions.length || $slots.actions" :class="$style.actions">
			<slot name="actions" :item="item">
				<N8nTooltip
					v-if="showCompare"
					placement="top"
					:content="compareLabel"
					:disabled="item.compareDisabled"
				>
					<N8nIconButton
						variant="ghost"
						icon="file-diff"
						size="medium"
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
	</li>
</template>

<style lang="scss" module>
.item {
	display: flex;
	position: relative;
	align-items: center;
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius);
	line-height: var(--line-height--xl);

	&:hover,
	&.selected {
		background-color: var(--color--background--light-1);
	}
}

.select {
	all: unset;
	display: flex;
	flex: 1;
	align-items: center;
	min-width: 0;
	cursor: pointer;
	text-align: start;

	&:focus-visible {
		// Same focus ring as other design-system triggers. No token exists for this width.
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

.timelineColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	min-width: var(--spacing--lg);
	align-self: stretch;
}

.indicator {
	display: inline-block;
	box-sizing: border-box;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
}

.published {
	background-color: var(--color--mint-600);
}

.latest {
	background-color: var(--color--yellow-500);
}

.default {
	border: var(--border);
	border-color: var(--color--text--tint-2);
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
	padding: var(--spacing--3xs);
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
