import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as evaluationsApi from './evaluation.api';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import type { EvaluationConfigDto, UpsertEvaluationConfigDto } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE, NodeHelpers } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';

export const useEvaluationStore = defineStore(
	STORES.EVALUATION,
	() => {
		// State
		const loadingTestRuns = ref(false);
		const testRunsById = ref<Record<string, TestRunRecord>>({});
		const testCaseExecutionsById = ref<Record<string, TestCaseExecutionRecord>>({});
		const pollingTimeouts = ref<Record<string, NodeJS.Timeout>>({});
		const configsByWorkflowId = ref<Record<string, EvaluationConfigDto[]>>({});
		const configLoading = ref<Record<string, boolean>>({});

		// Store instances
		const rootStore = useRootStore();
		const workflowsStore = useWorkflowsStore();
		const workflowDocumentStore = computed(() =>
			useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
		);
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
			return workflowDocumentStore.value.allNodes.some(
				(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
			);
		});

		function evaluationNodeExist(operation: string) {
			return workflowDocumentStore.value.allNodes.some((node) => {
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
			if (pollingTimeouts.value[runId]) return;
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

		const pendingConfigFetches = new Map<string, Promise<EvaluationConfigDto[]>>();

		const fetchEvaluationConfigs = async (workflowId: string): Promise<EvaluationConfigDto[]> => {
			const existing = pendingConfigFetches.get(workflowId);
			if (existing) return await existing;
			configLoading.value[workflowId] = true;
			const promise = evaluationsApi
				.listEvaluationConfigs(rootStore.restApiContext, workflowId)
				.then((configs) => {
					configsByWorkflowId.value[workflowId] = configs;
					return configs;
				})
				.finally(() => {
					configLoading.value[workflowId] = false;
					pendingConfigFetches.delete(workflowId);
				});
			pendingConfigFetches.set(workflowId, promise);
			return await promise;
		};

		const createEvaluationConfig = async (
			workflowId: string,
			payload: UpsertEvaluationConfigDto,
		): Promise<EvaluationConfigDto> => {
			const created = await evaluationsApi.createEvaluationConfig(
				rootStore.restApiContext,
				workflowId,
				payload,
			);
			const existing = configsByWorkflowId.value[workflowId] ?? [];
			configsByWorkflowId.value[workflowId] = [...existing, created];
			return created;
		};

		const updateEvaluationConfig = async (
			workflowId: string,
			configId: string,
			payload: UpsertEvaluationConfigDto,
		): Promise<EvaluationConfigDto> => {
			const updated = await evaluationsApi.updateEvaluationConfig(
				rootStore.restApiContext,
				workflowId,
				configId,
				payload,
			);
			const existing = configsByWorkflowId.value[workflowId] ?? [];
			const index = existing.findIndex((config) => config.id === configId);
			if (index >= 0) {
				const next = [...existing];
				next[index] = updated;
				configsByWorkflowId.value[workflowId] = next;
			} else {
				configsByWorkflowId.value[workflowId] = [...existing, updated];
			}
			return updated;
		};

		const deleteEvaluationConfig = async (workflowId: string, configId: string): Promise<void> => {
			await evaluationsApi.deleteEvaluationConfig(rootStore.restApiContext, workflowId, configId);
			const existing = configsByWorkflowId.value[workflowId] ?? [];
			configsByWorkflowId.value[workflowId] = existing.filter((config) => config.id !== configId);
		};

		const startConfigTestRun = async (workflowId: string, configId: string) => {
			const result = await evaluationsApi.startConfigTestRun(
				rootStore.restApiContext,
				workflowId,
				configId,
			);
			startPollingTestRun(workflowId, result.testRunId);
			return result;
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
			configsByWorkflowId,
			configLoading,

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
			fetchEvaluationConfigs,
			createEvaluationConfig,
			updateEvaluationConfig,
			deleteEvaluationConfig,
			startConfigTestRun,
			cleanupPolling,
		};
	},
	{},
);
