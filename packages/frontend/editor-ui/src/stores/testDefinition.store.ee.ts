import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from './root.store';
import * as testDefinitionsApi from '@/api/testDefinition.ee';
import type {
	TestCaseExecutionRecord,
	TestDefinitionRecord,
	TestRunRecord,
} from '@/api/testDefinition.ee';
import { usePostHog } from './posthog.store';
import { STORES, WORKFLOW_EVALUATION_EXPERIMENT } from '@/constants';
import { useAnnotationTagsStore } from './tags.store';
import { useI18n } from '@/composables/useI18n';

type FieldIssue = { field: string; message: string };

export const useTestDefinitionStore = defineStore(
	STORES.TEST_DEFINITION,
	() => {
		// State
		const testDefinitionsById = ref<Record<string, TestDefinitionRecord>>({});
		const loading = ref(false);
		const fetchedAll = ref(false);
		const testRunsById = ref<Record<string, TestRunRecord>>({});
		const testCaseExecutionsById = ref<Record<string, TestCaseExecutionRecord>>({});
		const pollingTimeouts = ref<Record<string, NodeJS.Timeout>>({});
		const fieldsIssues = ref<Record<string, FieldIssue[]>>({});

		// Store instances
		const posthogStore = usePostHog();
		const rootStore = useRootStore();
		const tagsStore = useAnnotationTagsStore();
		const locale = useI18n();
		// Computed
		const allTestDefinitions = computed(() => {
			return Object.values(testDefinitionsById.value).sort((a, b) =>
				(a.name ?? '').localeCompare(b.name ?? ''),
			);
		});

		const allTestDefinitionsByWorkflowId = computed(() => {
			return Object.values(testDefinitionsById.value).reduce(
				(acc: Record<string, TestDefinitionRecord[]>, test) => {
					if (!acc[test.workflowId]) {
						acc[test.workflowId] = [];
					}
					acc[test.workflowId].push(test);
					return acc;
				},
				{},
			);
		});

		// Enable with `window.featureFlags.override('025_workflow_evaluation', true)`
		const isFeatureEnabled = computed(() =>
			posthogStore.isFeatureEnabled(WORKFLOW_EVALUATION_EXPERIMENT),
		);

		const isLoading = computed(() => loading.value);

		const hasTestDefinitions = computed(() => Object.keys(testDefinitionsById.value).length > 0);

		const testRunsByTestId = computed(() => {
			return Object.values(testRunsById.value).reduce(
				(acc: Record<string, TestRunRecord[]>, run) => {
					if (!acc[run.testDefinitionId]) {
						acc[run.testDefinitionId] = [];
					}
					acc[run.testDefinitionId].push(run);
					return acc;
				},
				{},
			);
		});

		const lastRunByTestId = computed(() => {
			const grouped = Object.values(testRunsById.value).reduce(
				(acc: Record<string, TestRunRecord[]>, run) => {
					if (!acc[run.testDefinitionId]) {
						acc[run.testDefinitionId] = [];
					}
					acc[run.testDefinitionId].push(run);
					return acc;
				},
				{},
			);

			return Object.entries(grouped).reduce(
				(acc: Record<string, TestRunRecord | null>, [testId, runs]) => {
					acc[testId] =
						runs.sort(
							(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
						)[0] || null;
					return acc;
				},
				{},
			);
		});

		const getFieldIssues = (testId: string) => fieldsIssues.value[testId] || [];

		// Methods
		const setAllTestDefinitions = (definitions: TestDefinitionRecord[]) => {
			testDefinitionsById.value = definitions.reduce(
				(acc: Record<string, TestDefinitionRecord>, def: TestDefinitionRecord) => {
					acc[def.id] = def;
					return acc;
				},
				{},
			);
		};

		/**
		 * Upserts test definitions in the store.
		 * @param toUpsertDefinitions - An array of test definitions to upsert.
		 */
		const upsertTestDefinitions = (toUpsertDefinitions: TestDefinitionRecord[]) => {
			toUpsertDefinitions.forEach((toUpsertDef) => {
				const defId = toUpsertDef.id;
				if (!defId) throw Error('ID is required for upserting');
				const currentDef = testDefinitionsById.value[defId];
				testDefinitionsById.value = {
					...testDefinitionsById.value,
					[defId]: {
						...currentDef,
						...toUpsertDef,
					},
				};
			});
		};

		const deleteTestDefinition = (id: string) => {
			const { [id]: deleted, ...rest } = testDefinitionsById.value;
			testDefinitionsById.value = rest;
		};

		const fetchRunsForAllTests = async () => {
			const testDefinitions = Object.values(testDefinitionsById.value);
			try {
				await Promise.all(testDefinitions.map(async (testDef) => await fetchTestRuns(testDef.id)));
			} catch (error) {
				console.error('Error fetching test runs:', error);
			}
		};

		const fetchTestDefinition = async (id: string) => {
			const testDefinition = await testDefinitionsApi.getTestDefinition(
				rootStore.restApiContext,
				id,
			);
			testDefinitionsById.value[testDefinition.id] = testDefinition;
			updateRunFieldIssues(id);
			return testDefinition;
		};

		const fetchTestDefinitionsByWorkflowId = async (workflowId: string) => {
			const testDefinitions = await testDefinitionsApi.getTestDefinitions(
				rootStore.restApiContext,
				{ workflowId },
			);
			setAllTestDefinitions(testDefinitions.testDefinitions);
			return testDefinitions.testDefinitions;
		};

		const fetchTestCaseExecutions = async (params: { testDefinitionId: string; runId: string }) => {
			const testCaseExecutions = await testDefinitionsApi.getTestCaseExecutions(
				rootStore.restApiContext,
				params.testDefinitionId,
				params.runId,
			);

			testCaseExecutions.forEach((testCaseExecution) => {
				testCaseExecutionsById.value[testCaseExecution.id] = testCaseExecution;
			});

			return testCaseExecutions;
		};

		/**
		 * Fetches all test definitions from the API.
		 * @param {boolean} force - If true, fetches the definitions from the API even if they were already fetched before.
		 */
		const fetchAll = async (params?: { force?: boolean; workflowId?: string }) => {
			const { force = false, workflowId } = params ?? {};
			if (!force && fetchedAll.value && !workflowId) {
				const testDefinitions = Object.values(testDefinitionsById.value);
				return {
					count: testDefinitions.length,
					testDefinitions,
				};
			}

			loading.value = true;
			try {
				if (!workflowId) {
					return;
				}

				const retrievedDefinitions = await fetchTestDefinitionsByWorkflowId(workflowId);
				fetchedAll.value = true;

				await Promise.all([
					tagsStore.fetchAll({ force: true, withUsageCount: true }),
					fetchRunsForAllTests(),
				]);
				return retrievedDefinitions;
			} finally {
				loading.value = false;
			}
		};

		const fetchExampleEvaluationInput = async (testId: string, annotationTagId: string) => {
			return await testDefinitionsApi.getExampleEvaluationInput(
				rootStore.restApiContext,
				testId,
				annotationTagId,
			);
		};

		/**
		 * Creates a new test definition using the provided parameters.
		 *
		 * @param {Object} params - An object containing the necessary parameters to create a test definition.
		 * @param {string} params.name - The name of the new test definition.
		 * @param {string} params.workflowId - The ID of the workflow associated with the test definition.
		 * @returns {Promise<TestDefinitionRecord>} A promise that resolves to the newly created test definition.
		 * @throws {Error} Throws an error if there is a problem creating the test definition.
		 */
		const create = async (params: {
			name: string;
			workflowId: string;
		}) => {
			const createdDefinition = await testDefinitionsApi.createTestDefinition(
				rootStore.restApiContext,
				params,
			);
			upsertTestDefinitions([createdDefinition]);
			updateRunFieldIssues(createdDefinition.id);
			return createdDefinition;
		};

		const update = async (params: Partial<TestDefinitionRecord>) => {
			if (!params.id) throw new Error('ID is required to update a test definition');

			const { id, ...updateParams } = params;
			const updatedDefinition = await testDefinitionsApi.updateTestDefinition(
				rootStore.restApiContext,
				id,
				updateParams,
			);
			upsertTestDefinitions([updatedDefinition]);
			updateRunFieldIssues(params.id);
			return updatedDefinition;
		};

		/**
		 * Deletes a test definition by its ID.
		 *
		 * @param {number} id - The ID of the test definition to delete.
		 * @returns {Promise<boolean>} A promise that resolves to true if the test definition was successfully deleted, false otherwise.
		 */
		const deleteById = async (id: string) => {
			const result = await testDefinitionsApi.deleteTestDefinition(rootStore.restApiContext, id);

			if (result.success) {
				deleteTestDefinition(id);
			}

			return result.success;
		};

		// Test Runs Methods
		const fetchTestRuns = async (testDefinitionId: string) => {
			loading.value = true;
			try {
				const runs = await testDefinitionsApi.getTestRuns(
					rootStore.restApiContext,
					testDefinitionId,
				);
				runs.forEach((run) => {
					testRunsById.value[run.id] = run;
					if (['running', 'new'].includes(run.status)) {
						startPollingTestRun(testDefinitionId, run.id);
					}
				});
				return runs;
			} finally {
				loading.value = false;
			}
		};

		const getTestRun = async (params: { testDefinitionId: string; runId: string }) => {
			const run = await testDefinitionsApi.getTestRun(rootStore.restApiContext, params);
			testRunsById.value[run.id] = run;
			updateRunFieldIssues(params.testDefinitionId);
			return run;
		};

		const startTestRun = async (testDefinitionId: string) => {
			const result = await testDefinitionsApi.startTestRun(
				rootStore.restApiContext,
				testDefinitionId,
			);
			return result;
		};

		const cancelTestRun = async (testDefinitionId: string, testRunId: string) => {
			const result = await testDefinitionsApi.cancelTestRun(
				rootStore.restApiContext,
				testDefinitionId,
				testRunId,
			);
			return result;
		};

		const deleteTestRun = async (params: { testDefinitionId: string; runId: string }) => {
			const result = await testDefinitionsApi.deleteTestRun(rootStore.restApiContext, params);
			if (result.success) {
				const { [params.runId]: deleted, ...rest } = testRunsById.value;
				testRunsById.value = rest;
			}
			return result;
		};

		// TODO: This is a temporary solution to poll for test run status.
		// We should use a more efficient polling mechanism in the future.
		const startPollingTestRun = (testDefinitionId: string, runId: string) => {
			const poll = async () => {
				const run = await getTestRun({ testDefinitionId, runId });
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

		const updateRunFieldIssues = (testId: string) => {
			const issues: FieldIssue[] = [];
			const testDefinition = testDefinitionsById.value[testId];

			if (!testDefinition) {
				return;
			}

			if (!testDefinition.annotationTagId) {
				issues.push({
					field: 'tags',
					message: locale.baseText('testDefinition.configError.noEvaluationTag'),
				});
			} else {
				const tagUsageCount = tagsStore.tagsById[testDefinition.annotationTagId]?.usageCount ?? 0;

				if (tagUsageCount === 0) {
					issues.push({
						field: 'tags',
						message: locale.baseText('testDefinition.configError.noExecutionsAddedToTag'),
					});
				}
			}

			if (!testDefinition.evaluationWorkflowId) {
				issues.push({
					field: 'evaluationWorkflow',
					message: locale.baseText('testDefinition.configError.noEvaluationWorkflow'),
				});
			}

			fieldsIssues.value = {
				...fieldsIssues.value,
				[testId]: issues,
			};
			return issues;
		};

		return {
			// State
			fetchedAll,
			testDefinitionsById,
			testRunsById,
			testCaseExecutionsById,

			// Computed
			allTestDefinitions,
			allTestDefinitionsByWorkflowId,
			isLoading,
			hasTestDefinitions,
			isFeatureEnabled,
			testRunsByTestId,
			lastRunByTestId,

			// Methods
			fetchTestDefinition,
			fetchTestDefinitionsByWorkflowId,
			fetchTestCaseExecutions,
			fetchAll,
			fetchExampleEvaluationInput,
			create,
			update,
			deleteById,
			upsertTestDefinitions,
			deleteTestDefinition,
			fetchTestRuns,
			getTestRun,
			startTestRun,
			cancelTestRun,
			deleteTestRun,
			cleanupPolling,
			getFieldIssues,
			updateRunFieldIssues,
		};
	},
	{},
);
