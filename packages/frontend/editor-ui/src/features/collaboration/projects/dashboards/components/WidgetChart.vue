<script lang="ts" setup>
import { computed } from 'vue';
import { Bar, Line, Pie } from 'vue-chartjs';
import {
	generateBarChartOptions,
	generateLineChartOptions,
} from '@/features/execution/insights/chartjs.utils';
import type { ChartData } from 'chart.js';
import type { QueryResult, WidgetChartType } from '../dashboards.types';

const CHART_COLORS = [
	'#FF6F5C',
	'#3E999F',
	'#7B61FF',
	'#F5A623',
	'#50C878',
	'#E06C9F',
	'#4A90D9',
	'#D4A017',
];

const props = defineProps<{
	chartType: WidgetChartType;
	queryResult: QueryResult;
}>();

function isNumeric(value: unknown): boolean {
	if (typeof value === 'number') return true;
	if (typeof value === 'string') return value !== '' && !isNaN(Number(value));
	return false;
}

const labelColumn = computed(() => props.queryResult.columns[0]);

const numericColumns = computed(() =>
	props.queryResult.columns.filter((col, idx) => {
		if (idx === 0) return false;
		return props.queryResult.rows.some((row) => isNumeric(row[col]));
	}),
);

const labels = computed(() =>
	props.queryResult.rows.map((row) => String(row[labelColumn.value] ?? '')),
);

const barData = computed<ChartData<'bar'>>(() => ({
	labels: labels.value,
	datasets: numericColumns.value.map((col, i) => ({
		label: col,
		data: props.queryResult.rows.map((row) => Number(row[col]) || 0),
		backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
	})),
}));

const lineData = computed<ChartData<'line'>>(() => ({
	labels: labels.value,
	datasets: numericColumns.value.map((col, i) => ({
		label: col,
		data: props.queryResult.rows.map((row) => Number(row[col]) || 0),
		borderColor: CHART_COLORS[i % CHART_COLORS.length],
		backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
		tension: 0.3,
		fill: false,
	})),
}));

const pieData = computed<ChartData<'pie'>>(() => {
	const valueCol = numericColumns.value[0];
	return {
		labels: labels.value,
		datasets: [
			{
				data: props.queryResult.rows.map((row) => Number(row[valueCol]) || 0),
				backgroundColor: labels.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
			},
		],
	};
});

const barOptions = computed(() =>
	generateBarChartOptions({
		maintainAspectRatio: false,
		plugins: { legend: { display: numericColumns.value.length > 1 } },
	}),
);

const lineOptions = computed(() =>
	generateLineChartOptions({
		maintainAspectRatio: false,
		plugins: { legend: { display: numericColumns.value.length > 1 } },
	}),
);

const pieOptions = computed(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false as const,
	plugins: {
		legend: {
			display: true,
			position: 'right' as const,
			labels: { boxWidth: 10, boxHeight: 10 },
		},
	},
}));
</script>

<template>
	<div v-if="chartType === 'table'" :class="$style.tableWrap">
		<table :class="$style.table">
			<thead>
				<tr>
					<th v-for="col in queryResult.columns" :key="col">{{ col }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, idx) in queryResult.rows" :key="idx">
					<td v-for="col in queryResult.columns" :key="col">{{ row[col] ?? '' }}</td>
				</tr>
			</tbody>
		</table>
	</div>
	<div v-else-if="chartType === 'bar'" :class="$style.chartWrap">
		<Bar :data="barData" :options="barOptions" />
	</div>
	<div v-else-if="chartType === 'line'" :class="$style.chartWrap">
		<Line :data="lineData" :options="lineOptions" />
	</div>
	<div v-else-if="chartType === 'pie'" :class="$style.chartWrap">
		<Pie :data="pieData" :options="pieOptions" />
	</div>
</template>

<style lang="scss" module>
.tableWrap {
	width: 100%;
	height: 100%;
	overflow: auto;
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);

	th,
	td {
		text-align: left;
		padding: var(--spacing--4xs) var(--spacing--2xs);
		border-bottom: var(--border);
		white-space: nowrap;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	th {
		font-weight: var(--font-weight--bold);
		position: sticky;
		top: 0;
		background-color: var(--color--background);
	}
}

.chartWrap {
	width: 100%;
	height: 100%;
	padding: var(--spacing--sm);
	box-sizing: border-box;
}
</style>
