<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { generateBarChartOptions } from '@/features/insights/chartjs.utils';
import { DATE_FORMAT_MASK, INSIGHTS_UNIT_MAPPING } from '@/features/insights/insights.constants';
import { transformInsightsFailureRate } from '@/features/insights/insights.utils';
import type { InsightsByTime, InsightsSummaryType } from '@n8n/api-types';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { useCssVar } from '@vueuse/core';
import type { ChartData } from 'chart.js';
import dateformat from 'dateformat';
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';

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
						return `${label} ${smartDecimal(context.parsed.y)}${INSIGHTS_UNIT_MAPPING[props.type](context.parsed.y)}`;
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
		labels.push(dateformat(entry.date, DATE_FORMAT_MASK));
		data.push(transformInsightsFailureRate(entry.values.failureRate));
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.failureRate'),
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
