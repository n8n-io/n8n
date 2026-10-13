<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcAccordion from '../motion/RcAccordion.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import { readNumber } from '../motion/motionTokens';
import type { ChartCardData } from '../ResultCard.types';
import { CHART_SERIES_COLORS } from '../tones';

/**
 * Chart (transitions.dev "Chart card"): a stacked bar chart with one column
 * per slice. Segment heights morph when a variant changes the data, hovering a
 * segment raises a tooltip and dims the other series, the legend soft-swaps
 * its values and a Details accordion holds the facts.
 */
const props = defineProps<{ card: ChartCardData; animated: boolean }>();

const { t } = useI18n();

const STACK_HEIGHT = 126;

const series = computed(() =>
	props.card.series.map((entry, index) => ({
		name: entry.name,
		color: entry.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
	})),
);
const columns = computed(() => props.card.columns);

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (value: number) => compact.format(value);

const seriesTotals = computed(() =>
	series.value.map((_, index) =>
		columns.value.reduce((sum, column) => sum + (column.values[index] ?? 0), 0),
	),
);
const columnTotals = computed(() =>
	columns.value.map((column) => column.values.reduce((sum, value) => sum + value, 0)),
);
const grandTotal = computed(() => columnTotals.value.reduce((sum, value) => sum + value, 0));
const total = computed(() => props.card.total ?? fmt(grandTotal.value));
const max = computed(() => Math.max(...columnTotals.value, 1));

const wrap = ref<HTMLElement | null>(null);
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

function segmentHeight(columnIndex: number, seriesIndex: number): string {
	if (!ready.value) return '0px';
	const gap = readNumber(wrap.value, '--rc-chart-gap', 3);
	const available = STACK_HEIGHT - gap * Math.max(series.value.length - 1, 0);
	const value = columns.value[columnIndex]?.values[seriesIndex] ?? 0;
	return `${((value / max.value) * available).toFixed(2)}px`;
}

/* tooltip + dimming */
const dimmed = ref(-1);
const tip = ref({ on: false, name: '', value: '', x: 0, y: 0 });
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function showTip(event: PointerEvent, columnIndex: number, seriesIndex: number) {
	clearTimeout(hideTimer);
	const rect = wrap.value?.getBoundingClientRect();
	if (!rect) return;
	const value = columns.value[columnIndex]?.values[seriesIndex] ?? 0;
	const percent = Math.round((value / (columnTotals.value[columnIndex] || 1)) * 100);
	const x = Math.min(Math.max(event.clientX - rect.left + 12, 0), rect.width - 150);
	const y = event.clientY - rect.top - 12;
	tip.value = {
		on: true,
		name: `${series.value[seriesIndex].name} · ${columns.value[columnIndex].label}`,
		value: t('resultCard.chart.tooltip', { value: fmt(value), percent: String(percent) }),
		x,
		y: Math.max(y - 44, -8),
	};
	dimmed.value = seriesIndex;
}
function hideTip() {
	clearTimeout(hideTimer);
	hideTimer = setTimeout(() => {
		tip.value.on = false;
		dimmed.value = -1;
	}, 80);
}
onBeforeUnmount(() => clearTimeout(hideTimer));

const facts = computed(() => props.card.facts ?? []);
</script>

<template>
	<div :class="$style.chart" data-test-id="result-card-chart">
		<div :class="$style.head">
			<h3 :class="$style.title">{{ card.title }}</h3>
			<p v-if="card.range" :class="$style.range"><RcTextSoft :text="card.range" /></p>
			<div v-if="$slots.switcher" :class="$style.switcher"><slot name="switcher" /></div>
		</div>

		<div :class="$style.sum">
			<span :class="$style.total" data-test-id="result-card-chart-total"
				><RcTextSoft :text="total"
			/></span>
			<span v-if="card.totalLabel" :class="$style.cap">{{ card.totalLabel }}</span>
		</div>

		<div ref="wrap" :class="$style.wrap">
			<div :class="$style.bars" :style="{ '--cols': columns.length }">
				<div
					v-for="(column, columnIndex) in columns"
					:key="columnIndex"
					:class="$style.col"
					role="img"
					:aria-label="`${column.label}: ${fmt(columnTotals[columnIndex])}`"
				>
					<div :class="$style.stack">
						<div
							v-for="(entry, seriesIndex) in series"
							:key="seriesIndex"
							:class="[$style.seg, { [$style.dim]: dimmed !== -1 && dimmed !== seriesIndex }]"
							:style="{ '--c': entry.color, height: segmentHeight(columnIndex, seriesIndex) }"
							data-test-id="result-card-chart-segment"
							@pointerenter="showTip($event, columnIndex, seriesIndex)"
							@pointermove="showTip($event, columnIndex, seriesIndex)"
							@pointerleave="hideTip"
						/>
					</div>
					<span :class="$style.label">{{ column.label }}</span>
				</div>
			</div>
			<div
				:class="[$style.tip, { [$style.tipOn]: tip.on }]"
				:style="{ transform: `translate(${tip.x}px, ${tip.y}px)` }"
				aria-hidden="true"
			>
				<span :class="$style.tipName">{{ tip.name }}</span>
				<span :class="$style.tipVal">{{ tip.value }}</span>
			</div>
		</div>

		<ul v-if="series.length > 1" :class="$style.legend">
			<li
				v-for="(entry, index) in series"
				:key="entry.name"
				:class="$style.row"
				:style="{ '--c': entry.color }"
				@pointerenter="dimmed = index"
				@pointerleave="dimmed = -1"
			>
				<span :class="$style.key" />
				<span :class="$style.name">{{ entry.name }}</span>
				<span :class="$style.val"><RcTextSoft :text="fmt(seriesTotals[index])" align="end" /></span>
			</li>
		</ul>

		<RcAccordion v-if="facts.length" :label="t('resultCard.chart.details')" variant="chip">
			<ul :class="$style.details">
				<li v-for="fact in facts" :key="fact.label" :class="$style.drow">
					<span :class="$style.name">{{ fact.label }}</span>
					<span :class="$style.val"><RcTextSoft :text="fact.value" align="end" /></span>
				</li>
			</ul>
		</RcAccordion>
	</div>
</template>

<style lang="scss" module>
.chart {
	display: grid;
	gap: 16px;
	padding: 0 24px;
}

.head {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	margin: 0 -24px;
	padding: 8px 24px 16px;
	&::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--rc-border) 49%, transparent) 20%,
			color-mix(in srgb, var(--rc-border) 49%, transparent) 80%,
			transparent
		);
	}
}
.title {
	margin: 0;
	font-size: 28px;
	line-height: 34px;
	font-weight: 500;
	color: var(--rc-fg);
	overflow-wrap: anywhere;
}
.range {
	margin: -8px 0 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	font-variant-numeric: tabular-nums;
}
.switcher {
	display: flex;
}

.sum {
	display: flex;
	align-items: baseline;
	gap: 8px;
}
.total {
	font-size: 16px;
	line-height: 22px;
	font-weight: 500;
	color: var(--rc-fg);
	font-variant-numeric: tabular-nums;
}
.cap {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}

.wrap {
	position: relative;
	height: 150px;
	display: flex;
	justify-content: center;
}
.bars {
	display: grid;
	grid-template-columns: repeat(var(--cols, 7), 1fr);
	gap: 8px;
	width: 100%;
	height: 150px;
}
.col {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: 8px;
	min-width: 0;
}
.stack {
	display: flex;
	flex-direction: column-reverse;
	justify-content: flex-start;
	gap: var(--rc-chart-gap, 3px);
	height: 126px;
}
.seg {
	flex: none;
	height: 0;
	background: var(--c);
	border-radius: var(--rc-chart-corner, 2px);
	cursor: pointer;
	transition:
		height var(--rc-chart-morph-dur, 400ms)
			var(--rc-chart-morph-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		opacity var(--rc-tip-dur, 150ms) var(--rc-tip-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.dim {
	opacity: 0.2;
}
.label {
	align-self: center;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.tip {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 5;
	padding: 8px 12px;
	border-radius: 12px;
	background: var(--rc-surface);
	box-shadow: var(--rc-material-shadow);
	display: grid;
	pointer-events: none;
	white-space: nowrap;
	opacity: 0;
	scale: var(--rc-tip-scale, 0.97);
	transition:
		opacity var(--rc-tip-dur, 150ms) var(--rc-tip-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		scale var(--rc-tip-dur, 150ms) var(--rc-tip-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.tipOn {
	opacity: 1;
	scale: 1;
}
.tipName {
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
}
.tipVal {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	font-variant-numeric: tabular-nums;
}

.legend {
	list-style: none;
	display: grid;
	gap: 0;
	margin: 0 -8px;
	padding: 0;
}
.row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 8px;
	border-radius: 8px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
	transition: background-color var(--rc-tip-dur, 150ms)
		var(--rc-tip-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
@media (hover: hover) and (pointer: fine) {
	.row:hover {
		background: var(--rc-chip);
	}
}
.key {
	width: 8px;
	height: 8px;
	border-radius: 3px;
	background: var(--c);
	flex: none;
}
.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.val {
	color: var(--rc-muted);
	font-variant-numeric: tabular-nums;
	flex: none;
}

.details {
	list-style: none;
	display: grid;
	gap: 0;
	margin: 0;
	padding: 4px 0 0;
}
.drow {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 12px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
}

@media (prefers-reduced-motion: reduce) {
	.seg,
	.tip,
	.row {
		transition: none !important;
	}
}
</style>
