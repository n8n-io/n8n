<script lang="ts" setup>
import { computed } from 'vue';

import type { MetricCardData } from '../ResultCard.types';
import { useCountUp } from '../useCountUp';
import { stagger } from '../utils';

const props = defineProps<{ card: MetricCardData; light: boolean; animated: boolean }>();

const display = useCountUp(() => props.card.value, { enabled: () => props.animated });

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
/** A title that only repeats the node's name ("Respond", "Weekly summary") is noise above the hero */
const showCaption = computed(
	() =>
		props.card.title.trim().length > 0 &&
		normalize(props.card.title) !== normalize(props.card.nodeName ?? ''),
);

const bars = computed(() => {
	const rows = (props.card.breakdown ?? []).slice(0, 6);
	const max = Math.max(...rows.map((row) => row.value), 0) || 1;
	return rows.map((row) => ({
		...row,
		height: row.value <= 0 ? 0 : Math.max(8, Math.round((row.value / max) * 88)),
	}));
});

const sparkline = computed(() => {
	const points = props.card.trend ?? [];
	if (bars.value.length > 0 || points.length < 2) return null;
	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min || 1;
	const width = 320;
	const height = 72;
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
</script>

<template>
	<div :class="$style.metric">
		<p v-if="showCaption" :class="[$style.caption, $style.reveal]" style="--rc-delay: 0.05s">
			{{ card.title }}
		</p>
		<div :class="[$style.heroRow, $style.reveal]" style="--rc-delay: 0.1s">
			<span :class="$style.value" data-test-id="result-card-metric-value"
				>{{ display }}<span v-if="card.unit" :class="$style.unit">{{ card.unit }}</span></span
			>
			<span :class="$style.label">{{ card.label }}</span>
		</div>
		<span v-if="card.delta" :class="[$style.delta, $style.reveal]" style="--rc-delay: 0.3s">
			{{ deltaText }}
		</span>

		<div v-if="bars.length" :class="$style.chart">
			<div :class="$style.bars">
				<div v-for="(bar, index) in bars" :key="index" :class="$style.barColumn">
					<span
						:class="[$style.barValue, $style.reveal]"
						:style="{ '--rc-delay': stagger(index, 0.75, 0.09) }"
						>{{ bar.value }}</span
					>
					<span
						:class="[$style.bar, $style.grow, bar.height === 0 ? $style.barEmpty : '']"
						:style="{ height: `${bar.height || 3}px`, '--rc-delay': stagger(index, 0.5, 0.09) }"
						:title="`${bar.label} · ${bar.value}`"
					/>
				</div>
			</div>
			<div :class="[$style.axis, $style.chrome]" style="--rc-delay: 1.05s">
				<span v-for="(bar, index) in bars" :key="index" :class="$style.axisLabel">{{
					bar.label
				}}</span>
			</div>
		</div>

		<svg
			v-else-if="sparkline"
			:class="$style.spark"
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
				stroke-width="2.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</svg>
	</div>
</template>

<style lang="scss" module>
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
@keyframes rc-grow {
	from {
		transform: scaleY(0);
	}
	to {
		transform: scaleY(1);
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

.metric {
	display: flex;
	flex-direction: column;
}
.caption {
	margin: 0 0 var(--spacing--5xs);
	font-size: var(--font-size--2xs);
	color: var(--rc-ink-muted);
}
.heroRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}
.value {
	font-size: 44px;
	font-weight: var(--font-weight--bold);
	line-height: 1;
	letter-spacing: -0.03em;
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink);
}
.unit {
	margin-left: 2px;
	font-size: 20px;
	font-weight: var(--font-weight--medium);
	color: var(--rc-ink-soft);
}
.label {
	font-size: var(--font-size--sm);
	color: var(--rc-ink-soft);
	line-height: 1.3;
}
.delta {
	align-self: flex-start;
	margin-top: var(--spacing--2xs);
	padding: 2px var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--rc-panel-strong);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--rc-ink-soft);
}
.chart {
	margin-top: var(--spacing--md);
}
.bars {
	display: flex;
	align-items: flex-end;
	gap: 10px;
	height: 108px;
}
.barColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
	min-width: 0;
	/* a few categories should still read as bars, not slabs */
	max-width: 72px;
}
.barValue {
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink-muted);
}
.bar {
	display: block;
	width: 100%;
	border-radius: 6px 6px 2px 2px;
	background: var(--rc-bar);
	transform-origin: bottom;
}
.barEmpty {
	background: var(--rc-bar-empty);
}
.axis {
	display: flex;
	gap: 10px;
	margin-top: 6px;
	padding-top: 6px;
	border-top: 1px solid var(--rc-hairline);
}
.axisLabel {
	flex: 1;
	min-width: 0;
	max-width: 72px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: center;
	font-size: var(--font-size--4xs);
	letter-spacing: 0.04em;
	color: var(--rc-ink-muted);
}
.spark {
	display: block;
	width: 100%;
	height: 72px;
	margin-top: var(--spacing--md);
	overflow: visible;
}
.sparkArea {
	/* fill-opacity, not opacity: the fade-in keyframe animates opacity to 1 */
	fill: var(--rc-ink);
	fill-opacity: 0.14;
}
.sparkLine {
	stroke: var(--rc-bar);
	stroke-dasharray: 1;
	stroke-dashoffset: 0;
}

.reveal,
.chrome,
.grow {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .chrome {
	animation: rc-fade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .grow {
	animation: rc-grow 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .sparkLine {
	animation: rc-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: 0.4s;
}
:global(.rc-animated) .sparkArea {
	animation: rc-fade 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: 0.9s;
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .chrome,
	:global(.rc-animated) .grow,
	:global(.rc-animated) .sparkLine,
	:global(.rc-animated) .sparkArea {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
