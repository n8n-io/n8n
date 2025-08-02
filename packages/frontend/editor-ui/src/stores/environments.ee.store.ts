import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EnvironmentVariable } from '@/Interface';
import * as environmentsApi from '@/api/environments.ee';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ExpressionError } from 'n8n-workflow';

export const useEnvironmentsStore = defineStore('environments', () => {
	const rootStore = useRootStore();

	const variables = ref<EnvironmentVariable[]>([]);

	async function fetchAllVariables() {
		const data = await environmentsApi.getVariables(rootStore.restApiContext);

		variables.value = data;

		return data;
	}

	async function createVariable(variable: Omit<EnvironmentVariable, 'id'>) {
		const data = await environmentsApi.createVariable(rootStore.restApiContext, variable);

		variables.value.unshift(data);

		return data;
	}

	async function updateVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.updateVariable(rootStore.restApiContext, variable);

		variables.value = variables.value.map((v) => (v.id === data.id ? data : v));

		return data;
	}

	async function deleteVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.deleteVariable(rootStore.restApiContext, {
			id: variable.id,
		});

		variables.value = variables.value.filter((v) => v.id !== variable.id);

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
