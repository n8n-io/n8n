import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as evaluationsApi from '@/api/evaluation.ee';
import type { TestCaseExecutionRecord, TestRunRecord } from '@/api/evaluation.ee';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE, NodeHelpers } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';

export const useEvaluationStore = defineStore(
	STORES.EVALUATION,
	() => {
		// State
		const loadingTestRuns = ref(false);
		const testRunsById = ref<Record<string, TestRunRecord>>({});
		const testCaseExecutionsById = ref<Record<string, TestCaseExecutionRecord>>({});
		const pollingTimeouts = ref<Record<string, NodeJS.Timeout>>({});

		// Store instances
		const rootStore = useRootStore();
		const workflowsStore = useWorkflowsStore();
		const nodeTypesStore = useNodeTypesStore();
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

		const evaluationTriggerExists = computed(() => {
			return workflowsStore.workflow.nodes.some(
				(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
			);
		});

		function evaluationNodeExist(operation: string) {
			return workflowsStore.workflow.nodes.some((node) => {
				if (node.type !== EVALUATION_NODE_TYPE) {
					return false;
				}

				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (!nodeType) return false;

				const nodeParameters = NodeHelpers.getNodeParameters(
					nodeType.properties,
					node.parameters,
					true,
					false,
					node,
					nodeType,
				);

				return nodeParameters?.operation === operation;
			});
		}

		const evaluationSetMetricsNodeExist = computed(() => {
			return evaluationNodeExist('setMetrics');
		});

		const evaluationSetOutputsNodeExist = computed(() => {
			return evaluationNodeExist('setOutputs');
		});

		// Methods

		const fetchTestCaseExecutions = async (params: { workflowId: string; runId: string }) => {
			const testCaseExecutions = await evaluationsApi.getTestCaseExecutions(
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

		const startTestRun = async (workflowId: string) => {
			const result = await evaluationsApi.startTestRun(rootStore.restApiContext, workflowId);
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

		const deleteTestRun = async (params: { workflowId: string; runId: string }) => {
			const result = await evaluationsApi.deleteTestRun(rootStore.restApiContext, params);
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
				try {
					const run = await getTestRun({ workflowId, runId });
					if (['running', 'new'].includes(run.status)) {
						pollingTimeouts.value[runId] = setTimeout(poll, 1000);
					} else {
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

			// Computed
			isLoading,
			isEvaluationEnabled,
			testRunsByWorkflowId,
			evaluationTriggerExists,
			evaluationSetMetricsNodeExist,
			evaluationSetOutputsNodeExist,

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
