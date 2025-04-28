<script setup lang="ts">
import type { TestCaseExecutionRecord } from '@/api/evaluation.ee';
import type { TestTableColumn } from '@/components/Evaluations/shared/TestTableBase.vue';
import TestTableBase from '@/components/Evaluations/shared/TestTableBase.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import type { BaseTextKey } from '@/plugins/i18n';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { N8nActionToggle, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

// TODO: replace with n8n-api type
const TEST_CASE_EXECUTION_ERROR_CODE = {
	MOCKED_NODE_NOT_FOUND: 'MOCKED_NODE_NOT_FOUND',
	FAILED_TO_EXECUTE_WORKFLOW: 'FAILED_TO_EXECUTE_WORKFLOW',
	INVALID_METRICS: 'INVALID_METRICS',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

type TestCaseExecutionErrorCodes =
	(typeof TEST_CASE_EXECUTION_ERROR_CODE)[keyof typeof TEST_CASE_EXECUTION_ERROR_CODE];

const TEST_RUN_ERROR_CODES = {
	TEST_CASE_NOT_FOUND: 'TEST_CASES_NOT_FOUND',
	INTERRUPTED: 'INTERRUPTED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	EVALUATION_TRIGGER_NOT_FOUND: 'EVALUATION_TRIGGER_NOT_FOUND',
} as const;

type TestRunErrorCode = (typeof TEST_RUN_ERROR_CODES)[keyof typeof TEST_RUN_ERROR_CODES];

const router = useRouter();
const toast = useToast();
const testDefinitionStore = useEvaluationStore();
const locale = useI18n();

const isLoading = ref(true);
const testCases = ref<TestCaseExecutionRecord[]>([]);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const workflowId = computed(() => router.currentRoute.value.params.name as string);

const run = computed(() => testDefinitionStore.testRunsById[runId.value]);

const filteredTestCases = computed(() => {
	return testCases.value;
});

const formattedTime = computed(() =>
	convertToDisplayDate(new Date(run.value?.runAt).getTime()).split(' ').reverse(),
);

type Action = { label: string; value: string; disabled: boolean };

const rowActions = (row: TestCaseExecutionRecord): Action[] => {
	return [
		{
			label: 'New Execution',
			value: row.executionId,
			disabled: !Boolean(row.executionId),
		},
	];
};

const gotToExecution = (executionId: string) => {
	const { href } = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: {
			name: workflowId.value,
			executionId,
		},
	});
	window.open(href, '_blank');
};

const testCaseErrorDictionary: Partial<Record<TestCaseExecutionErrorCodes, BaseTextKey>> = {
	MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
	INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',
	UNKNOWN_ERROR: 'evaluation.runDetail.error.unknownError',
} as const;

const testRunErrorDictionary: Partial<Record<TestRunErrorCode, BaseTextKey>> = {
	TEST_CASES_NOT_FOUND: 'evaluation.listRuns.error.testCasesNotFound',
	INTERRUPTED: 'evaluation.listRuns.error.executionInterrupted',
	UNKNOWN_ERROR: 'evaluation.listRuns.error.unknownError',
	EVALUATION_TRIGGER_NOT_FOUND: 'evaluation.listRuns.error.evaluationTriggerNotFound',
} as const;

const getErrorBaseKey = (errorCode?: string): string =>
	testCaseErrorDictionary[errorCode as TestCaseExecutionErrorCodes] ??
	testRunErrorDictionary[errorCode as TestRunErrorCode] ??
	'';

const getErrorTooltipLinkRoute = (row: TestCaseExecutionRecord) => {
	// if (row.errorCode === TEST_CASE_EXECUTION_ERROR_CODE.MOCKED_NODE_NOT_FOUND) {
	// 	return {
	// 		name: VIEWS.EVALUATION_EDIT,
	// 		params: {
	// 			testId: testId.value,
	// 		},
	// 	};
	// } else if (row.errorCode === TEST_CASE_EXECUTION_ERROR_CODE.FAILED_TO_EXECUTE_WORKFLOW) {
	// 	return {
	// 		name: VIEWS.EXECUTION_PREVIEW,
	// 		params: {
	// 			name: test.value?.workflowId,
	// 			executionId: row.executionId,
	// 		},
	// 	};
	// } else if (row.errorCode === TEST_CASE_EXECUTION_ERROR_CODE.EVALUATION_TRIGGER_NOT_FOUND) {
	// 	return {
	// 		name: VIEWS.EXECUTION_PREVIEW,
	// 		params: {
	// 			name: test.value?.workflowId,
	// 			executionId: row.pastExecutionId,
	// 		},
	// 	};
	// } else if (row.errorCode === TEST_CASE_EXECUTION_ERROR_CODE.INVALID_METRICS) {
	// 	return {
	// 		name: VIEWS.EXECUTION_PREVIEW,
	// 		params: {
	// 			name: test.value?.evaluationWorkflowId,
	// 			executionId: row.evaluationExecutionId,
	// 		},
	// 	};
	// }

	return undefined;
};

const columns = computed(
	(): Array<TestTableColumn<TestCaseExecutionRecord>> => [
		{
			prop: 'id',
			width: 250,
			label: locale.baseText('evaluation.runDetail.testCase'),
			sortable: true,
			formatter: (row: TestCaseExecutionRecord) => `${row.id}`,
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
		const testRun = await testDefinitionStore.getTestRun({
			workflowId: workflowId.value,
			runId: runId.value,
		});

		const testCaseEvaluationExecutions = await testDefinitionStore.fetchTestCaseExecutions({
			workflowId: workflowId.value,
			runId: testRun.id,
		});

		testCases.value = testCaseEvaluationExecutions ?? [];
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
				<n8n-heading size="large" :bold="true">TODO: Change title</n8n-heading>
				<i class="ml-xs mr-xs"><font-awesome-icon icon="chevron-right" /></i>
				<n8n-heading size="large" :bold="true">
					{{ locale.baseText('evaluation.listRuns.runNumber') }}{{ run?.id }}
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
					<N8nText size="large" :class="run?.status.toLowerCase()">
						{{ run?.status }}
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
			:columns="columns"
			:default-sort="{ prop: 'id', order: 'descending' }"
		>
			<template #id="{ row }">
				<div style="display: flex; justify-content: space-between; gap: 10px">
					{{ row.id }}
					<N8nActionToggle
						:actions="rowActions(row)"
						icon-orientation="horizontal"
						@action="gotToExecution"
					>
						<N8nButton type="secondary">View</N8nButton>
					</N8nActionToggle>
				</div>
			</template>
			<template #status="{ row }">
				<template v-if="row.status === 'error'">
					<N8nTooltip placement="right" :show-after="300">
						<template #content>
							<template v-if="getErrorBaseKey(row.errorCode)">
								<i18n-t :keypath="getErrorBaseKey(row.errorCode)">
									<template #link>
										<RouterLink :to="getErrorTooltipLinkRoute(row) ?? ''" target="_blank">
											{{
												locale.baseText(`${getErrorBaseKey(row.errorCode)}.solution` as BaseTextKey)
											}}
										</RouterLink>
									</template>
								</i18n-t>
							</template>
							<template v-else> UNKNOWN_ERROR </template>
						</template>
						<div style="display: inline-flex; gap: 8px; text-transform: capitalize">
							<N8nIcon icon="exclamation-triangle" color="danger"></N8nIcon>
							<N8nText size="small" color="danger">
								{{ row.status }}
							</N8nText>
						</div>
					</N8nTooltip>
				</template>
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
