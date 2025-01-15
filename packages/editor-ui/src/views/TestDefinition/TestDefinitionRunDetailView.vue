<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useRouter } from 'vue-router';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { N8nCard, N8nText } from 'n8n-design-system';
import TestTableBase from '@/components/TestDefinition/shared/TestTableBase.vue';
import type { TestTableColumn } from '@/components/TestDefinition/shared/TestTableBase.vue';
import { useExecutionsStore } from '@/stores/executions.store';
import { get } from 'lodash-es';
import type { ExecutionSummaryWithScopes } from '@/Interface';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';

interface TestCase extends ExecutionSummaryWithScopes {
	metrics: Record<string, number>;
}

const router = useRouter();
const toast = useToast();
const testDefinitionStore = useTestDefinitionStore();
const executionsStore = useExecutionsStore();
const locale = useI18n();

const isLoading = ref(true);
const testCases = ref<TestCase[]>([]);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const testId = computed(() => router.currentRoute.value.params.testId as string);

const run = computed(() => testDefinitionStore.testRunsById[runId.value]);
const test = computed(() => testDefinitionStore.testDefinitionsById[testId.value]);
const filteredTestCases = computed(() => {
	return testCases.value;
});

const columns = computed(
	(): Array<TestTableColumn<TestCase>> => [
		{
			prop: 'id',
			width: 200,
			label: locale.baseText('testDefinition.runDetail.testCase'),
			sortable: true,
			route: (row: TestCase) => ({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: row.workflowId, executionId: row.id },
			}),
			formatter: (row: TestCase) => `[${row.id}] ${row.workflowName}`,
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
			filterMethod: (value: string, row: TestCase) => row.status === value,
		},
		...Object.keys(run.value?.metrics ?? {}).map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			filter: true,
			formatter: (row: TestCase) => row.metrics[metric]?.toFixed(2) ?? '-',
		})),
	],
);

const metrics = computed(() => run.value?.metrics ?? {});

// Temporary workaround to fetch test cases by manually getting workflow executions
// TODO: Replace with dedicated API endpoint once available
const fetchExecutionTestCases = async () => {
	if (!runId.value || !testId.value) return;

	isLoading.value = true;
	try {
		const testRun = await testDefinitionStore.getTestRun({
			testDefinitionId: testId.value,
			runId: runId.value,
		});
		const testDefinition = await testDefinitionStore.fetchTestDefinition(testId.value);

		// Fetch workflow executions that match this test run
		const evaluationWorkflowExecutions = await executionsStore.fetchExecutions({
			workflowId: testDefinition.evaluationWorkflowId ?? '',
			metadata: [{ key: 'testRunId', value: testRun.id }],
		});

		// For each execution, fetch full details and extract metrics
		const executionsData = await Promise.all(
			evaluationWorkflowExecutions?.results.map(async (execution) => {
				const executionData = await executionsStore.fetchExecution(execution.id);
				const lastExecutedNode = executionData?.data?.resultData?.lastNodeExecuted;
				if (!lastExecutedNode) {
					throw new Error('Last executed node is required');
				}
				const metricsData = get(
					executionData,
					[
						'data',
						'resultData',
						'runData',
						lastExecutedNode,
						'0',
						'data',
						'main',
						'0',
						'0',
						'json',
					],
					{},
				);

				return {
					...execution,
					metrics: metricsData,
				};
			}),
		);

		testCases.value = executionsData ?? [];
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
