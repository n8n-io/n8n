<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Bar } from 'vue-chartjs';
import { useCssVar } from '@vueuse/core';
import type { InsightsByTime } from '@n8n/api-types';
import { generateBarChartOptions } from '@/features/insights/chartjs.utils';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	data: InsightsByTime[];
}>();

const i18n = useI18n();

const colorPrimary = useCssVar('--color-primary', document.body);
const chartOptions = ref(generateBarChartOptions());

const chartData = computed(() => {
	const labels: string[] = [];
	const succeededData: number[] = [];
	const failedData: number[] = [];

	for (const entry of props.data) {
		labels.push(entry.date);
		succeededData.push(entry.values.succeeded);
		failedData.push(entry.values.failed);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.failed'),
				data: failedData,
				backgroundColor: colorPrimary.value,
			},
			{
				label: i18n.baseText('insights.banner.title.succeeded'),
				data: succeededData,
				backgroundColor: '#3E999F',
			},
		],
	};
});
</script>

<template>
	<Bar :data="chartData" :options="chartOptions" />
</template>

<style lang="scss" module></style>
