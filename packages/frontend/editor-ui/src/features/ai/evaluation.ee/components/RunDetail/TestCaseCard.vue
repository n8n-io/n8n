<script setup lang="ts">
import { computed } from 'vue';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import { computeDurationMs, type DeltaTone, type MetricSource } from '../../evaluation.utils';
import TestCaseHeader from './TestCaseHeader.vue';
import TestCaseMetricsTable from './TestCaseMetricsTable.vue';

const props = defineProps<{
	testCase: TestCaseExecutionRecord;
	index: number;
	metricTones: Record<string, DeltaTone>;
	metricSources?: Record<string, MetricSource>;
}>();

const emit = defineEmits<{
	view: [TestCaseExecutionRecord];
}>();

const tokens = computed(() => {
	const value = props.testCase.metrics?.totalTokens;
	return typeof value === 'number' ? value : undefined;
});

const durationMs = computed(() => {
	const fromMetric = props.testCase.metrics?.executionTime;
	if (typeof fromMetric === 'number') return fromMetric;
	return computeDurationMs(props.testCase.runAt, props.testCase.updatedAt);
});
</script>

<template>
	<article :class="$style.card" data-test-id="test-case-card">
		<TestCaseHeader
			:index="index"
			:tokens="tokens"
			:duration-ms="durationMs"
			:execution-id="testCase.executionId"
			@view="emit('view', testCase)"
		/>
		<TestCaseMetricsTable
			:metrics="testCase.metrics"
			:metric-tones="metricTones"
			:metric-sources="metricSources"
		/>
	</article>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
