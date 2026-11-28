<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { useCssVar } from '@vueuse/core';
import type { AssistantUsageDay } from '@n8n/api-types';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { Bar } from '@n8n/design-system/charts';
import { type BaseTextKey, useI18n } from '@n8n/i18n';

import { formatCompactNumber, formatNumber, tokenBreakdown, totalTokens } from './usageFormat';

type CreatedKey = keyof Pick<
	AssistantUsageDay,
	'workflowsCreated' | 'agentsCreated' | 'dataTablesCreated'
>;

const props = defineProps<{
	days: AssistantUsageDay[];
	/** Dims the charts while newer data loads. */
	refreshing?: boolean;
}>();

/** The series of the created chart, bottom of the stack first. */
const CREATED_SERIES: Array<{ key: CreatedKey; labelKey: BaseTextKey; colorToken: string }> = [
	{
		key: 'workflowsCreated',
		labelKey: 'settings.n8nAgent.usage.created.workflows',
		colorToken: '--chart--color--series-1',
	},
	{
		key: 'agentsCreated',
		labelKey: 'settings.n8nAgent.usage.created.agents',
		colorToken: '--chart--color--series-2',
	},
	{
		key: 'dataTablesCreated',
		labelKey: 'settings.n8nAgent.usage.created.dataTables',
		colorToken: '--chart--color--series-3',
	},
];

const i18n = useI18n();

// Read once, like the other charts of the editor.
const colorText = useCssVar('--text-color--subtle', document.body);
const colorTextStrong = useCssVar('--text-color', document.body);
const colorBorder = useCssVar('--border-color', document.body);
const colorGrid = useCssVar('--border-color--subtle', document.body);
const colorSurface = useCssVar('--background--surface', document.body);
const seriesColors = CREATED_SERIES.map(({ colorToken }) => useCssVar(colorToken, document.body));
// A chart with one series uses the first series color.
const colorBar = seriesColors[0];

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** `YYYY-MM-DD` in the time zone of the browser, as the backend buckets it. */
function formatDay(isoDate: string): string {
	const [year, month, day] = isoDate.split('-').map(Number);
	return dayFormat.format(new Date(year, month - 1, day));
}

const labels = computed(() => props.days.map((day) => formatDay(day.date)));

/** The options that every chart of the page shares. */
const baseOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: { display: false },
		tooltip: {
			backgroundColor: colorSurface.value,
			titleColor: colorTextStrong.value,
			bodyColor: colorTextStrong.value,
			footerColor: colorTextStrong.value,
			borderColor: colorBorder.value,
			borderWidth: 1,
			padding: 12,
		},
	},
	scales: {
		x: {
			grid: { display: false },
			ticks: { color: colorText.value, maxRotation: 0, autoSkip: true },
		},
		y: {
			beginAtZero: true,
			border: { display: false },
			grid: { color: colorGrid.value },
			ticks: { color: colorText.value, precision: 0 },
		},
	},
}));

function singleSeries(label: string, data: number[]): ChartData<'bar'> {
	return {
		labels: labels.value,
		datasets: [
			{
				label,
				data,
				backgroundColor: colorBar.value,
				borderRadius: 4,
				maxBarThickness: 32,
			},
		],
	};
}

const conversationsData = computed(() =>
	singleSeries(
		i18n.baseText('settings.n8nAgent.usage.conversations.label'),
		props.days.map((day) => day.conversations),
	),
);

const conversationsOptions = computed<ChartOptions<'bar'>>(() => ({
	...baseOptions.value,
	plugins: {
		...baseOptions.value.plugins,
		tooltip: {
			...baseOptions.value.plugins?.tooltip,
			callbacks: {
				afterLabel: (item: TooltipItem<'bar'>) => {
					const day = props.days[item.dataIndex];
					return day
						? i18n.baseText('settings.n8nAgent.usage.conversations.messages', {
								interpolate: { count: formatNumber(day.messages) },
							})
						: '';
				},
			},
		},
	},
}));

const tokensData = computed(() =>
	singleSeries(i18n.baseText('settings.n8nAgent.usage.tokens.label'), props.days.map(totalTokens)),
);

const tokensOptions = computed<ChartOptions<'bar'>>(() => ({
	...baseOptions.value,
	plugins: {
		...baseOptions.value.plugins,
		tooltip: {
			...baseOptions.value.plugins?.tooltip,
			callbacks: {
				label: (item: TooltipItem<'bar'>) =>
					i18n.baseText('settings.n8nAgent.usage.tokens.total', {
						interpolate: { count: formatNumber(Number(item.raw)) },
					}),
				afterLabel: (item: TooltipItem<'bar'>) => {
					const day = props.days[item.dataIndex];
					return day ? tokenBreakdown(day) : [];
				},
			},
		},
	},
	scales: {
		...baseOptions.value.scales,
		y: {
			...baseOptions.value.scales?.y,
			ticks: {
				...baseOptions.value.scales?.y?.ticks,
				// Chart.js names this option `callback`.
				// eslint-disable-next-line id-denylist
				callback: (value: string | number) => formatCompactNumber(Number(value)),
			},
		},
	},
}));

/** For each day, the topmost series with resources. Only that segment gets rounded corners. */
const topSeriesByDay = computed(() =>
	props.days.map((day) => CREATED_SERIES.findLastIndex(({ key }) => day[key] > 0)),
);

const createdData = computed<ChartData<'bar'>>(() => ({
	labels: labels.value,
	datasets: CREATED_SERIES.map(({ key, labelKey }, seriesIndex) => ({
		label: i18n.baseText(labelKey),
		data: props.days.map((day) => day[key]),
		backgroundColor: seriesColors[seriesIndex].value,
		hoverBackgroundColor: seriesColors[seriesIndex].value,
		// A surface-colored top border leaves a gap between stacked segments.
		borderColor: colorSurface.value,
		hoverBorderColor: colorSurface.value,
		borderWidth: { top: 2 },
		borderRadius: (context: { dataIndex: number }) =>
			topSeriesByDay.value[context.dataIndex] === seriesIndex
				? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
				: 0,
		borderSkipped: 'start' as const,
		maxBarThickness: 32,
	})),
}));

const createdOptions = computed<ChartOptions<'bar'>>(() => ({
	...baseOptions.value,
	interaction: { mode: 'index', intersect: false },
	plugins: {
		...baseOptions.value.plugins,
		tooltip: {
			...baseOptions.value.plugins?.tooltip,
			// The top of the stack first, as on the chart. Series without resources stay out.
			itemSort: (a: TooltipItem<'bar'>, b: TooltipItem<'bar'>) => b.datasetIndex - a.datasetIndex,
			filter: (item: TooltipItem<'bar'>) => Number(item.raw) > 0,
			callbacks: {
				label: (item: TooltipItem<'bar'>) =>
					i18n.baseText('settings.n8nAgent.usage.created.count', {
						interpolate: {
							type: item.dataset.label ?? '',
							count: formatNumber(Number(item.raw)),
						},
					}),
				footer: (items: Array<TooltipItem<'bar'>>) =>
					i18n.baseText('settings.n8nAgent.usage.created.total', {
						interpolate: {
							count: formatNumber(items.reduce((sum, item) => sum + Number(item.raw), 0)),
						},
					}),
			},
		},
	},
	scales: {
		x: { ...baseOptions.value.scales?.x, stacked: true },
		y: { ...baseOptions.value.scales?.y, stacked: true },
	},
}));
</script>

<template>
	<div :class="[$style.charts, { [$style.refreshing]: refreshing }]">
		<section :class="$style.card" data-test-id="assistant-usage-conversations">
			<N8nHeading size="medium" :bold="true">
				{{ i18n.baseText('settings.n8nAgent.usage.conversations.title') }}
			</N8nHeading>
			<div :class="$style.chart">
				<Bar :data="conversationsData" :options="conversationsOptions" />
			</div>
		</section>

		<section :class="$style.card" data-test-id="assistant-usage-tokens">
			<N8nHeading size="medium" :bold="true">
				{{ i18n.baseText('settings.n8nAgent.usage.tokens.title') }}
			</N8nHeading>
			<div :class="$style.chart">
				<Bar :data="tokensData" :options="tokensOptions" />
			</div>
		</section>

		<section :class="$style.card" data-test-id="assistant-usage-created">
			<N8nHeading size="medium" :bold="true">
				{{ i18n.baseText('settings.n8nAgent.usage.created.title') }}
			</N8nHeading>
			<ul :class="$style.legend">
				<li
					v-for="(series, seriesIndex) in CREATED_SERIES"
					:key="series.key"
					:class="$style.legendItem"
				>
					<span
						:class="$style.swatch"
						:style="{ backgroundColor: seriesColors[seriesIndex].value }"
						aria-hidden="true"
					/>
					<N8nText size="small">{{ i18n.baseText(series.labelKey) }}</N8nText>
				</li>
			</ul>
			<div :class="$style.chart">
				<Bar :data="createdData" :options="createdOptions" />
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.charts {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
}

.chart {
	height: 240px;
}

.legend {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--md);
	margin: 0;
	padding: 0;
	list-style: none;
}

.legendItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.swatch {
	flex-shrink: 0;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	border-radius: var(--radius--4xs);
}

/* Keeps the old numbers readable while new ones load. */
.refreshing {
	opacity: 0.6;
}
</style>
