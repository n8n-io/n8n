import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as environmentsApi from '@n8n/rest-api-client/api/projectEnvironments';
import type { ProjectEnvironment } from '@n8n/rest-api-client/api/projectEnvironments';

export type { ProjectEnvironment };

export const useEnvironmentsStore = defineStore(STORES.ENVIRONMENTS, () => {
	const rootStore = useRootStore();

	const environments = ref<ProjectEnvironment[]>([]);

	/** Maps environmentId → publishedVersionId for the current workflow */
	const publishedVersions = ref<Record<string, string>>({});

	/** Currently selected environment ID for canvas manual execution (null = global) */
	const selectedEnvironmentId = ref<string | null>(null);

	async function fetchEnvironments(projectId: string): Promise<void> {
		environments.value = await environmentsApi.getEnvironments(rootStore.restApiContext, projectId);
	}

	async function createEnvironment(projectId: string, name: string): Promise<ProjectEnvironment> {
		const env = await environmentsApi.createEnvironment(rootStore.restApiContext, projectId, {
			name,
		});
		environments.value = [...environments.value, env];
		return env;
	}

	async function updateEnvironment(
		projectId: string,
		envId: string,
		name: string,
	): Promise<ProjectEnvironment> {
		const updated = await environmentsApi.updateEnvironment(
			rootStore.restApiContext,
			projectId,
			envId,
			{ name },
		);
		environments.value = environments.value.map((e) => (e.id === envId ? updated : e));
		return updated;
	}

	async function deleteEnvironment(projectId: string, envId: string): Promise<void> {
		await environmentsApi.deleteEnvironment(rootStore.restApiContext, projectId, envId);
		environments.value = environments.value.filter((e) => e.id !== envId);
		if (selectedEnvironmentId.value === envId) {
			selectedEnvironmentId.value = null;
		}
	}

	async function fetchPublishedVersions(workflowId: string): Promise<void> {
		publishedVersions.value = await environmentsApi.getPublishedEnvVersions(
			rootStore.restApiContext,
			workflowId,
		);
	}

	async function publishToEnvironment(
		workflowId: string,
		environmentId: string,
		versionId: string,
	): Promise<void> {
		await environmentsApi.publishToEnvironment(
			rootStore.restApiContext,
			workflowId,
			environmentId,
			versionId,
		);
		publishedVersions.value = { ...publishedVersions.value, [environmentId]: versionId };
	}

	return {
		environments,
		publishedVersions,
		selectedEnvironmentId,
		fetchEnvironments,
		createEnvironment,
		updateEnvironment,
		deleteEnvironment,
		fetchPublishedVersions,
		publishToEnvironment,
	};
});
