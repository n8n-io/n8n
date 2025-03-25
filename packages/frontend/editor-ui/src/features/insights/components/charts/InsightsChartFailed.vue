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
	const data: number[] = [];

	for (const entry of props.data) {
		labels.push(entry.date);
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
