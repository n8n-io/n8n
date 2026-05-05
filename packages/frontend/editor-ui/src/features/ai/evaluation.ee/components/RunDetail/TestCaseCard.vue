<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard } from '@n8n/design-system';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import {
	computeDurationMs,
	getUserDefinedMetricNames,
	normalizeMetricValue,
	type MetricSource,
} from '../../evaluation.utils';
import TestCaseHeader from './TestCaseHeader.vue';
import TestCaseMetricRow from './TestCaseMetricRow.vue';

const props = defineProps<{
	testCase: TestCaseExecutionRecord;
	index: number;
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
	return computeDurationMs(props.testCase.runAt ?? undefined, props.testCase.updatedAt);
});

const rows = computed(() => {
	if (props.testCase.status !== 'success') return [];
	return getUserDefinedMetricNames(props.testCase.metrics).map((name) => {
		const source = props.metricSources?.[name];
		return {
			name,
			value: normalizeMetricValue(props.testCase.metrics?.[name]),
			category: source?.category,
			sourceNodeName: source?.nodeName,
		};
	});
});
</script>

<template>
	<N8nCard
		:class="$style.card"
		:style="{ '--card--padding': 'var(--spacing--md)' }"
		data-test-id="test-case-card"
		:data-status="testCase.status"
	>
		<template #header>
			<TestCaseHeader
				:index="index"
				:tokens="tokens"
				:duration-ms="durationMs"
				:execution-id="testCase.executionId"
				@view="emit('view', testCase)"
			/>
		</template>

		<div v-if="rows.length > 0" :class="$style.rowList">
			<TestCaseMetricRow
				v-for="row in rows"
				:key="row.name"
				:name="row.name"
				:value="row.value"
				:category="row.category"
				:source-node-name="row.sourceNodeName"
			/>
		</div>
	</N8nCard>
</template>

<style module lang="scss">
.card {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--xs);
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: 0;
}
</style>
