<script lang="ts" setup>
import { computed } from 'vue';
import { useCssVar } from '@vueuse/core';
import type { ChartData } from 'chart.js';
import { Pie } from 'vue-chartjs';
import { generatePieChartOptions } from '@/features/execution/insights/chartjs.utils';
import { buildHistogramSlices } from '../dataProfilingChart.utils';
import type { HistogramBin } from '../dataProfiling.types';

const props = defineProps<{
	bins: HistogramBin[];
	missingCount?: number;
}>();

// Bins are an ordered numeric sequence, not independent categories — a single
// hue ramped light-to-dark keeps that order legible instead of implying
// arbitrary identity like a rainbow categorical palette would.
const SEQUENTIAL_RAMP_TOKENS = [
	'--color--orange-200',
	'--color--orange-300',
	'--color--orange-400',
	'--color--orange-500',
	'--color--orange-600',
	'--color--orange-700',
	'--color--orange-800',
	'--color--orange-900',
];
const sequentialRamp = SEQUENTIAL_RAMP_TOKENS.map((token) => useCssVar(token, document.body));
const colorMissing = useCssVar('--color--foreground', document.body);

const chartOptions = computed(() => generatePieChartOptions());

const chartData = computed<ChartData<'pie'>>(() => {
	const slices = buildHistogramSlices(props.bins, props.missingCount ?? 0);
	const valueSliceCount = slices.filter((slice) => slice.kind === 'value').length;
	let valueIndex = 0;
	const backgroundColor = slices.map((slice) => {
		if (slice.kind !== 'value') {
			return colorMissing.value;
		}
		const rampIndex = Math.min(
			Math.floor((valueIndex / Math.max(valueSliceCount, 1)) * sequentialRamp.length),
			sequentialRamp.length - 1,
		);
		valueIndex += 1;
		return sequentialRamp[rampIndex].value;
	});

	return {
		labels: slices.map((slice) => slice.label),
		datasets: [{ data: slices.map((slice) => slice.count), backgroundColor }],
	};
});
</script>

<template>
	<div :class="$style.chart">
		<Pie data-test-id="profile-histogram-pie" :data="chartData" :options="chartOptions" />
	</div>
</template>

<style lang="scss" module>
.chart {
	height: 200px;
}
</style>
