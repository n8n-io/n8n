<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nCard } from '@n8n/design-system';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import {
	computeDurationMs,
	getUserDefinedMetricNames,
	normalizeMetricValue,
	type DeltaTone,
	type MetricSource,
} from '../../evaluation.utils';
import { getErrorBaseKey } from '../../evaluation.constants';
import TestCaseHeader from './TestCaseHeader.vue';
import TestCaseMetricRow from './TestCaseMetricRow.vue';

const props = defineProps<{
	testCase: TestCaseExecutionRecord;
	index: number;
	metricTones: Record<string, DeltaTone>;
	metricSources?: Record<string, MetricSource>;
}>();

const emit = defineEmits<{
	view: [TestCaseExecutionRecord];
	cancel: [TestCaseExecutionRecord];
	rerun: [TestCaseExecutionRecord];
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

const isOpaque = computed(() => status.value === 'new' || status.value === 'cancelled');
const showMetricRows = computed(() => status.value === 'success' || status.value === 'error');

const errorMessage = computed(() => {
	const code = props.testCase.errorCode;
	const key = code ? getErrorBaseKey(code) : '';
	if (key) return locale.baseText(key as BaseTextKey);
	return locale.baseText('evaluation.runDetail.error.unknownError');
});

const rows = computed(() => {
	if (!showMetricRows.value) return [];
	return getUserDefinedMetricNames(props.testCase.metrics).map((name) => {
		const tone = props.metricTones[name] ?? 'default';
		const source = props.metricSources?.[name];
		return {
			name,
			value: normalizeMetricValue(props.testCase.metrics?.[name]),
			tone,
			category: source?.category,
			sourceNodeName: source?.nodeName,
		};
	});
});
</script>

<template>
	<N8nCard
		:class="[$style.card, { [$style.opaque]: isOpaque }]"
		data-test-id="test-case-card"
		:data-status="status"
	>
		<template #header>
			<TestCaseHeader
				:index="index"
				:status="status"
				:tokens="tokens"
				:duration-ms="durationMs"
				:execution-id="testCase.executionId"
				@view="emit('view', testCase)"
				@cancel="emit('cancel', testCase)"
				@rerun="emit('rerun', testCase)"
			/>
		</template>

		<Transition name="fade-rows" appear>
			<div v-if="showMetricRows" :class="$style.rowList">
				<TestCaseMetricRow
					v-for="(row, idx) in rows"
					:key="row.name"
					:name="row.name"
					:value="row.value"
					:tone="row.tone"
					:category="row.category"
					:source-node-name="row.sourceNodeName"
					:errored="status === 'error' && idx === 0"
					:error-message="status === 'error' && idx === 0 ? errorMessage : undefined"
				/>
			</div>
		</Transition>
	</N8nCard>
</template>

<style module lang="scss">
.card {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	transition: opacity 0.15s ease-out;
}

.opaque {
	opacity: 0.5;
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: 0;
}
</style>

<style scoped lang="scss">
.fade-rows-enter-active,
.fade-rows-appear-active {
	animation: rows-fade-in 0.32s ease-out;
}

.fade-rows-leave-active {
	animation: rows-fade-in 0.18s ease-in reverse;
}

@keyframes rows-fade-in {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
