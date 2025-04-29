import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as testDefinitionsApi from '@/api/evaluation.ee';
import type { TestCaseExecutionRecord, TestRunRecord } from '@/api/evaluation.ee';
import { usePostHog } from './posthog.store';
import { WORKFLOW_EVALUATION_EXPERIMENT } from '@/constants';
import { STORES } from '@n8n/stores';

export const useEvaluationStore = defineStore(
	STORES.EVALUATION,
	() => {
		// State
		const loading = ref(false);
		const fetchedAll = ref(false);
		const testRunsById = ref<Record<string, TestRunRecord>>({});
		const testCaseExecutionsById = ref<Record<string, TestCaseExecutionRecord>>({});
		const pollingTimeouts = ref<Record<string, NodeJS.Timeout>>({});

		// Store instances
		const posthogStore = usePostHog();
		const rootStore = useRootStore();

		// Computed

		// Enable with `window.featureFlags.override('025_workflow_evaluation', true)`
		const isFeatureEnabled = computed(() =>
			posthogStore.isFeatureEnabled(WORKFLOW_EVALUATION_EXPERIMENT),
		);

		const isLoading = computed(() => loading.value);

		const testRunsByWorkflowId = computed(() => {
			return Object.values(testRunsById.value).reduce(
				(acc: Record<string, TestRunRecord[]>, run) => {
					if (!acc[run.workflowId]) {
						acc[run.workflowId] = [];
					}
					acc[run.workflowId].push(run);
					return acc;
				},
				{},
			);
		});

		// Methods

		const fetchTestCaseExecutions = async (params: { workflowId: string; runId: string }) => {
			const testCaseExecutions = await testDefinitionsApi.getTestCaseExecutions(
				rootStore.restApiContext,
				params.workflowId,
				params.runId,
			);

			testCaseExecutions.forEach((testCaseExecution) => {
				testCaseExecutionsById.value[testCaseExecution.id] = testCaseExecution;
			});

			return testCaseExecutions;
		};

		// Test Runs Methods
		const fetchTestRuns = async (workflowId: string) => {
			loading.value = true;
			try {
				const runs = await testDefinitionsApi.getTestRuns(rootStore.restApiContext, workflowId);
				runs.forEach((run) => {
					testRunsById.value[run.id] = run;
					if (['running', 'new'].includes(run.status)) {
						startPollingTestRun(workflowId, run.id);
					}
				});
				return runs;
			} finally {
				loading.value = false;
			}
		};

		const getTestRun = async (params: { workflowId: string; runId: string }) => {
			const run = await testDefinitionsApi.getTestRun(rootStore.restApiContext, params);
			testRunsById.value[run.id] = run;
			return run;
		};

		const startTestRun = async (workflowId: string) => {
			const result = await testDefinitionsApi.startTestRun(rootStore.restApiContext, workflowId);
			return result;
		};

		const cancelTestRun = async (workflowId: string, testRunId: string) => {
			const result = await testDefinitionsApi.cancelTestRun(
				rootStore.restApiContext,
				workflowId,
				testRunId,
			);
			return result;
		};

		const deleteTestRun = async (params: { workflowId: string; runId: string }) => {
			const result = await testDefinitionsApi.deleteTestRun(rootStore.restApiContext, params);
			if (result.success) {
				const { [params.runId]: deleted, ...rest } = testRunsById.value;
				testRunsById.value = rest;
			}
			return result;
		};

		// TODO: This is a temporary solution to poll for test run status.
		// We should use a more efficient polling mechanism in the future.
		const startPollingTestRun = (workflowId: string, runId: string) => {
			const poll = async () => {
				const run = await getTestRun({ workflowId, runId });
				if (['running', 'new'].includes(run.status)) {
					pollingTimeouts.value[runId] = setTimeout(poll, 1000);
				} else {
					delete pollingTimeouts.value[runId];
				}
			};
			void poll();
		};

		const cleanupPolling = () => {
			Object.values(pollingTimeouts.value).forEach((timeout) => {
				clearTimeout(timeout);
			});
			pollingTimeouts.value = {};
		};

		return {
			// State
			fetchedAll,
			testRunsById,
			testCaseExecutionsById,

			// Computed
			isLoading,
			isFeatureEnabled,
			testRunsByTestId: testRunsByWorkflowId,

			// Methods
			fetchTestCaseExecutions,
			fetchTestRuns,
			getTestRun,
			startTestRun,
			cancelTestRun,
			deleteTestRun,
			cleanupPolling,
		};
	},
	{},
);
