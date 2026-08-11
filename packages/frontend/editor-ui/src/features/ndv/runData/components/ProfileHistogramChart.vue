<script lang="ts" setup>
import { computed } from 'vue';
import { useCssVar } from '@vueuse/core';
import type { ChartData } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { generateBarChartOptions } from '@/features/execution/insights/chartjs.utils';
import { buildHistogramSlices } from '../dataProfilingChart.utils';
import type { HistogramBin } from '../dataProfiling.types';

const props = defineProps<{
	bins: HistogramBin[];
	missingCount?: number;
}>();

const colorPrimary = useCssVar('--color--primary', document.body);
const colorMissing = useCssVar('--color--orange-300', document.body);

const chartOptions = computed(() =>
	generateBarChartOptions({
		plugins: {
			legend: {
				display: false,
			},
		},
	}),
);

const chartData = computed<ChartData<'bar'>>(() => {
	const slices = buildHistogramSlices(props.bins, props.missingCount ?? 0);
	return {
		labels: slices.map((slice) => slice.label),
		datasets: [
			{
				data: slices.map((slice) => slice.count),
				backgroundColor: slices.map((slice) =>
					slice.kind === 'value' ? colorPrimary.value : colorMissing.value,
				),
			},
		],
	};
});
</script>

<template>
	<div :class="$style.chart">
		<Bar data-test-id="profile-histogram-chart" :data="chartData" :options="chartOptions" />
	</div>
</template>

<style lang="scss" module>
.chart {
	height: 160px;
}
</style>
