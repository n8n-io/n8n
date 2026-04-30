<script setup lang="ts">
import { computed } from 'vue';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import { computeDurationMs, type DeltaTone } from '../../evaluation.utils';
import TestCaseHeader from './TestCaseHeader.vue';
import TestCaseMetricsTable from './TestCaseMetricsTable.vue';

const props = defineProps<{
	testCase: TestCaseExecutionRecord;
	index: number;
	metricTones: Record<string, DeltaTone>;
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
		<TestCaseMetricsTable :metrics="testCase.metrics" :metric-tones="metricTones" />
	</article>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--border-radius--base);
	background-color: var(--color--background--light-3);
}
</style>
