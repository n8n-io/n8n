<script lang="ts" setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData } from 'chart.js';
import { useCssVar } from '@vueuse/core';
import dateformat from 'dateformat';
import type { InsightsByTime, InsightsSummaryType } from '@n8n/api-types';
import { generateBarChartOptions } from '@/features/insights/chartjs.utils';
import { useI18n } from '@/composables/useI18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';

const props = defineProps<{
	data: InsightsByTime[];
	type: InsightsSummaryType;
}>();

const i18n = useI18n();

const colorPrimary = useCssVar('--color-primary', document.body);
const chartOptions = computed(() =>
	generateBarChartOptions({
		plugins: {
			tooltip: {
				callbacks: {
					label: (context) => {
						const label = context.dataset.label ?? '';
						return `${label} ${smartDecimal(context.parsed.y)}`;
					},
				},
			},
		},
	}),
);

const chartData = computed<ChartData<'bar'>>(() => {
	const labels: string[] = [];
	const data: number[] = [];

	for (const entry of props.data) {
		labels.push(dateformat(entry.date, 'd. mmm'));
		data.push(entry.values.failed);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.failed'),
				data,
				backgroundColor: colorPrimary.value,
			},
		],
	};
});
</script>

<template>
	<Bar :data="chartData" :options="chartOptions" />
</template>

<style lang="scss" module></style>
