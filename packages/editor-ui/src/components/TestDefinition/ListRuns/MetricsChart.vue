<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { Line } from 'vue-chartjs';
import { useMetricsChart } from './useMetricsChart';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	'update:selectedMetric': [value: string];
}>();

const props = defineProps<{
	selectedMetric: string;
	runs: TestRunRecord[];
}>();

const locale = useI18n();

const availableMetrics = computed(() => {
	return props.runs.reduce((acc, run) => {
		const metricKeys = Object.keys(run.metrics ?? {});
		return [...new Set([...acc, ...metricKeys])];
	}, [] as string[]);
});
const { generateChartData, generateChartOptions } = useMetricsChart();

const chartData = computed(() => generateChartData(props.runs, props.selectedMetric));
const chartOptions = computed(() => generateChartOptions(props.selectedMetric));

watchEffect(() => {
	if (props.runs.length > 0 && !props.selectedMetric) {
		emit('update:selectedMetric', availableMetrics.value[0]);
	}
});
</script>

<template>
	<div :class="$style.metricsChartContainer">
		<div :class="$style.chartHeader">
			<N8nText>{{ locale.baseText('testDefinition.listRuns.metricsOverTime') }}</N8nText>
			<el-select
				:model-value="selectedMetric"
				:class="$style.metricSelect"
				placeholder="Select metric"
				@update:model-value="emit('update:selectedMetric', $event)"
			>
				<el-option
					v-for="metric in availableMetrics"
					:key="metric"
					:label="metric"
					:value="metric"
				/>
			</el-select>
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
	margin: var(--spacing-m) 0;
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

	.chartHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-m);
		padding: var(--spacing-s);
		border-bottom: 1px solid var(--color-foreground-base);
	}

	.chartTitle {
		font-size: var(--font-size-l);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-base);
		margin: 0;
	}

	.metricSelect {
		width: 200px;
	}

	.chartWrapper {
		position: relative;
		height: 400px;
		width: 100%;
		padding: var(--spacing-s);
	}
}
</style>
