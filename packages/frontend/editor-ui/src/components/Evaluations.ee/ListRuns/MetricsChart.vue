<script setup lang="ts">
import type { TestRunRecord } from '@/api/evaluation.ee';
import { computed, watchEffect } from 'vue';
import { Line } from 'vue-chartjs';
import { useMetricsChart } from '../composables/useMetricsChart';

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
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-foreground-base);

	.chartHeader {
		padding: var(--spacing-xs) var(--spacing-s) 0;
	}

	.chartTitle {
		font-size: var(--font-size-l);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-base);
	}

	.metricSelect {
		max-width: 15rem;
	}

	.chartWrapper {
		position: relative;
		height: var(--metrics-chart-height, 147px);
		width: 100%;
		padding: var(--spacing-s);
	}
}
</style>
