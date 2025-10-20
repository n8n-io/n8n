<script setup lang="ts">
import type { TestRunRecord } from '../../evaluation.api';
import { computed, watchEffect } from 'vue';
import { Line } from 'vue-chartjs';
import { useMetricsChart } from '../../composables/useMetricsChart';

import { N8nOption, N8nSelect } from '@n8n/design-system';
const emit = defineEmits<{
	'update:selectedMetric': [value: string];
}>();

const props = defineProps<{
	selectedMetric: string;
	runs: Array<TestRunRecord & { index: number }>;
}>();

const metricsChart = useMetricsChart();

const availableMetrics = computed(() => {
	return props.runs.reduce((acc, run) => {
		const metricKeys = Object.keys(run.metrics ?? {});
		return [...new Set([...acc, ...metricKeys])];
	}, [] as string[]);
});

const filteredRuns = computed(() =>
	props.runs.filter((run) => run.metrics?.[props.selectedMetric] !== undefined),
);

const chartData = computed(() =>
	metricsChart.generateChartData(filteredRuns.value, props.selectedMetric),
);

const chartOptions = computed(() =>
	metricsChart.generateChartOptions({
		metric: props.selectedMetric,
		data: filteredRuns.value,
	}),
);

watchEffect(() => {
	if (props.runs.length > 0 && !props.selectedMetric) {
		emit('update:selectedMetric', availableMetrics.value[0]);
	}
});
</script>

<template>
	<div :class="$style.metricsChartContainer">
		<div :class="$style.chartHeader">
			<N8nSelect
				:model-value="selectedMetric"
				:class="$style.metricSelect"
				placeholder="Select metric"
				size="small"
				@update:model-value="emit('update:selectedMetric', $event)"
			>
				<N8nOption
					v-for="metric in availableMetrics"
					:key="metric"
					:label="metric"
					:value="metric"
				/>
			</N8nSelect>
		</div>
		<div :class="$style.chartWrapper">
			<Line
				:key="selectedMetric"
				:data="chartData"
				:options="chartOptions"
				:class="$style.metricsChart"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.metricsChartContainer {
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground);

	.chartHeader {
		padding: var(--spacing--xs) var(--spacing--sm) 0;
	}

	.chartTitle {
		font-size: var(--font-size--lg);
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}

	.metricSelect {
		max-width: 15rem;
	}

	.chartWrapper {
		position: relative;
		height: var(--metrics-chart-height, 147px);
		width: 100%;
		padding: var(--spacing--sm);
	}
}
</style>
