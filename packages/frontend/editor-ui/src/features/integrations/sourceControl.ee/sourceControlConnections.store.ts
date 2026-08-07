import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';

import * as connectionsApi from './sourceControlConnections.api';
import type {
	CreateConnectionPayload,
	SourceControlConnectionDto,
	UpdateConnectionPayload,
} from './sourceControlConnections.types';

/**
 * Multi-repo source control connections (LIGO-923 POC). Lives beside the legacy
 * singleton sourceControl store; `connectionForProject` is the most-specific-wins
 * resolver shared by the sidebar chip and project settings.
 */
export const useSourceControlConnectionsStore = defineStore('sourceControlConnections', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const connections = ref<SourceControlConnectionDto[]>([]);
	const isLoading = ref(false);

	const isEnterpriseSourceControlEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.SourceControl],
	);

	const instanceConnection = computed(() =>
		connections.value.find((connection) =>
			connection.scopes.some((scope) => scope.scopeType === 'instance'),
		),
	);

	const connectionForProject = (projectId?: string): SourceControlConnectionDto | undefined => {
		if (projectId) {
			const claimed = connections.value.find((connection) =>
				connection.scopes.some(
					(scope) => scope.scopeType === 'project' && scope.projectId === projectId,
				),
			);
			if (claimed) return claimed;
		}
		return instanceConnection.value;
	};

	const fetchAll = async () => {
		isLoading.value = true;
		try {
			connections.value = await connectionsApi.getConnections(rootStore.restApiContext);
		} finally {
			isLoading.value = false;
		}
	};

	const create = async (payload: CreateConnectionPayload) => {
		const created = await connectionsApi.createConnection(rootStore.restApiContext, payload);
		await fetchAll();
		return created;
	};

	const update = async (connectionId: string, payload: UpdateConnectionPayload) => {
		const updated = await connectionsApi.updateConnection(
			rootStore.restApiContext,
			connectionId,
			payload,
		);
		await fetchAll();
		return updated;
	};

	const remove = async (connectionId: string) => {
		await connectionsApi.deleteConnection(rootStore.restApiContext, connectionId);
		await fetchAll();
	};

	const connect = async (connectionId: string) => {
		const connected = await connectionsApi.connect(rootStore.restApiContext, connectionId);
		await fetchAll();
		return connected;
	};

	const disconnect = async (connectionId: string) => {
		await connectionsApi.disconnect(rootStore.restApiContext, connectionId);
		await fetchAll();
	};

	const generateKeyPair = async (connectionId: string, keyGeneratorType?: 'ed25519' | 'rsa') => {
		const updated = await connectionsApi.generateKeyPair(
			rootStore.restApiContext,
			connectionId,
			keyGeneratorType,
		);
		await fetchAll();
		return updated;
	};

	const getBranches = async (connectionId: string) => {
		return await connectionsApi.getBranches(rootStore.restApiContext, connectionId);
	};

	const claimProject = async (connectionId: string, projectId: string) => {
		await connectionsApi.claimScope(rootStore.restApiContext, connectionId, {
			scopeType: 'project',
			projectId,
		});
		await fetchAll();
	};

	const unclaimProject = async (connectionId: string, projectId: string) => {
		await connectionsApi.unclaimProject(rootStore.restApiContext, connectionId, projectId);
		await fetchAll();
	};

	const setInstanceScope = async (connectionId: string) => {
		await connectionsApi.claimScope(rootStore.restApiContext, connectionId, {
			scopeType: 'instance',
		});
		await fetchAll();
	};

	const removeInstanceScope = async (connectionId: string) => {
		await connectionsApi.removeInstanceScope(rootStore.restApiContext, connectionId);
		await fetchAll();
	};

	const getStatus = async (connectionId: string) => {
		return await connectionsApi.getStatus(rootStore.restApiContext, connectionId);
	};

	const push = async (connectionId: string, commitMessage: string) => {
		return await connectionsApi.push(rootStore.restApiContext, connectionId, commitMessage);
	};

	const pull = async (connectionId: string) => {
		return await connectionsApi.pull(rootStore.restApiContext, connectionId);
	};

	return {
		connections,
		isLoading,
		isEnterpriseSourceControlEnabled,
		instanceConnection,
		connectionForProject,
		fetchAll,
		create,
		update,
		remove,
		connect,
		disconnect,
		generateKeyPair,
		getBranches,
		claimProject,
		unclaimProject,
		setInstanceScope,
		removeInstanceScope,
		getStatus,
		push,
		pull,
	};
});
