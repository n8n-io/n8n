<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { Filler } from 'chart.js';
import { useCssVar } from '@vueuse/core';
import type { InsightsByTime } from '@n8n/api-types';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import { useI18n } from '@/composables/useI18n';
import { transformInsightsTimeSaved } from '@/features/insights/insights.utils';
import type { ScriptableContext } from 'chart.js';

const props = defineProps<{
	data: InsightsByTime[];
}>();

const i18n = useI18n();

const colorPrimary = useCssVar('--color-primary', document.body);
const chartOptions = ref(generateLineChartOptions());

const chartData = computed(() => {
	const labels: string[] = [];
	const data: number[] = [];
	const cumulativeData: number[] = [];

	let cumulativeTimeSaved = 0;
	for (const entry of props.data) {
		labels.push(entry.date);
		data.push(transformInsightsTimeSaved(entry.values.timeSaved));

		cumulativeTimeSaved += entry.values.timeSaved;
		cumulativeData.push(cumulativeTimeSaved);
	}

	const rollingAverage = cumulativeData.map((value, index) => {
		if (index < props.data.length) {
			return value;
		}

		return (
			cumulativeData.slice(index - props.data.length, index).reduce((acc, curr) => acc + curr, 0) /
			props.data.length
		);
	});

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.timeSavedDailyAverage'),
				data: rollingAverage.map(transformInsightsTimeSaved),
				fill: true,
				backgroundColor: 'rgba(255, 255, 255, 0.5)',
				borderColor: 'rgba(116, 116, 116, 1)',
				borderDash: [5, 5],
				pointStyle: false,
			},
			{
				label: i18n.baseText('insights.banner.title.timeSaved'),
				data,
				cubicInterpolationMode: 'monotone' as const,
				fill: true,
				backgroundColor: (ctx: ScriptableContext<'line'>) =>
					generateLinearGradient(ctx.chart.ctx, 292),
				borderColor: 'rgba(255, 64, 39, 1)',
			},
		],
	};
});
</script>

<template>
	<Line :data="chartData" :options="chartOptions" :plugins="[Filler]" />
</template>

<style lang="scss" module></style>
