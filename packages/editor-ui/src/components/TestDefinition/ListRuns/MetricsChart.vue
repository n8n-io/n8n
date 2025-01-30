<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { Line } from 'vue-chartjs';
import { useMetricsChart } from '../composables/useMetricsChart';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';
import type { AppliedThemeOption } from '@/Interface';

const emit = defineEmits<{
	'update:selectedMetric': [value: string];
}>();

const props = defineProps<{
	selectedMetric: string;
	runs: TestRunRecord[];
	theme?: AppliedThemeOption;
}>();

const locale = useI18n();
const metricsChart = useMetricsChart(props.theme);

const availableMetrics = computed(() => {
	return props.runs.reduce((acc, run) => {
		const metricKeys = Object.keys(run.metrics ?? {});
		return [...new Set([...acc, ...metricKeys])];
	}, [] as string[]);
});

const chartData = computed(() => metricsChart.generateChartData(props.runs, props.selectedMetric));

const chartOptions = computed(() =>
	metricsChart.generateChartOptions({
		metric: props.selectedMetric,
		xTitle: locale.baseText('testDefinition.listRuns.runDate'),
	}),
);

watchEffect(() => {
	if (props.runs.length > 0 && !props.selectedMetric) {
		emit('update:selectedMetric', availableMetrics.value[0]);
	}
});
</script>

<template>
	<div v-if="availableMetrics.length > 0" :class="$style.metricsChartContainer">
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
			<N8nText>{{ locale.baseText('testDefinition.listRuns.metricsOverTime') }}</N8nText>
		</div>
		<div :class="$style.chartWrapper">
			<Line
				v-if="availableMetrics.length > 0"
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
	box-shadow: var(--box-shadow-base);

	.chartHeader {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: var(--spacing-s);
		margin-bottom: var(--spacing-m);
		padding: var(--spacing-xs) var(--spacing-s);
		border-bottom: 1px solid var(--color-foreground-base);
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
		height: var(--metrics-chart-height, 400px);
		width: 100%;
		padding: var(--spacing-s);
	}
}
</style>
