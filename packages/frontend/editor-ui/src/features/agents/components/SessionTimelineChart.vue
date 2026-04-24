<script lang="ts" setup>
import { computed } from 'vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { itemFilterKey, kindColorToken } from '../session-timeline.utils';

const props = defineProps<{
	items: TimelineItem[];
	idleRanges: IdleRange[];
	sessionStart: number;
	sessionEnd: number;
	visibleKinds: Set<string>;
	selectedIndex: number | null;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const MIN_BLOCK_PX = 4;
const INSTANT_MS = 100;

const totalDuration = computed(() => Math.max(1, props.sessionEnd - props.sessionStart));

function pct(value: number): string {
	return `${(value / totalDuration.value) * 100}%`;
}

function isDimmed(item: TimelineItem): boolean {
	if (props.visibleKinds.size === 0) return false;
	return !props.visibleKinds.has(itemFilterKey(item));
}

function itemStyle(item: TimelineItem): Record<string, string> {
	const leftPct = ((item.timestamp - props.sessionStart) / totalDuration.value) * 100;
	const durationMs = item.endTimestamp ? item.endTimestamp - item.timestamp : INSTANT_MS;
	const widthPct = (durationMs / totalDuration.value) * 100;
	const style: Record<string, string> = {
		left: `${leftPct}%`,
		width: `max(${widthPct}%, ${MIN_BLOCK_PX}px)`,
		backgroundColor: `color-mix(in srgb, ${kindColorToken(item.kind)} 45%, transparent)`,
	};
	if (isDimmed(item)) {
		style.opacity = '0.15';
		style.pointerEvents = 'none';
	}
	return style;
}

function idleStyle(range: IdleRange): Record<string, string> {
	return {
		left: pct(range.start - props.sessionStart),
		width: pct(range.end - range.start),
	};
}

function tooltipFor(item: TimelineItem): string {
	const time = new Date(item.timestamp).toLocaleTimeString();
	return `${item.kind} · ${time}`;
}

function onClick(index: number, item: TimelineItem): void {
	if (isDimmed(item)) return;
	emit('select', index);
}
</script>

<template>
	<div :class="$style.chart">
		<div
			v-for="range in props.idleRanges"
			:key="`idle-${range.start}`"
			data-test-id="timeline-idle"
			:class="$style.idle"
			:style="idleStyle(range)"
		/>
		<button
			v-for="(item, index) in props.items"
			:key="index"
			type="button"
			data-test-id="timeline-block"
			:class="[$style.block, props.selectedIndex === index && $style.selected]"
			:data-selected="props.selectedIndex === index ? 'true' : undefined"
			:style="itemStyle(item)"
			:title="tooltipFor(item)"
			@click="onClick(index, item)"
		/>
	</div>
</template>

<style module lang="scss">
.chart {
	position: relative;
	height: 28px;
	width: 100%;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	overflow: hidden;
}

.idle {
	position: absolute;
	top: 0;
	bottom: 0;
	background-image: repeating-linear-gradient(
		45deg,
		var(--color--foreground--shade-1) 0 4px,
		transparent 4px 8px
	);
	opacity: 0.5;
	pointer-events: none;
}

.block {
	position: absolute;
	top: 4px;
	bottom: 4px;
	border: none;
	border-radius: var(--radius--sm);
	padding: 0;
	cursor: pointer;
	transition: filter 0.15s;

	&:hover {
		filter: brightness(1.1);
	}
}

.selected {
	outline: 2px solid var(--color--warning);
	outline-offset: 1px;
}
</style>
