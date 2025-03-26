<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { Filler } from 'chart.js';
import type { InsightsByTime } from '@n8n/api-types';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import { useI18n } from '@/composables/useI18n';
import { transformInsightsAverageRunTime } from '@/features/insights/insights.utils';
import type { ScriptableContext } from 'chart.js';

const props = defineProps<{
	data: InsightsByTime[];
}>();

const i18n = useI18n();

const chartOptions = ref(generateLineChartOptions());

const chartData = computed(() => {
	const labels: string[] = [];
	const data: number[] = [];

	for (const entry of props.data) {
		labels.push(entry.date);

		const value = transformInsightsAverageRunTime(entry.values.averageRunTime);

		data.push(value);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.averageRunTime'),
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
