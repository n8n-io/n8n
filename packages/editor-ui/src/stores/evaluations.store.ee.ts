import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from './root.store';
import { createTestDefinitionsApi } from '@/api/evaluations.ee';
import type { ITestDefinition } from '@/api/evaluations.ee';
import { usePostHog } from './posthog.store';
import { WORKFLOW_EVALUATION_EXPERIMENT } from '@/constants';

export const useEvaluationsStore = defineStore(
	'evaluations',
	() => {
		// State
		const testDefinitionsById = ref<Record<number, ITestDefinition>>({});
		const loading = ref(false);
		const fetchedAll = ref(false);

		// Store instances
		const posthogStore = usePostHog();
		const rootStore = useRootStore();
		const testDefinitionsApi = createTestDefinitionsApi();

		// Computed
		const allTestDefinitions = computed(() => {
			return Object.values(testDefinitionsById.value).sort((a, b) => a.name.localeCompare(b.name));
		});

		// Enable with `window.featureFlags.override('025_workflow_evaluation', true)`
		const isFeatureEnabled = computed(() =>
			posthogStore.isFeatureEnabled(WORKFLOW_EVALUATION_EXPERIMENT),
		);

		const isLoading = computed(() => loading.value);

		const hasTestDefinitions = computed(() => Object.keys(testDefinitionsById.value).length > 0);

		// Methods
		const setAllTestDefinitions = (definitions: ITestDefinition[]) => {
			testDefinitionsById.value = definitions.reduce(
				(acc: Record<number, ITestDefinition>, def: ITestDefinition) => {
					acc[def.id] = def;
					return acc;
				},
				{},
			);
			fetchedAll.value = true;
		};

		const upsertTestDefinitions = (toUpsertDefinitions: ITestDefinition[]) => {
			toUpsertDefinitions.forEach((toUpsertDef) => {
				const defId = toUpsertDef.id;
				const currentDef = testDefinitionsById.value[defId];
				if (currentDef) {
					testDefinitionsById.value = {
						...testDefinitionsById.value,
						[defId]: {
							...currentDef,
							...toUpsertDef,
						},
					};
				} else {
					testDefinitionsById.value = {
						...testDefinitionsById.value,
						[defId]: toUpsertDef,
					};
				}
			});
		};

		const deleteTestDefinition = (id: number) => {
			const { [id]: deleted, ...rest } = testDefinitionsById.value;
			testDefinitionsById.value = rest;
		};

		const fetchAll = async (params?: { force?: boolean; includeScopes?: boolean }) => {
			const { force = false, includeScopes = false } = params || {};
			if (!force && fetchedAll.value) {
				return Object.values(testDefinitionsById.value);
			}

			loading.value = true;
			try {
				const retrievedDefinitions = await testDefinitionsApi.getTestDefinitions(
					rootStore.restApiContext,
					{ includeScopes },
				);

				setAllTestDefinitions(retrievedDefinitions.testDefinitions);
				return retrievedDefinitions;
			} finally {
				loading.value = false;
			}
		};

		const create = async (params: {
			name: string;
			workflowId: string;
			evaluationWorkflowId?: string;
		}) => {
			const createdDefinition = await testDefinitionsApi.createTestDefinition(
				rootStore.restApiContext,
				params,
			);
			upsertTestDefinitions([createdDefinition]);
			return createdDefinition;
		};

		const update = async (params: {
			id: number;
			name?: string;
			evaluationWorkflowId?: string;
			annotationTagId?: string;
		}) => {
			const { id, ...updateParams } = params;
			const updatedDefinition = await testDefinitionsApi.updateTestDefinition(
				rootStore.restApiContext,
				id,
				updateParams,
			);
			upsertTestDefinitions([updatedDefinition]);
			return updatedDefinition;
		};

		const deleteById = async (id: number) => {
			const result = await testDefinitionsApi.deleteTestDefinition(rootStore.restApiContext, id);

			if (result.success) {
				deleteTestDefinition(id);
			}

			return result.success;
		};

		return {
			// State
			testDefinitionsById,

			// Computed
			allTestDefinitions,
			isLoading,
			hasTestDefinitions,
			isFeatureEnabled,

			// Methods
			fetchAll,
			create,
			update,
			deleteById,
			upsertTestDefinitions,
			deleteTestDefinition,
		};
	},
	{},
);
