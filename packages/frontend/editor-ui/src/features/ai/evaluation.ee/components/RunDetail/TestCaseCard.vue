<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import { computeDurationMs, type DeltaTone, type MetricSource } from '../../evaluation.utils';
import { getErrorBaseKey } from '../../evaluation.constants';
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
	cancel: [TestCaseExecutionRecord];
}>();

const locale = useI18n();

const status = computed(() => props.testCase.status);

const tokens = computed(() => {
	const value = props.testCase.metrics?.totalTokens;
	return typeof value === 'number' ? value : undefined;
});

const durationMs = computed(() => {
	const fromMetric = props.testCase.metrics?.executionTime;
	if (typeof fromMetric === 'number') return fromMetric;
	return computeDurationMs(props.testCase.runAt ?? undefined, props.testCase.updatedAt);
});

const showMetricsTable = computed(() => status.value === 'success');
const showErrorMessage = computed(() => status.value === 'error');
const isOpaque = computed(() => status.value === 'new' || status.value === 'cancelled');

const errorMessage = computed(() => {
	const code = props.testCase.errorCode;
	const key = code ? getErrorBaseKey(code) : '';
	if (key) {
		return locale.baseText(key as BaseTextKey);
	}
	return locale.baseText('evaluation.runDetail.error.unknownError');
});
</script>

<template>
	<article
		:class="[$style.card, { [$style.opaque]: isOpaque }]"
		data-test-id="test-case-card"
		:data-status="status"
	>
		<TestCaseHeader
			:index="index"
			:status="status"
			:tokens="tokens"
			:duration-ms="durationMs"
			:execution-id="testCase.executionId"
			@view="emit('view', testCase)"
			@cancel="emit('cancel', testCase)"
		/>
		<TestCaseMetricsTable
			v-if="showMetricsTable"
			:metrics="testCase.metrics"
			:metric-tones="metricTones"
			:metric-sources="metricSources"
		/>
		<div v-else-if="showErrorMessage" :class="$style.errorBlock">
			<N8nText size="small" :class="$style.errorMessage">{{ errorMessage }}</N8nText>
		</div>
	</article>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	transition: opacity 0.15s ease-out;
}

.opaque {
	opacity: 0.5;
}

.errorBlock {
	padding: var(--spacing--sm) var(--spacing--md);
	background-color: var(--color--background--light-3);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--border-radius--base);
}

.errorMessage {
	color: var(--text-color--danger);
}
</style>
