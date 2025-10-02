import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EnvironmentVariable } from './environments.types';
import * as environmentsApi from './environments.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ExpressionError } from 'n8n-workflow';
import { useProjectsStore } from '@/stores/projects.store';

export const useEnvironmentsStore = defineStore('environments', () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();

	const allVariables = ref<EnvironmentVariable[]>([]);
	const projectId = computed(() => projectStore.currentProject?.id);

	// Variables that are global or filtered by the current project if set
	const variables = computed(() =>
		allVariables.value.filter(
			(v) => !v.project || !projectId.value || v.project.id === projectId.value,
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
		const asObject = variables.value.reduce<Record<string, string | boolean | number>>(
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
		variablesAsObject,
		fetchAllVariables,
		createVariable,
		updateVariable,
		deleteVariable,
	};
});

export default useEnvironmentsStore;
