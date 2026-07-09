<script setup lang="ts">
import { CollapsibleRoot } from 'reka-ui';
import { computed, ref, useId, watch } from 'vue';

import type { AiTraceChipItem } from './types';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

/**
 * Horizontal strip of icon chips representing agent trace steps (tool calls,
 * reasoning). Hover shows the full label, click expands the detail panel
 * below the strip. At most one chip per strip is expanded at a time —
 * clicking another chip swaps the panel content in place.
 */
const props = defineProps<{
	items: AiTraceChipItem[];
}>();

const expandedId = defineModel<string | null>('expandedId', { default: null });

defineSlots<{
	panel?: (props: { item: AiTraceChipItem }) => unknown;
}>();

const panelId = useId();

const expandedItem = computed(
	() => props.items.find((item) => item.id === expandedId.value) ?? null,
);

/** Kept through the collapse animation so the panel doesn't empty mid-close. */
const renderedItem = ref<AiTraceChipItem | null>(null);
watch(expandedItem, (item) => {
	if (item) renderedItem.value = item;
});

function toggle(item: AiTraceChipItem) {
	expandedId.value = expandedId.value === item.id ? null : item.id;
}

/** Label is visible inline while loading or expanded — skip the tooltip then. */
function showsLabel(item: AiTraceChipItem): boolean {
	return Boolean(item.loading) || expandedId.value === item.id;
}
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.strip" role="group">
			<N8nTooltip
				v-for="item in props.items"
				:key="item.id"
				placement="top"
				:disabled="showsLabel(item) && !item.error"
			>
				<template #content>
					<div>{{ item.label }}</div>
					<div v-if="item.error" :class="$style.tooltipError">{{ item.error }}</div>
				</template>
				<button
					type="button"
					:class="{
						[$style.chip]: true,
						[$style.active]: expandedId === item.id,
						[$style.loading]: item.loading,
						[$style.errored]: !!item.error,
					}"
					:aria-expanded="expandedId === item.id"
					:aria-controls="panelId"
					data-test-id="ai-trace-chip"
					@click="toggle(item)"
				>
					<span :class="$style.iconSlot" aria-hidden="true">
						<N8nIcon :icon="item.icon" size="small" :class="$style.icon" />
						<span :class="$style.pulseDot" />
					</span>
					<span :class="{ [$style.label]: true, [$style.shimmer]: item.loading }">
						{{ item.label }}
					</span>
				</button>
			</N8nTooltip>
		</div>
		<CollapsibleRoot :open="expandedItem !== null">
			<N8nAnimatedCollapsibleContent>
				<div :id="panelId" :class="$style.panel" role="region" data-test-id="ai-trace-chip-panel">
					<slot v-if="renderedItem" name="panel" :item="renderedItem" />
				</div>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.wrapper {
	display: flex;
	flex-direction: column;
	min-width: 0;
	max-width: 90%;
}

.strip {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background: var(--background--surface);
	color: var(--text-color--subtler);
	cursor: pointer;
	transition:
		color var(--duration--snappy) ease,
		border-color var(--duration--snappy) ease,
		background-color var(--duration--snappy) ease;

	&:hover {
		color: var(--text-color--subtle);
		background: var(--color--foreground--tint-2);
	}

	&.active {
		color: var(--color--primary);
		border-color: color-mix(in srgb, var(--color--primary) 30%, transparent);
		background: var(--color--primary--tint-3);
	}

	&.loading {
		color: var(--text-color--subtle);
		cursor: default;
	}

	&.errored {
		color: var(--text-color--danger);
		border-color: var(--border-color--danger);
	}
}

.iconSlot {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon {
	transition:
		opacity var(--duration--snappy) ease,
		transform var(--duration--snappy) ease;
}

.pulseDot {
	--animation--opacity-pulse--duration: 1.5s;
	--animation--opacity-pulse--opacity-end: 0.3;

	position: absolute;
	inset: 0;
	margin: auto;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--primary);
	opacity: 0;
	transition: opacity var(--duration--snappy) ease;
}

.loading {
	.icon {
		opacity: 0;
		transform: scale(0.5);
	}

	.pulseDot {
		opacity: 1;
		@include motion.opacity-pulse;
	}
}

.label {
	max-width: 0;
	margin-left: 0;
	opacity: 0;
	overflow: hidden;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: normal;
	transition:
		max-width var(--duration--snappy) ease,
		opacity var(--duration--snappy) ease,
		margin-left var(--duration--snappy) ease;
}

.chip.active .label,
.chip.loading .label {
	max-width: 200px;
	margin-left: var(--spacing--4xs);
	opacity: 1;
}

.shimmer {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;
}

.panel {
	padding-top: var(--spacing--3xs);
	min-width: 0;
}

.tooltipError {
	white-space: pre-wrap;
	max-width: 240px;
}
</style>
