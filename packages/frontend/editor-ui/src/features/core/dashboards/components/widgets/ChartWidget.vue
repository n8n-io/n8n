<script setup lang="ts">
import { computed } from 'vue';

import type { ChartWidget } from '@/features/core/dashboards/dashboards.types';

const props = defineProps<{
	widget: ChartWidget;
	rows: Array<Record<string, unknown>> | undefined;
	loading: boolean;
	error?: string;
}>();

const series = computed(() => {
	if (!props.rows) return [];
	const firstYAlias = props.widget.yAxis[0]?.alias;
	if (!firstYAlias) return [];
	return props.rows.map((r) => ({
		label: String(r[props.widget.xAxis] ?? ''),
		value: Number(r[firstYAlias] ?? 0),
	}));
});

const max = computed(() => {
	const xs = series.value.map((s) => s.value);
	return xs.length ? Math.max(...xs) : 1;
});

const formatValue = (v: number) => {
	if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
	if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
	return Math.round(v).toString();
};
</script>

<template>
	<article class="chart-widget">
		<header class="chart-widget__header">
			<div class="chart-widget__title">
				<span class="chart-widget__name">{{ widget.title }}</span>
				<span class="chart-widget__sub">{{ widget.yAxis[0]?.alias }} by {{ widget.xAxis }}</span>
			</div>
			<span class="chart-widget__legend">
				<span class="chart-widget__legend-dot" />
				{{ widget.yAxis[0]?.alias }}
			</span>
		</header>

		<div v-if="loading" class="chart-widget__skeleton" />
		<div v-else-if="error" class="chart-widget__error">{{ error }}</div>
		<div v-else-if="!series.length" class="chart-widget__empty">No data</div>

		<svg v-else class="chart-widget__svg" viewBox="0 0 460 200" preserveAspectRatio="xMidYMid meet">
			<!-- gridlines -->
			<g class="chart-widget__grid">
				<line
					v-for="t in [0, 0.25, 0.5, 0.75, 1]"
					:key="t"
					x1="36"
					x2="448"
					:y1="180 - t * 150"
					:y2="180 - t * 150"
					:stroke-dasharray="t === 0 ? '0' : '3 4'"
				/>
			</g>

			<!-- y-axis labels -->
			<g class="chart-widget__y-labels">
				<text v-for="t in [0, 0.5, 1]" :key="t" x="30" :y="184 - t * 150" text-anchor="end">
					{{ formatValue(t * max) }}
				</text>
			</g>

			<!-- bars (or line, depending on type) -->
			<g v-if="widget.chartType === 'bar'">
				<template v-for="(s, i) in series" :key="i">
					<rect
						:x="36 + (i + 0.15) * (412 / series.length)"
						:y="180 - (s.value / max) * 150"
						:width="(412 / series.length) * 0.7"
						:height="(s.value / max) * 150"
						:fill="
							i === series.length - 1 ? 'var(--color--orange-400)' : 'var(--color--orange-200)'
						"
						rx="3"
					/>
					<text
						v-if="i === series.length - 1"
						:x="36 + (i + 0.5) * (412 / series.length)"
						:y="174 - (s.value / max) * 150"
						text-anchor="middle"
						class="chart-widget__value-label"
					>
						{{ formatValue(s.value) }}
					</text>
				</template>
			</g>

			<g v-else-if="widget.chartType === 'line' || widget.chartType === 'area'">
				<polyline
					:points="
						series
							.map(
								(s, i) =>
									`${36 + (i + 0.5) * (412 / series.length)},${180 - (s.value / max) * 150}`,
							)
							.join(' ')
					"
					fill="none"
					stroke="var(--color--orange-400)"
					stroke-width="2"
				/>
				<polygon
					v-if="widget.chartType === 'area'"
					:points="
						[
							`${36},${180}`,
							...series.map(
								(s, i) =>
									`${36 + (i + 0.5) * (412 / series.length)},${180 - (s.value / max) * 150}`,
							),
							`${448},${180}`,
						].join(' ')
					"
					fill="var(--color--orange-400)"
					opacity="0.12"
				/>
				<circle
					v-for="(s, i) in series"
					:key="i"
					:cx="36 + (i + 0.5) * (412 / series.length)"
					:cy="180 - (s.value / max) * 150"
					r="3"
					fill="var(--color--orange-400)"
				/>
			</g>

			<g v-else-if="widget.chartType === 'pie'">
				<!-- Simple legend list for pie (full pie geometry deferred) -->
				<text
					v-for="(s, i) in series"
					:key="i"
					x="44"
					:y="20 + i * 18"
					class="chart-widget__pie-label"
				>
					{{ s.label }} — {{ formatValue(s.value) }}
				</text>
			</g>

			<!-- x-axis labels -->
			<g class="chart-widget__x-labels">
				<text
					v-for="(s, i) in series"
					:key="i"
					:x="36 + (i + 0.5) * (412 / series.length)"
					y="196"
					text-anchor="middle"
				>
					{{ s.label }}
				</text>
			</g>
		</svg>
	</article>
</template>

<style scoped lang="scss">
.chart-widget {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md);
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	height: 100%;
	min-height: 240px;
}

.chart-widget__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.chart-widget__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.chart-widget__name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.chart-widget__sub {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.chart-widget__legend {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 2px 8px;
	background: var(--color--background--shade-1);
	border-radius: var(--radius--full);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.chart-widget__legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 2px;
	background: var(--color--orange-400);
}

.chart-widget__svg {
	width: 100%;
	flex: 1;
}

.chart-widget__grid line {
	stroke: var(--color--foreground--tint-1);
	stroke-width: 1;
}

.chart-widget__y-labels text {
	font-size: 9px;
	fill: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
}

.chart-widget__x-labels text {
	font-size: 10px;
	fill: var(--color--text--tint-1);
}

.chart-widget__value-label {
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	fill: var(--color--orange-700);
}

.chart-widget__pie-label {
	font-size: 11px;
	fill: var(--color--text--shade-1);
}

.chart-widget__skeleton {
	flex: 1;
	min-height: 160px;
	border-radius: var(--radius--3xs);
	background: linear-gradient(
		90deg,
		var(--color--background--shade-1) 0%,
		var(--color--background--light-2) 50%,
		var(--color--background--shade-1) 100%
	);
	background-size: 200% 100%;
	animation: chart-skeleton 1.4s ease-in-out infinite;
}

@keyframes chart-skeleton {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.chart-widget__error {
	font-size: var(--font-size--2xs);
	color: var(--color--text--danger);
}

.chart-widget__empty {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	text-align: center;
	padding: var(--spacing--lg);
}
</style>
