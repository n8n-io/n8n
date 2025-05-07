<script setup lang="ts">
import type { TestCaseExecutionRecord } from '@/api/evaluation.ee';
import type { TestTableColumn } from '@/components/Evaluations/shared/TestTableBase.vue';
import TestTableBase from '@/components/Evaluations/shared/TestTableBase.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import type { BaseTextKey } from '@/plugins/i18n';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { orderBy } from 'lodash-es';
import { statusDictionary } from '@/components/Evaluations/shared/statusDictionary';

// TODO: replace with n8n-api type
const TEST_CASE_EXECUTION_ERROR_CODE = {
	MOCKED_NODE_NOT_FOUND: 'MOCKED_NODE_NOT_FOUND',
	FAILED_TO_EXECUTE_WORKFLOW: 'FAILED_TO_EXECUTE_WORKFLOW',
	INVALID_METRICS: 'INVALID_METRICS',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	NO_METRICS_COLLECTED: 'NO_METRICS_COLLECTED',
} as const;

type TestCaseExecutionErrorCodes =
	(typeof TEST_CASE_EXECUTION_ERROR_CODE)[keyof typeof TEST_CASE_EXECUTION_ERROR_CODE];

const TEST_RUN_ERROR_CODES = {
	TEST_CASE_NOT_FOUND: 'TEST_CASES_NOT_FOUND',
	INTERRUPTED: 'INTERRUPTED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	EVALUATION_TRIGGER_NOT_FOUND: 'EVALUATION_TRIGGER_NOT_FOUND',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'EVALUATION_TRIGGER_NOT_CONFIGURED',
	SET_OUTPUTS_NODE_NOT_FOUND: 'SET_OUTPUTS_NODE_NOT_FOUND',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'SET_OUTPUTS_NODE_NOT_CONFIGURED',
	SET_METRICS_NODE_NOT_FOUND: 'SET_METRICS_NODE_NOT_FOUND',
	SET_METRICS_NODE_NOT_CONFIGURED: 'SET_METRICS_NODE_NOT_CONFIGURED',
	CANT_FETCH_TEST_CASES: 'CANT_FETCH_TEST_CASES',
} as const;

type TestRunErrorCode = (typeof TEST_RUN_ERROR_CODES)[keyof typeof TEST_RUN_ERROR_CODES];

const router = useRouter();
const toast = useToast();
const evaluationStore = useEvaluationStore();
const workflowsStore = useWorkflowsStore();
const locale = useI18n();

const isLoading = ref(true);
const testCases = ref<TestCaseExecutionRecord[]>([]);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const workflowId = computed(() => router.currentRoute.value.params.name as string);
const workflowName = computed(() => workflowsStore.getWorkflowById(workflowId.value)?.name ?? '');

const run = computed(() => evaluationStore.testRunsById[runId.value]);

const filteredTestCases = computed(() =>
	orderBy(testCases.value, (record) => record.runAt, ['asc']).map((record, index) =>
		Object.assign(record, { index: index + 1 }),
	),
);

const testRunIndex = computed(() =>
	Object.values(
		orderBy(evaluationStore.testRunsById, (record) => new Date(record.runAt), ['asc']).filter(
			({ workflowId: wId }) => wId === workflowId.value,
		) ?? {},
	).findIndex(({ id }) => id === runId.value),
);

const formattedTime = computed(() => convertToDisplayDate(new Date(run.value?.runAt).getTime()));

const handleRowClick = (row: TestCaseExecutionRecord) => {
	const executionId = row.executionId;
	if (executionId) {
		const { href } = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: workflowId.value,
				executionId,
			},
		});
		window.open(href, '_blank');
	}
};

const testCaseErrorDictionary: Partial<Record<TestCaseExecutionErrorCodes, BaseTextKey>> = {
	MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
	INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',
	UNKNOWN_ERROR: 'evaluation.runDetail.error.unknownError',
	NO_METRICS_COLLECTED: 'evaluation.runDetail.error.noMetricsCollected',
} as const;

const testRunErrorDictionary: Partial<Record<TestRunErrorCode, BaseTextKey>> = {
	TEST_CASES_NOT_FOUND: 'evaluation.listRuns.error.testCasesNotFound',
	INTERRUPTED: 'evaluation.listRuns.error.executionInterrupted',
	UNKNOWN_ERROR: 'evaluation.listRuns.error.unknownError',
	EVALUATION_TRIGGER_NOT_FOUND: 'evaluation.listRuns.error.evaluationTriggerNotFound',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'evaluation.listRuns.error.evaluationTriggerNotConfigured',
	SET_OUTPUTS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setOutputsNodeNotFound',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setOutputsNodeNotConfigured',
	SET_METRICS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setMetricsNodeNotFound',
	SET_METRICS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setMetricsNodeNotConfigured',
	CANT_FETCH_TEST_CASES: 'evaluation.listRuns.error.cantFetchTestCases',
} as const;

const getErrorBaseKey = (errorCode?: string): string =>
	testCaseErrorDictionary[errorCode as TestCaseExecutionErrorCodes] ??
	testRunErrorDictionary[errorCode as TestRunErrorCode] ??
	'';

const getErrorTooltipLinkRoute = (row: TestCaseExecutionRecord) => {
	switch (row.errorCode) {
		case TEST_CASE_EXECUTION_ERROR_CODE.UNKNOWN_ERROR:
			return row.executionId
				? {
						name: VIEWS.EXECUTION_PREVIEW,
						params: {
							name: workflowId.value,
							executionId: row.executionId,
						},
					}
				: undefined;
		case TEST_CASE_EXECUTION_ERROR_CODE.FAILED_TO_EXECUTE_WORKFLOW:
			return {
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					name: workflowId.value,
					executionId: row.executionId,
				},
			};
		default:
			return undefined;
	}
};

const columns = computed(
	(): Array<TestTableColumn<TestCaseExecutionRecord & { index: number }>> => [
		{
			prop: 'index',
			width: 250,
			label: locale.baseText('evaluation.runDetail.testCase'),
			sortable: true,
			formatter: (row: TestCaseExecutionRecord & { index: number }) => `#${row.index}`,
		},
		{
			prop: 'status',
			label: locale.baseText('evaluation.listRuns.status'),
		},
		...Object.keys(run.value?.metrics ?? {}).map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			filter: true,
			showHeaderTooltip: true,
			formatter: (row: TestCaseExecutionRecord) => row.metrics?.[metric]?.toFixed(2) ?? '-',
		})),
	],
);

const metrics = computed(() => run.value?.metrics ?? {});

// Temporary workaround to fetch test cases by manually getting workflow executions
const fetchExecutionTestCases = async () => {
	if (!runId.value || !workflowId.value) return;

	isLoading.value = true;
	try {
		const testRun = await evaluationStore.getTestRun({
			workflowId: workflowId.value,
			runId: runId.value,
		});
		const testCaseEvaluationExecutions = await evaluationStore.fetchTestCaseExecutions({
			workflowId: workflowId.value,
			runId: testRun.id,
		});

		testCases.value = testCaseEvaluationExecutions ?? [];
		await evaluationStore.fetchTestRuns(run.value.workflowId);
	} catch (error) {
		toast.showError(error, 'Failed to load run details');
	} finally {
		isLoading.value = false;
	}
};

onMounted(async () => {
	await fetchExecutionTestCases();
});
</script>

<template>
	<div :class="$style.container" data-test-id="test-definition-run-detail">
		<div :class="$style.header">
			<button :class="$style.backButton" @click="router.back()">
				<i class="mr-xs"><font-awesome-icon icon="arrow-left" /></i>
				<n8n-heading size="large" :bold="true">{{
					locale.baseText('evaluation.listRuns.runListHeader', {
						interpolate: {
							name: workflowName,
						},
					})
				}}</n8n-heading>
				<i class="ml-xs mr-xs"><font-awesome-icon icon="chevron-right" /></i>
				<n8n-heading size="large" :bold="true">
					{{
						locale.baseText('evaluation.listRuns.testCasesListHeader', {
							interpolate: {
								index: testRunIndex + 1,
							},
						})
					}}
				</n8n-heading>
			</button>
		</div>
		<el-scrollbar always :class="$style.scrollableSummary" class="mb-m">
			<div style="display: flex">
				<div :class="$style.summaryCard">
					<N8nText size="small">
						{{ locale.baseText('evaluation.runDetail.totalCases') }}
					</N8nText>
					<N8nText size="xlarge" style="font-size: 32px" bold>{{ testCases.length }}</N8nText>
				</div>

				<div :class="$style.summaryCard">
					<N8nText size="small">
						{{ locale.baseText('evaluation.runDetail.ranAt') }}
					</N8nText>
					<div>
						<N8nText v-for="item in formattedTime" :key="item" size="medium" tag="div">
							{{ item }}
						</N8nText>
					</div>
				</div>

				<div :class="$style.summaryCard">
					<N8nText size="small">
						{{ locale.baseText('evaluation.listRuns.status') }}
					</N8nText>
					<N8nText
						size="large"
						:class="run?.status.toLowerCase()"
						style="text-transform: capitalize"
					>
						{{ run?.status }}
						{{
							locale.baseText(`${getErrorBaseKey(run?.errorCode)}` as BaseTextKey) ?? run?.errorCode
						}}
					</N8nText>
				</div>

				<div v-for="(value, key) in metrics" :key="key" :class="$style.summaryCard">
					<N8nTooltip :content="key" placement="top">
						<N8nText size="small" style="text-overflow: ellipsis; overflow: hidden">
							{{ key }}
						</N8nText>
					</N8nTooltip>

					<N8nText size="xlarge" style="font-size: 32px" bold>{{ value.toFixed(2) }}</N8nText>
				</div>
			</div>
		</el-scrollbar>
		<div v-if="isLoading" :class="$style.loading">
			<n8n-loading :loading="true" :rows="5" />
		</div>

		<TestTableBase
			v-else
			:data="filteredTestCases"
			@row-click="handleRowClick"
			:columns="columns"
			:default-sort="{ prop: 'id', order: 'descending' }"
		>
			<template #id="{ row }">
				<div style="display: flex; justify-content: space-between; gap: 10px">
					{{ row.id }}
				</div>
			</template>
			<template #status="{ row }">
				<div
					style="display: inline-flex; gap: 8px; text-transform: capitalize; align-items: center"
				>
					<N8nIcon
						:icon="statusDictionary[row.status].icon"
						:color="statusDictionary[row.status].color"
						class="mr-2xs"
					/>

					<template v-if="row.status === 'error'">
						<N8nTooltip placement="right" :show-after="300">
							<template #content>
								<template v-if="getErrorBaseKey(row.errorCode)">
									<template v-if="getErrorTooltipLinkRoute(row)">
										{{
											locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) ||
											row.status
										}}
									</template>
									<template v-else> UNKNOWN_ERROR </template>
								</template>
								<template v-else> UNKNOWN_ERROR </template>
							</template>
							<div
								style="
									display: inline-flex;
									gap: 8px;
									text-transform: none;
									text-overflow: ellipsis;
									overflow: hidden;
									white-space: nowrap;
								"
							>
								<N8nText size="small" color="danger">
									{{
										locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) ||
										row.status
									}}
								</N8nText>
							</div>
						</N8nTooltip>
					</template>
					<template v-else>
						{{ row.status }}
					</template>
				</div>
			</template>
		</TestTableBase>
	</div>
</template>

<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	margin: auto;
	padding: var(--spacing-l) var(--spacing-2xl) 0;
}

.backButton {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color-text-base);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	margin-bottom: var(--spacing-l);

	.timestamp {
		color: var(--color-text-base);
		font-size: var(--font-size-s);
	}
}

.summary {
	margin-bottom: var(--spacing-m);

	.summaryStats {
		display: flex;
		gap: var(--spacing-l);
	}
}
.stat {
	display: flex;
	flex-direction: column;
}

.controls {
	display: flex;
	gap: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.downloadButton {
	margin-bottom: var(--spacing-s);
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.scrollableSummary {
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-radius: 5px;
	background-color: var(--color-background-xlight);

	:global(.el-scrollbar__bar) {
		opacity: 1;
	}
	:global(.el-scrollbar__thumb) {
		background-color: var(--color-foreground-base);
		&:hover {
			background-color: var(--color-foreground-dark);
		}
	}
}

.summaryCard {
	padding: var(--spacing-s);
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	flex-basis: 169px;
	flex-shrink: 0;
	max-width: 170px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;

	&:first-child {
		border-top-left-radius: inherit;
		border-bottom-left-radius: inherit;
	}
}
</style>
