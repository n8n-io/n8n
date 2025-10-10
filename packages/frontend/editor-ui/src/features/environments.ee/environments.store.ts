import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EnvironmentVariable } from './environments.types';
import * as environmentsApi from './environments.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ExpressionError } from 'n8n-workflow';
import { useProjectsStore } from '@/features/projects/projects.store';

export const useEnvironmentsStore = defineStore('environments', () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();

	const allVariables = ref<EnvironmentVariable[]>([]);
	const projectId = computed(() => projectStore.currentProject?.id);

	// Global variables plus project-specific ones. Includes all projects if none is selected
	const variables = computed(() =>
		allVariables.value.filter(
			(v) => !v.project || !projectId.value || v.project.id === projectId.value,
		),
	);

	// Scoped variables: global variables plus variables for the current project only.
	// If no project is selected, only global variables are included
	const scopedVariables = computed(() =>
		allVariables.value.filter(
			(v) => !v.project || (!projectId.value && !v.project) || v.project.id === projectId.value,
		),
	);

	async function fetchAllVariables() {
		const data = await environmentsApi.getVariables(rootStore.restApiContext);

		allVariables.value = data;

		return data;
	}

	async function createVariable(variable: Omit<EnvironmentVariable, 'id'>) {
		const data = await environmentsApi.createVariable(rootStore.restApiContext, variable);

		allVariables.value.unshift(data);

		return data;
	}

	async function updateVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.updateVariable(rootStore.restApiContext, variable);

		allVariables.value = allVariables.value.map((v) => (v.id === data.id ? data : v));

		return data;
	}

	async function deleteVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.deleteVariable(rootStore.restApiContext, {
			id: variable.id,
		});

		allVariables.value = allVariables.value.filter((v) => v.id !== variable.id);

		return data;
	}

	const variablesAsObject = computed(() => {
		const asObject = scopedVariables.value.reduce<Record<string, string | boolean | number>>(
			(acc, variable) => {
				acc[variable.key] = variable.value;
				return acc;
			},
			{},
		);

		return new Proxy(asObject, {
			set() {
				throw new ExpressionError('Cannot assign values to variables at runtime');
			},
		});
	});

	return {
		variables,
		scopedVariables,
		variablesAsObject,
		fetchAllVariables,
		createVariable,
		updateVariable,
		deleteVariable,
	};
});

export default useEnvironmentsStore;
