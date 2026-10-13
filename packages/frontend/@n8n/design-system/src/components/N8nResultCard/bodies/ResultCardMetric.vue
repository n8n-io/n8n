<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import RcDigits from '../motion/RcDigits.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import type { MetricCardData } from '../ResultCard.types';
import { stagger } from '../utils';

/**
 * Metric: one big number with its label and delta, then either a small bar
 * breakdown or a sparkline. The number pops digit by digit when a variant
 * changes it; bars morph to their new heights.
 */
const props = defineProps<{ card: MetricCardData; animated: boolean }>();

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
/** A title that only repeats the node's name ("Respond", "Weekly summary") is noise above the hero */
const showCaption = computed(
	() =>
		props.card.title.trim().length > 0 &&
		normalize(props.card.title) !== normalize(props.card.nodeName ?? ''),
);

const BAR_HEIGHT = 88;
/** Bars grow from zero on first paint when the card animates in. */
const ready = ref(!props.animated);
let raf = 0;
onMounted(() => {
	if (ready.value) return;
	raf = requestAnimationFrame(() => {
		raf = requestAnimationFrame(() => {
			ready.value = true;
		});
	});
});
onBeforeUnmount(() => cancelAnimationFrame(raf));

const bars = computed(() => {
	const rows = (props.card.breakdown ?? []).slice(0, 7);
	const max = Math.max(...rows.map((row) => row.value), 0) || 1;
	return rows.map((row) => ({
		...row,
		height:
			!ready.value || row.value <= 0 ? 0 : Math.max(6, Math.round((row.value / max) * BAR_HEIGHT)),
	}));
});

const sparkline = computed(() => {
	const points = props.card.trend ?? [];
	if ((props.card.breakdown?.length ?? 0) > 0 || points.length < 2) return null;
	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min || 1;
	const width = 272;
	const height = 64;
	const coords = points.map((value, index) => [
		(index / (points.length - 1)) * width,
		height - 4 - ((value - min) / range) * (height - 8),
	]);
	const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
	const area = `0,${height} ${line} ${width},${height}`;
	return { line, area, width, height };
});

const deltaText = computed(() => {
	const delta = props.card.delta;
	if (!delta) return '';
	const glyph = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→';
	return [glyph, delta.value, delta.label].filter(Boolean).join(' ');
});
const deltaTone = computed(() => props.card.delta?.direction ?? 'flat');

const hovered = ref(-1);
</script>

<template>
	<div :class="$style.metric" data-test-id="result-card-metric">
		<p v-if="showCaption" :class="[$style.caption, $style.reveal]" style="--rc-delay: 0.05s">
			{{ card.title }}
		</p>
		<div :class="[$style.heroRow, $style.reveal]" style="--rc-delay: 0.1s">
			<span :class="$style.value" data-test-id="result-card-metric-value">
				<RcDigits :value="card.value" :animated="animated" />
				<span v-if="card.unit" :class="$style.unit">{{ card.unit }}</span>
			</span>
			<span :class="$style.label"><RcTextSoft :text="card.label" /></span>
		</div>
		<span
			v-if="card.delta"
			:class="[$style.delta, $style[`delta-${deltaTone}`], $style.reveal]"
			style="--rc-delay: 0.3s"
			data-test-id="result-card-metric-delta"
		>
			<RcTextSoft :text="deltaText" />
		</span>

		<div v-if="bars.length" :class="[$style.chart, $style.chrome]" style="--rc-delay: 0.3s">
			<div :class="$style.bars" @pointerleave="hovered = -1">
				<div
					v-for="(bar, index) in bars"
					:key="index"
					:class="[$style.barColumn, { [$style.dim]: hovered !== -1 && hovered !== index }]"
					:title="`${bar.label} · ${bar.value}`"
					@pointerenter="hovered = index"
				>
					<span :class="$style.barValue">{{ bar.value }}</span>
					<span
						:class="[$style.bar, bar.height === 0 ? $style.barEmpty : '']"
						:style="{ height: `${bar.height || 3}px`, '--rc-delay': stagger(index, 0.4, 0.06) }"
					/>
					<span :class="$style.axisLabel">{{ bar.label }}</span>
				</div>
			</div>
		</div>

		<svg
			v-else-if="sparkline"
			:class="[$style.spark, $style.chrome]"
			style="--rc-delay: 0.35s"
			:viewBox="`0 0 ${sparkline.width} ${sparkline.height}`"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<polygon :points="sparkline.area" :class="$style.sparkArea" />
			<polyline
				:points="sparkline.line"
				:class="$style.sparkLine"
				pathLength="1"
				fill="none"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</svg>
	</div>
</template>

<style lang="scss" module>
.metric {
	display: flex;
	flex-direction: column;
	padding: 8px 24px 0;
}
.caption {
	margin: 0 0 2px;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}
.heroRow {
	display: flex;
	align-items: baseline;
	gap: 8px;
	flex-wrap: wrap;
}
.value {
	display: inline-flex;
	align-items: baseline;
	font-size: 44px;
	line-height: 52px;
	font-weight: 500;
	letter-spacing: -0.02em;
	font-variant-numeric: tabular-nums;
	color: var(--rc-fg);
}
.unit {
	margin-left: 3px;
	font-size: 18px;
	line-height: 22px;
	color: var(--rc-muted);
}
.label {
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-muted);
}
.delta {
	align-self: flex-start;
	margin-top: 6px;
	padding: 0 6px;
	height: 18px;
	border-radius: 50px;
	font-size: 11px;
	line-height: 18px;
	font-weight: 500;
	--fill: var(--rc-chip);
	--ink: var(--rc-muted);
	background: var(--fill);
	color: var(--ink);
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 14%, transparent);
	font-variant-numeric: tabular-nums;
}
.delta-up {
	--fill: var(--rc-ok-fill);
	--ink: var(--rc-ok-ink);
}
.delta-down {
	--fill: var(--rc-error-fill);
	--ink: var(--rc-error-ink);
}

/* breakdown bars */
.chart {
	margin-top: 16px;
}
.bars {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}
.barColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	min-width: 0;
	max-width: 72px;
	transition: opacity var(--rc-tip-dur, 150ms) var(--rc-tip-ease);
}
.dim {
	opacity: 0.35;
}
.barValue {
	font-size: 11px;
	line-height: 14px;
	font-variant-numeric: tabular-nums;
	color: var(--rc-muted);
}
.bar {
	display: block;
	width: 100%;
	border-radius: var(--rc-chart-corner, 2px);
	background: var(--rc-tone);
	transition: height var(--rc-chart-morph-dur, 400ms) var(--rc-chart-morph-ease);
}
.barEmpty {
	background: var(--rc-chip);
}
.axisLabel {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}

/* sparkline */
.spark {
	display: block;
	width: 100%;
	height: 64px;
	margin-top: 16px;
	overflow: visible;
}
.sparkArea {
	fill: var(--rc-tone);
	fill-opacity: 0.1;
}
.sparkLine {
	stroke: var(--rc-tone);
	stroke-dasharray: 1;
	stroke-dashoffset: 0;
}

/* entrance */
@keyframes rc-pop {
	from {
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0);
	}
}
@keyframes rc-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
@keyframes rc-draw {
	from {
		stroke-dashoffset: 1;
	}
	to {
		stroke-dashoffset: 0;
	}
}
.reveal,
.chrome {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .chrome {
	animation: rc-fade var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .sparkLine {
	animation: rc-draw 0.9s var(--rc-ease-smooth-out) both;
	animation-delay: 0.4s;
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .chrome,
	:global(.rc-animated) .sparkLine {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
	.bar,
	.barColumn {
		transition: none !important;
	}
}
</style>
