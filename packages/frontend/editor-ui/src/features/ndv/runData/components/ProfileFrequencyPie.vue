<script lang="ts" setup>
import { computed } from 'vue';
import { useCssVar } from '@vueuse/core';
import type { ChartData } from 'chart.js';
import { Pie } from 'vue-chartjs';
import { generatePieChartOptions } from '@/features/execution/insights/chartjs.utils';
import { buildFrequencySlices } from '../dataProfilingChart.utils';
import type { FrequencyEntry } from '../dataProfiling.types';

const props = defineProps<{
	entries: FrequencyEntry[];
	missingCount?: number;
}>();

// Fixed hue order for real values — never cycled per-render, only wraps if a
// field somehow has more than 10 individually-shown values.
const CATEGORICAL_COLOR_TOKENS = [
	'--color--orange-500',
	'--color--blue-500',
	'--color--purple-500',
	'--color--mint-500',
	'--color--gold-500',
	'--color--pink-500',
	'--color--green-500',
	'--color--slate-500',
	'--color--red-500',
	'--color--yellow-500',
];
const categoricalColors = CATEGORICAL_COLOR_TOKENS.map((token) => useCssVar(token, document.body));
const colorAggregate = useCssVar('--color--orange-300', document.body);

const chartOptions = computed(() => generatePieChartOptions());

const chartData = computed<ChartData<'pie'>>(() => {
	const slices = buildFrequencySlices(props.entries, props.missingCount ?? 0);
	let valueIndex = 0;
	const backgroundColor = slices.map((slice) => {
		if (slice.kind !== 'value') {
			return colorAggregate.value;
		}
		const color = categoricalColors[valueIndex % categoricalColors.length].value;
		valueIndex += 1;
		return color;
	});

	return {
		labels: slices.map((slice) => slice.label),
		datasets: [{ data: slices.map((slice) => slice.count), backgroundColor }],
	};
});
</script>

<template>
	<div :class="$style.chart">
		<Pie data-test-id="profile-frequency-pie" :data="chartData" :options="chartOptions" />
	</div>
</template>

<style lang="scss" module>
.chart {
	height: 200px;
}
</style>
