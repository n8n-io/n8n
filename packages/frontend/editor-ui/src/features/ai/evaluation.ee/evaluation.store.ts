import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as evaluationsApi from './evaluation.api';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import type { AddDatasetRowDto, EvaluationConfigDto } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@/app/stores/settings.store';

export const useEvaluationStore = defineStore(
	STORES.EVALUATION,
	() => {
		// State
		const loadingTestRuns = ref(false);
		const testRunsById = ref<Record<string, TestRunRecord>>({});
		const testCaseExecutionsById = ref<Record<string, TestCaseExecutionRecord>>({});
		const pollingTimeouts = ref<Record<string, NodeJS.Timeout>>({});
		const evaluationConfigsByWorkflowId = ref<Record<string, EvaluationConfigDto[]>>({});

		// Store instances
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();

		// Computed

		const isEvaluationEnabled = computed(() => settingsStore.settings.evaluation?.quota !== 0);

		const isLoading = computed(() => loadingTestRuns.value);

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
			const testCaseExecutions = await evaluationsApi.getTestCaseExecutions(
				rootStore.restApiContext,
				params.workflowId,
				params.runId,
			);

			testCaseExecutions.forEach((testCaseExecution) => {
				// API doesn't surface the FK; stamp it so callers can filter
				// `testCaseExecutionsById` by run.
				testCaseExecutionsById.value[testCaseExecution.id] = {
					...testCaseExecution,
					testRunId: params.runId,
				};
			});

			return testCaseExecutions;
		};

		// Test Runs Methods
		const fetchTestRuns = async (workflowId: string) => {
			loadingTestRuns.value = true;
			try {
				const runs = await evaluationsApi.getTestRuns(rootStore.restApiContext, workflowId);
				runs.forEach((run) => {
					testRunsById.value[run.id] = run;
					if (['running', 'new'].includes(run.status)) {
						startPollingTestRun(workflowId, run.id);
					}
				});
				return runs;
			} finally {
				loadingTestRuns.value = false;
			}
		};

		const getTestRun = async (params: { workflowId: string; runId: string }) => {
			const run = await evaluationsApi.getTestRun(rootStore.restApiContext, params);
			testRunsById.value[run.id] = run;
			return run;
		};

		const startTestRun = async (
			workflowId: string,
			options?: evaluationsApi.StartTestRunOptions,
		) => {
			const result = await evaluationsApi.startTestRun(
				rootStore.restApiContext,
				workflowId,
				options,
			);
			return result;
		};

		const cancelTestRun = async (workflowId: string, testRunId: string) => {
			const result = await evaluationsApi.cancelTestRun(
				rootStore.restApiContext,
				workflowId,
				testRunId,
			);
			return result;
		};

		const cancelTestCase = async (params: {
			workflowId: string;
			runId: string;
			caseId: string;
		}) => {
			const result = await evaluationsApi.cancelTestCase(
				rootStore.restApiContext,
				params.workflowId,
				params.runId,
				params.caseId,
			);
			// Optimistically reflect the new status until the next poll arrives.
			const cached = testCaseExecutionsById.value[params.caseId];
			if (cached) {
				testCaseExecutionsById.value[params.caseId] = { ...cached, status: 'cancelled' };
			}
			return result;
		};

		const deleteTestRun = async (params: { workflowId: string; runId: string }) => {
			const result = await evaluationsApi.deleteTestRun(rootStore.restApiContext, params);
			if (result.success) {
				const { [params.runId]: deleted, ...rest } = testRunsById.value;
				testRunsById.value = rest;
			}
			return result;
		};

		// Evaluation config + dataset methods

		const fetchEvaluationConfigs = async (workflowId: string) => {
			const configs = await evaluationsApi.listEvaluationConfigs(
				rootStore.restApiContext,
				workflowId,
			);
			evaluationConfigsByWorkflowId.value[workflowId] = configs;
			return configs;
		};

		const getDatasetCandidate = async (params: {
			workflowId: string;
			configId: string;
			executionId: string;
		}) => {
			return await evaluationsApi.getDatasetCandidate(
				rootStore.restApiContext,
				params.workflowId,
				params.configId,
				params.executionId,
			);
		};

		const addExecutionToDataset = async (params: {
			workflowId: string;
			configId: string;
			payload: AddDatasetRowDto;
		}) => {
			return await evaluationsApi.addDatasetRow(
				rootStore.restApiContext,
				params.workflowId,
				params.configId,
				params.payload,
			);
		};

		// TODO: This is a temporary solution to poll for test run status.
		// We should use a more efficient polling mechanism in the future.
		const startPollingTestRun = (workflowId: string, runId: string) => {
			const poll = async () => {
				try {
					const run = await getTestRun({ workflowId, runId });
					if (['running', 'new'].includes(run.status)) {
						// Also refresh per-case rows so the run detail page can
						// surface running / completed cases as they progress.
						await fetchTestCaseExecutions({ workflowId, runId }).catch(() => {});
						pollingTimeouts.value[runId] = setTimeout(poll, 1000);
					} else {
						// One last refresh so any cases that finished between
						// polls (or just arrived as 'success'/'error') land.
						await fetchTestCaseExecutions({ workflowId, runId }).catch(() => {});
						delete pollingTimeouts.value[runId];
					}
				} catch (error) {
					// If the API call fails, continue polling
					pollingTimeouts.value[runId] = setTimeout(poll, 1000);
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
			testRunsById,
			testCaseExecutionsById,
			evaluationConfigsByWorkflowId,

			// Computed
			isLoading,
			isEvaluationEnabled,
			testRunsByWorkflowId,

			// Methods
			fetchTestCaseExecutions,
			fetchTestRuns,
			getTestRun,
			startTestRun,
			cancelTestRun,
			cancelTestCase,
			deleteTestRun,
			fetchEvaluationConfigs,
			cleanupPolling,
			getDatasetCandidate,
			addExecutionToDataset,
		};
	},
	{},
);
