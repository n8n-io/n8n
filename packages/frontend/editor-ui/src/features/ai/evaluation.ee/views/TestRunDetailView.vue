<script setup lang="ts">
import type { TestCaseExecutionRecord, TestRunRecord } from '../evaluation.api';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useEvaluationStore } from '../evaluation.store';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import orderBy from 'lodash/orderBy';
import { getErrorBaseKey } from '../evaluation.constants';
import { N8nCallout, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import {
	computeDelta,
	getDeltaTone,
	getUserDefinedMetricNames,
	type DeltaTone,
} from '../evaluation.utils';
import MetricSummaryStrip from '../components/RunDetail/MetricSummaryStrip.vue';
import AiSummarySection from '../components/RunDetail/AiSummarySection.vue';
import RunStatusPill from '../components/RunDetail/RunStatusPill.vue';
import TestCaseCard from '../components/RunDetail/TestCaseCard.vue';

const router = useRouter();
const toast = useToast();
const evaluationStore = useEvaluationStore();
const locale = useI18n();
const telemetry = useTelemetry();

const isLoading = ref(true);

// Reads from the store so polling updates flow into the view automatically.
const testCases = computed<TestCaseExecutionRecord[]>(() =>
	Object.values(evaluationStore.testCaseExecutionsById).filter(
		(record) => record.testRunId === runId.value,
	),
);
const hasFailedTestCases = computed(() =>
	testCases.value.some((testCase) => testCase.status === 'error'),
);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const workflowId = useInjectWorkflowId();

const run = computed(() => evaluationStore.testRunsById[runId.value]);
const runErrorDetails = computed(() => {
	return run.value?.errorDetails as Record<string, string | number>;
});

const orderedRuns = computed<TestRunRecord[]>(() =>
	orderBy(
		Object.values(evaluationStore.testRunsById).filter(
			(record) => record.workflowId === workflowId.value,
		),
		(record) => new Date(record.runAt),
		['asc'],
	),
);

const testRunIndex = computed(() =>
	orderedRuns.value.findIndex((record) => record.id === runId.value),
);

const previousRun = computed<TestRunRecord | null>(() => {
	const index = testRunIndex.value;
	if (index <= 0) return null;
	return orderedRuns.value[index - 1] ?? null;
});

const orderedTestCases = computed(() =>
	orderBy(
		testCases.value,
		// Pre-created cases have no runAt yet, so prefer the deterministic
		// runIndex set at seeding. Fall back to runAt for legacy rows that
		// pre-date the runIndex column.
		[(record) => record.runIndex ?? Number.MAX_SAFE_INTEGER, (record) => record.runAt ?? ''],
		['asc', 'asc'],
	),
);

const metricTones = computed<Record<string, DeltaTone>>(() => {
	const tones: Record<string, DeltaTone> = {};
	for (const name of getUserDefinedMetricNames(run.value?.metrics)) {
		const delta = computeDelta(run.value?.metrics?.[name], previousRun.value?.metrics?.[name]);
		tones[name] = getDeltaTone(delta);
	}
	return tones;
});

const metricSources = computed(() => evaluationStore.metricSourceByKey);

const caseValuesByKey = computed<Record<string, Array<number | boolean | undefined>>>(() => {
	const result: Record<string, Array<number | boolean | undefined>> = {};
	for (const name of getUserDefinedMetricNames(run.value?.metrics)) {
		result[name] = orderedTestCases.value.map((testCase) => testCase.metrics?.[name]);
	}
	return result;
});

const rerunRun = async () => {
	if (!workflowId.value) return;
	try {
		await evaluationStore.startTestRun(workflowId.value);
		await evaluationStore.fetchTestRuns(workflowId.value);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStartTestRun'));
	}
};

const cancelPendingCase = async (testCase: TestCaseExecutionRecord) => {
	if (!workflowId.value) return;
	try {
		await evaluationStore.cancelTestCase({
			workflowId: workflowId.value,
			runId: runId.value,
			caseId: testCase.id,
		});
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.runDetail.testCase.cancelError'));
	}
};

const openRelatedExecution = (testCase: TestCaseExecutionRecord) => {
	const executionId = testCase.executionId;
	if (!executionId) return;
	telemetry.track('User opened execution from run detail', {
		run_id: runId.value,
		workflow_id: workflowId.value,
		test_case_id: testCase.id,
	});
	const { href } = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: {
			workflowId: workflowId.value,
			executionId,
		},
	});
	window.open(href, '_blank');
};

const fetchExecutionTestCases = async () => {
	if (!runId.value || !workflowId.value) return;

	isLoading.value = true;
	try {
		const testRun = await evaluationStore.getTestRun({
			workflowId: workflowId.value,
			runId: runId.value,
		});
		await evaluationStore.fetchTestCaseExecutions({
			workflowId: workflowId.value,
			runId: testRun.id,
		});
		await evaluationStore.fetchTestRuns(run.value.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.toast.error.fetchTestCases'));
	} finally {
		isLoading.value = false;
	}
};

const trackViewedRunDetail = () => {
	telemetry.track('User viewed run detail', {
		run_id: runId.value,
		workflow_id: workflowId.value,
		has_previous_run: previousRun.value !== null,
		metric_count: getUserDefinedMetricNames(run.value?.metrics).length,
		test_case_count: testCases.value.length,
		failed_test_case_count: testCases.value.filter((c) => c.status === 'error').length,
	});
};

onMounted(async () => {
	await fetchExecutionTestCases();
	trackViewedRunDetail();
});
</script>

<template>
	<div :class="$style.container" data-test-id="test-definition-run-detail">
		<div :class="$style.header">
			<button :class="$style.backButton" @click="router.back()">
				<N8nIcon icon="arrow-left" size="small" />
				<N8nText size="medium">{{ locale.baseText('evaluation.runDetail.backToRuns') }}</N8nText>
			</button>
			<div :class="$style.headingRow">
				<h1 :class="$style.runHeading">
					{{
						locale.baseText('evaluation.listRuns.testCasesListHeader', {
							interpolate: {
								index: testRunIndex + 1,
							},
						})
					}}
				</h1>
				<RunStatusPill v-if="run" :status="run.status" />
			</div>
		</div>

		<N8nCallout v-if="run?.status === 'error'" theme="danger" icon="triangle-alert" class="mb-s">
			<N8nText size="small" :class="$style.capitalized">
				{{
					locale.baseText(
						`${getErrorBaseKey(run?.errorCode)}` as BaseTextKey,
						runErrorDetails ? { interpolate: runErrorDetails } : {},
					) ?? locale.baseText(`${getErrorBaseKey('UNKNOWN_ERROR')}` as BaseTextKey)
				}}
			</N8nText>
		</N8nCallout>

		<N8nCallout
			v-if="run?.status === 'completed' && hasFailedTestCases"
			theme="warning"
			icon="triangle-alert"
			class="mb-s"
		>
			<N8nText size="small" :class="$style.capitalized">
				{{ locale.baseText('evaluation.runDetail.error.partialCasesFailed') }}
			</N8nText>
		</N8nCallout>

		<MetricSummaryStrip
			:current-metrics="run?.metrics"
			:previous-metrics="previousRun?.metrics"
			:metric-sources="metricSources"
			:case-values-by-key="caseValuesByKey"
			class="mb-m"
		/>

		<AiSummarySection />

		<div v-if="isLoading" :class="$style.loading">
			<N8nLoading :loading="true" :rows="5" />
		</div>

		<div v-else :class="$style.caseList">
			<TestCaseCard
				v-for="(testCase, index) in orderedTestCases"
				:key="testCase.id"
				:test-case="testCase"
				:index="index + 1"
				:metric-tones="metricTones"
				:metric-sources="metricSources"
				@view="openRelatedExecution"
				@cancel="cancelPendingCase"
				@rerun="rerunRun"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
:global(tr:hover:has(.open-execution-link:hover)) {
	--table--row--color--background--hover: transparent;
}
</style>

<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) 0;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--lg);
}

.headingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.backButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	transition: color 0.1s ease-in-out;
	width: fit-content;

	&:hover {
		color: var(--color--primary);
	}
}

.runHeading {
	font-size: var(--font-size--2xl);
	line-height: 1.1;
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0;
	letter-spacing: var(--letter-spacing--tight);
}

.capitalized {
	text-transform: none;
}
.capitalized::first-letter {
	text-transform: uppercase;
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.caseList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
</style>
