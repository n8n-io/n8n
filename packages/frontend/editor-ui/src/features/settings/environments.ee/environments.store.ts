import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
	CreateEnvironmentVariable,
	EnvironmentVariable,
	UpdateEnvironmentVariable,
} from './environments.types';
import * as environmentsApi from './environments.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ExpressionError, resolveVariables } from 'n8n-workflow';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

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

	function getVariablesInScope(id: string | null | undefined) {
		return allVariables.value.filter((variable) => (variable.project?.id ?? null) === (id || null));
	}

	async function fetchAllVariables() {
		const data = await environmentsApi.getVariables(rootStore.restApiContext);

		allVariables.value = data;

		return data;
	}

	function setProjectScope(data: EnvironmentVariable, projectId?: string | null) {
		if (!projectId) return;

		const project =
			projectStore.availableProjects.find((p) => p.id === projectId) ??
			projectStore.myProjects.find((p) => p.id === projectId) ??
			(projectStore.personalProject?.id === projectId ? projectStore.personalProject : undefined) ??
			(projectStore.currentProject?.id === projectId ? projectStore.currentProject : undefined);
		if (project) {
			data.project = { id: project.id, name: project.name ?? '' };
		}
	}

	async function createVariable(variable: CreateEnvironmentVariable) {
		const data = await environmentsApi.createVariable(rootStore.restApiContext, variable);
		setProjectScope(data, variable.projectId);
		allVariables.value.unshift(data);

		return data;
	}

	async function updateVariable(variable: UpdateEnvironmentVariable) {
		const data = await environmentsApi.updateVariable(rootStore.restApiContext, variable);
		setProjectScope(data, variable.projectId);
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
		const asObject = resolveVariables(scopedVariables.value, projectId.value);

		return new Proxy(asObject, {
			set() {
				throw new ExpressionError('Cannot assign values to variables at runtime');
			},
		});
	});

	return {
		variables,
		getVariablesInScope,
		scopedVariables,
		variablesAsObject,
		fetchAllVariables,
		createVariable,
		updateVariable,
		deleteVariable,
	};
});

export default useEnvironmentsStore;
