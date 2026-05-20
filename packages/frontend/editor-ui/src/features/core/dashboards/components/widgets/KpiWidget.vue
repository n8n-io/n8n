<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';

import type { KpiWidget } from '@/features/core/dashboards/dashboards.types';

const props = defineProps<{
	widget: KpiWidget;
	value: unknown;
	loading: boolean;
	error?: string;
	spark?: number[];
	delta?: { value: string; direction: 'up' | 'down' };
}>();

const formattedValue = computed(() => {
	if (props.value === null || props.value === undefined) return '—';
	const num = typeof props.value === 'number' ? props.value : Number(props.value);
	if (Number.isNaN(num)) return String(props.value);
	const fmt = props.widget.format;
	const kind = fmt?.kind ?? 'number';
	const precision = fmt?.precision;
	const locale = fmt?.locale;
	const suffix = fmt?.suffix ?? '';

	const compact = num >= 10_000 && precision === undefined;

	const formatNumber = () =>
		new Intl.NumberFormat(locale, {
			notation: compact ? 'compact' : 'standard',
			maximumFractionDigits: precision ?? 1,
		}).format(num);

	switch (kind) {
		case 'currency':
			return (
				new Intl.NumberFormat(locale, {
					style: 'currency',
					currency: fmt?.currency ?? 'USD',
					notation: compact ? 'compact' : 'standard',
					maximumFractionDigits: precision ?? 1,
				}).format(num) + suffix
			);
		case 'percent':
			return `${(num * 100).toFixed(precision ?? 1)}%${suffix}`;
		case 'duration':
			return `${num.toFixed(precision ?? 1)}s${suffix}`;
		case 'bytes': {
			const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
			let v = num;
			let i = 0;
			while (v >= 1024 && i < units.length - 1) {
				v /= 1024;
				i++;
			}
			return `${v.toFixed(precision ?? 1)} ${units[i]}${suffix}`;
		}
		case 'number':
		default:
			return formatNumber() + suffix;
	}
});

const sparkPath = computed(() => {
	const points = props.spark ?? [];
	if (points.length < 2) return null;
	const width = 100;
	const height = 32;
	const max = Math.max(...points);
	const min = Math.min(...points);
	const range = max - min || 1;
	const step = width / (points.length - 1);
	const line = points
		.map((p, i) => {
			const x = i * step;
			const y = height - ((p - min) / range) * (height - 4) - 2;
			return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(' ');
	const area = `${line} L ${width} ${height} L 0 ${height} Z`;
	return { line, area, width, height };
});

const sparkColor = computed(() => {
	switch (props.widget.aggregate.fn) {
		case 'count':
			return 'var(--color--orange-400)';
		case 'sum':
			return 'var(--color--green-600)';
		case 'avg':
			return 'var(--color--purple-600)';
		case 'min':
		case 'max':
			return 'var(--color--blue-500)';
		default:
			return 'var(--color--neutral-500)';
	}
});

const deltaColor = computed(() =>
	props.delta?.direction === 'up' ? 'var(--color--green-700)' : 'var(--color--red-700)',
);

const labelIcon = computed(() => {
	switch (props.widget.aggregate.fn) {
		case 'sum':
			return 'circle-dollar-sign';
		case 'count':
			return 'clipboard-list';
		case 'avg':
			return 'chart-column-decreasing';
		default:
			return 'chart-column-decreasing';
	}
});
</script>

<template>
	<article class="kpi-widget">
		<header class="kpi-widget__header">
			<span class="kpi-widget__label">
				<N8nIcon :icon="labelIcon" size="xsmall" />
				{{ widget.title }}
			</span>
			<span v-if="delta" class="kpi-widget__delta" :style="{ color: deltaColor }">
				<N8nIcon :icon="delta.direction === 'up' ? 'trending-up' : 'trending-down'" size="xsmall" />
				{{ delta.value }}
			</span>
		</header>

		<div v-if="loading" class="kpi-widget__skeleton" />
		<div v-else-if="error" class="kpi-widget__error">{{ error }}</div>
		<div v-else class="kpi-widget__value">{{ formattedValue }}</div>

		<svg
			v-if="sparkPath && !loading && !error"
			class="kpi-widget__spark"
			:viewBox="`0 0 ${sparkPath.width} ${sparkPath.height}`"
			preserveAspectRatio="none"
		>
			<path :d="sparkPath.area" :fill="sparkColor" opacity="0.12" />
			<path :d="sparkPath.line" fill="none" :stroke="sparkColor" stroke-width="1.5" />
		</svg>
	</article>
</template>

<style scoped lang="scss">
.kpi-widget {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	height: 100%;
	min-height: 120px;
}

.kpi-widget__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
}

.kpi-widget__label {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
}

.kpi-widget__delta {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.kpi-widget__value {
	font-size: 28px;
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	letter-spacing: -0.02em;
	line-height: 1.1;
}

.kpi-widget__skeleton {
	height: 32px;
	border-radius: var(--radius--3xs);
	background: linear-gradient(
		90deg,
		var(--color--background--shade-1) 0%,
		var(--color--background--light-2) 50%,
		var(--color--background--shade-1) 100%
	);
	background-size: 200% 100%;
	animation: kpi-skeleton 1.4s ease-in-out infinite;
}

@keyframes kpi-skeleton {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.kpi-widget__error {
	font-size: var(--font-size--2xs);
	color: var(--color--text--danger);
}

.kpi-widget__spark {
	width: 100%;
	height: 32px;
	margin-top: auto;
}
</style>
