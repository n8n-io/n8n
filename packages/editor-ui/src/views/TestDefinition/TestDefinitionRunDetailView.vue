<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useRouter } from 'vue-router';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { N8nCard, N8nText } from 'n8n-design-system';
import TestTableBase from '@/components/TestDefinition/shared/TestTableBase.vue';
import type { TestTableColumn } from '@/components/TestDefinition/shared/TestTableBase.vue';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import type { TestCaseExecutionRecord } from '@/api/testDefinition.ee';

const router = useRouter();
const toast = useToast();
const testDefinitionStore = useTestDefinitionStore();
const locale = useI18n();

const isLoading = ref(true);
const testCases = ref<TestCaseExecutionRecord[]>([]);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const testId = computed(() => router.currentRoute.value.params.testId as string);

const run = computed(() => testDefinitionStore.testRunsById[runId.value]);
const test = computed(() => testDefinitionStore.testDefinitionsById[testId.value]);
const filteredTestCases = computed(() => {
	return testCases.value;
});

const getErrorTooltipLinkRoute = (row: TestCaseExecutionRecord) => {
	if (row.errorCode === 'FAILED_TO_EXECUTE_EVALUATION_WORKFLOW') {
		return {
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: test.value?.evaluationWorkflowId,
				executionId: row.evaluationExecutionId,
			},
		};
	} else if (row.errorCode === 'MOCKED_NODE_DOES_NOT_EXIST') {
		return {
			name: VIEWS.TEST_DEFINITION_EDIT,
			params: {
				testId: testId.value,
			},
		};
	} else if (row.errorCode === 'FAILED_TO_EXECUTE_WORKFLOW') {
		return {
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: test.value?.workflowId,
				executionId: row.executionId,
			},
		};
	} else if (row.errorCode === 'TRIGGER_NO_LONGER_EXISTS') {
		return {
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: test.value?.workflowId,
				executionId: row.pastExecutionId,
			},
		};
	} else if (row.errorCode === 'METRICS_MISSING') {
		return {
			name: VIEWS.TEST_DEFINITION_EDIT,
			params: {
				testId: testId.value,
			},
		};
	} else if (row.errorCode === 'UNKNOWN_METRICS') {
		return {
			name: VIEWS.TEST_DEFINITION_EDIT,
			params: {
				testId: testId.value,
			},
		};
	} else if (row.errorCode === 'INVALID_METRICS') {
		return {
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: test.value?.evaluationWorkflowId,
				executionId: row.evaluationExecutionId,
			},
		};
	}

	return undefined;
};

const columns = computed(
	(): Array<TestTableColumn<TestCaseExecutionRecord>> => [
		{
			prop: 'id',
			width: 200,
			label: locale.baseText('testDefinition.runDetail.testCase'),
			sortable: true,
			route: (row: TestCaseExecutionRecord) => {
				if (test.value?.evaluationWorkflowId && row.evaluationExecutionId) {
					return {
						name: VIEWS.EXECUTION_PREVIEW,
						params: {
							name: test.value?.evaluationWorkflowId,
							executionId: row.evaluationExecutionId,
						},
					};
				}

				return undefined;
			},
			formatter: (row: TestCaseExecutionRecord) => `${row.id}`,
			openInNewTab: true,
		},
		{
			prop: 'status',
			label: locale.baseText('testDefinition.listRuns.status'),
			filters: [
				{ text: locale.baseText('testDefinition.listRuns.status.new'), value: 'new' },
				{ text: locale.baseText('testDefinition.listRuns.status.running'), value: 'running' },
				{ text: locale.baseText('testDefinition.listRuns.status.success'), value: 'success' },
				{ text: locale.baseText('testDefinition.listRuns.status.error'), value: 'error' },
			],
			errorRoute: getErrorTooltipLinkRoute,
			filterMethod: (value: string, row: TestCaseExecutionRecord) => row.status === value,
		},
		...Object.keys(run.value?.metrics ?? {}).map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			filter: true,
			formatter: (row: TestCaseExecutionRecord) => row.metrics?.[metric]?.toFixed(2) ?? '-',
		})),
	],
);

const metrics = computed(() => run.value?.metrics ?? {});

// Temporary workaround to fetch test cases by manually getting workflow executions
const fetchExecutionTestCases = async () => {
	if (!runId.value || !testId.value) return;

	isLoading.value = true;
	try {
		await testDefinitionStore.fetchTestDefinition(testId.value);

		const testRun = await testDefinitionStore.getTestRun({
			testDefinitionId: testId.value,
			runId: runId.value,
		});

		const testCaseEvaluationExecutions = await testDefinitionStore.fetchTestCaseExecutions({
			testDefinitionId: testId.value,
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
				<n8n-heading size="large" :bold="true">{{ test?.name }}</n8n-heading>
				<i class="ml-xs mr-xs"><font-awesome-icon icon="chevron-right" /></i>
				<n8n-heading size="large" :bold="true"
					>{{ locale.baseText('testDefinition.listRuns.runNumber') }}{{ run?.id }}</n8n-heading
				>
			</button>
		</div>

		<div :class="$style.cardGrid">
			<N8nCard :class="$style.summaryCard">
				<div :class="$style.stat">
					<N8nText size="small">
						{{ locale.baseText('testDefinition.runDetail.totalCases') }}
					</N8nText>
					<N8nText size="large">{{ testCases.length }}</N8nText>
				</div>
			</N8nCard>

			<N8nCard :class="$style.summaryCard">
				<div :class="$style.stat">
					<N8nText size="small">
						{{ locale.baseText('testDefinition.runDetail.ranAt') }}
					</N8nText>
					<N8nText size="medium">{{
						convertToDisplayDate(new Date(run?.runAt).getTime())
					}}</N8nText>
				</div>
			</N8nCard>

			<N8nCard :class="$style.summaryCard">
				<div :class="$style.stat">
					<N8nText size="small">
						{{ locale.baseText('testDefinition.listRuns.status') }}
					</N8nText>
					<N8nText size="large" :class="run?.status.toLowerCase()">
						{{ run?.status }}
					</N8nText>
				</div>
			</N8nCard>

			<N8nCard v-for="(value, key) in metrics" :key="key" :class="$style.summaryCard">
				<div :class="$style.stat">
					<N8nText size="small">{{ key }}</N8nText>
					<N8nText size="large">{{ value.toFixed(2) }}</N8nText>
				</div>
			</N8nCard>
		</div>

		<N8nCard>
			<div v-if="isLoading" :class="$style.loading">
				<n8n-loading :loading="true" :rows="5" />
			</div>
			<TestTableBase
				v-else
				:data="filteredTestCases"
				:columns="columns"
				:default-sort="{ prop: 'id', order: 'descending' }"
			/>
		</N8nCard>
	</div>
</template>

<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	margin: auto;
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

.cardGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-m);
}

:global {
	.new {
		color: var(--color-info);
	}
	.running {
		color: var(--color-warning);
	}
	.completed {
		color: var(--color-success);
	}
	.error {
		color: var(--color-danger);
	}
}
</style>
