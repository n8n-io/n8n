import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as environmentsApi from '@n8n/rest-api-client/api/projectEnvironments';
import type {
	ProjectEnvironment,
	EnvironmentCredentialBinding,
} from '@n8n/rest-api-client/api/projectEnvironments';

export type { ProjectEnvironment, EnvironmentCredentialBinding };

export const useEnvironmentsStore = defineStore(STORES.ENVIRONMENTS, () => {
	const rootStore = useRootStore();

	const environments = ref<ProjectEnvironment[]>([]);

	/** Maps environmentId → publishedVersionId for the current workflow */
	const publishedVersions = ref<Record<string, string>>({});

	/** Currently selected environment ID for canvas manual execution (null = global) */
	const selectedEnvironmentId = ref<string | null>(null);

	/** Maps workflowId → environmentId → list of credential bindings */
	const credentialBindings = ref<Record<string, Record<string, EnvironmentCredentialBinding[]>>>(
		{},
	);

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

	async function initializeEnvironments(projectId: string): Promise<void> {
		const created = await environmentsApi.initializeEnvironments(
			rootStore.restApiContext,
			projectId,
		);
		environments.value = created;
	}

	async function deleteEnvironment(projectId: string, envId: string): Promise<void> {
		await environmentsApi.deleteEnvironment(rootStore.restApiContext, projectId, envId);
		environments.value = environments.value.filter((e) => e.id !== envId);
		if (selectedEnvironmentId.value === envId) {
			selectedEnvironmentId.value = null;
		}
		const updated = Object.fromEntries(
			Object.entries(credentialBindings.value).map(([wfId, byEnv]) => {
				const withoutEnv = { ...byEnv };
				delete withoutEnv[envId];
				return [wfId, withoutEnv];
			}),
		);
		credentialBindings.value = updated;
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
		name?: string,
		description?: string,
	): Promise<void> {
		await environmentsApi.publishToEnvironment(
			rootStore.restApiContext,
			workflowId,
			environmentId,
			versionId,
			name,
			description,
		);
		publishedVersions.value = { ...publishedVersions.value, [environmentId]: versionId };
	}

	async function fetchCredentialBindings(
		projectId: string,
		workflowId: string,
		envId: string,
	): Promise<void> {
		const bindings = await environmentsApi.getCredentialBindings(
			rootStore.restApiContext,
			projectId,
			envId,
			workflowId,
		);
		credentialBindings.value = {
			...credentialBindings.value,
			[workflowId]: { ...credentialBindings.value[workflowId], [envId]: bindings },
		};
	}

	async function saveCredentialBindings(
		projectId: string,
		workflowId: string,
		envId: string,
		bindings: Array<{ nodeId: string; credentialType: string; targetCredentialId: string }>,
	): Promise<void> {
		const saved = await environmentsApi.replaceCredentialBindings(
			rootStore.restApiContext,
			projectId,
			envId,
			workflowId,
			{ bindings },
		);
		credentialBindings.value = {
			...credentialBindings.value,
			[workflowId]: { ...credentialBindings.value[workflowId], [envId]: saved },
		};
	}

	async function setCredentialBinding(
		projectId: string,
		workflowId: string,
		envId: string,
		nodeId: string,
		credentialType: string,
		targetCredentialId: string | null,
	): Promise<void> {
		if (!credentialBindings.value[workflowId]?.[envId]) {
			await fetchCredentialBindings(projectId, workflowId, envId);
		}
		const existing = credentialBindings.value[workflowId]?.[envId] ?? [];
		const filtered = existing.filter(
			(b) => !(b.nodeId === nodeId && b.credentialType === credentialType),
		);
		const updated = targetCredentialId
			? [...filtered, { nodeId, credentialType, targetCredentialId }]
			: filtered;
		await saveCredentialBindings(projectId, workflowId, envId, updated);
	}

	return {
		environments,
		publishedVersions,
		selectedEnvironmentId,
		credentialBindings,
		fetchEnvironments,
		initializeEnvironments,
		createEnvironment,
		updateEnvironment,
		deleteEnvironment,
		fetchPublishedVersions,
		publishToEnvironment,
		fetchCredentialBindings,
		saveCredentialBindings,
		setCredentialBinding,
	};
});
