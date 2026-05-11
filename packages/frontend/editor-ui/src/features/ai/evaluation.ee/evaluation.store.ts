import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as evaluationsApi from './evaluation.api';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE, NodeHelpers } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getMetricCategory, type MetricSource } from './evaluation.utils';

const BUILTIN_METRIC_DEFAULT_NAMES: Record<string, string> = {
	correctness: 'Correctness',
	helpfulness: 'Helpfulness',
	stringSimilarity: 'String similarity',
	categorization: 'Categorization',
	toolsUsed: 'Tools Used',
};

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

		// Per-metric category + source-node name, keyed by metric name as it
		// appears in the run output. Built-in nodes emit one key (overridable
		// via `options.metricName`); customMetrics emits one key per assignment.
		const metricSourceByKey = computed<Record<string, MetricSource>>(() => {
			const map: Record<string, MetricSource> = {};

			for (const node of workflowDocumentStore.value.allNodes) {
				if (node.type !== EVALUATION_NODE_TYPE) continue;

				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (!nodeType) continue;

				const resolved = NodeHelpers.getNodeParameters(
					nodeType.properties,
					node.parameters,
					true,
					false,
					node,
					nodeType,
				);
				if (resolved?.operation !== 'setMetrics') continue;

				const metricType =
					typeof resolved.metric === 'string' && resolved.metric.length > 0
						? resolved.metric
						: 'customMetrics';

				if (metricType === 'customMetrics') {
					const assignments = (
						resolved.metrics as { assignments?: Array<{ name?: string }> } | undefined
					)?.assignments;
					if (!Array.isArray(assignments)) continue;

					for (const assignment of assignments) {
						const key = assignment?.name;
						if (typeof key !== 'string' || key.length === 0) continue;
						if (map[key]) continue;
						map[key] = { category: 'custom', nodeName: node.name };
					}
				} else {
					const overriddenName = (resolved.options as { metricName?: string } | undefined)
						?.metricName;
					const key =
						typeof overriddenName === 'string' && overriddenName.length > 0
							? overriddenName
							: BUILTIN_METRIC_DEFAULT_NAMES[metricType];
					if (!key || map[key]) continue;
					map[key] = { category: getMetricCategory(metricType), nodeName: node.name };
				}
			}

			return map;
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

			// Computed
			isLoading,
			isEvaluationEnabled,
			testRunsByWorkflowId,
			evaluationTriggerExists,
			evaluationSetMetricsNodeExist,
			evaluationSetOutputsNodeExist,
			metricSourceByKey,

			// Methods
			fetchTestCaseExecutions,
			fetchTestRuns,
			getTestRun,
			startTestRun,
			cancelTestRun,
			cancelTestCase,
			deleteTestRun,
			cleanupPolling,
		};
	},
	{},
);
