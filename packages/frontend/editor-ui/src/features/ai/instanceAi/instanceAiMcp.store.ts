import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionFailureReason,
	InstanceAiMcpConnectionToolResponse,
	InstanceAiMcpConnectionToolsResponse,
	McpRegistryServerResponse,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { i18n } from '@n8n/i18n';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import {
	createMcpConnection,
	deleteMcpConnection,
	fetchAllMcpConnectionTools,
	fetchMcpConnectionTools,
	fetchMcpConnections,
	fetchMcpRegistryServers,
	updateMcpConnection,
	type CreateMcpConnectionBody,
	type UpdateMcpConnectionBody,
} from './instanceAi.mcp.api';

export type InstanceAiMcpConnection = InstanceAiMcpConnectionResponse & {
	status: 'connecting' | InstanceAiMcpConnectionToolsResponse['status'];
};

export const useInstanceAiMcpStore = defineStore('instanceAiMcp', () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const credentialsStore = useCredentialsStore();

	const connections = ref<InstanceAiMcpConnection[]>([]);
	let connectionsLoad: Promise<void> | null = null;
	const catalog = ref<McpRegistryServerResponse[] | null>(null);
	let catalogLoad: Promise<void> | null = null;
	const connectionToolsById = reactive(new Map<string, InstanceAiMcpConnectionToolResponse[]>());
	const isLoadingConnections = ref(false);
	const isLoadingCatalog = ref(false);
	let hasLoadedConnections = false;
	const inFlightConnectionToolsById = new Map<
		string,
		Promise<InstanceAiMcpConnectionToolsResponse>
	>();
	let bulkToolsRequestVersion = 0;

	const connectionsByServerSlug = computed(() => {
		const map = new Map<string, InstanceAiMcpConnection[]>();
		for (const connection of connections.value) {
			const list = map.get(connection.serverSlug) ?? [];
			list.push(connection);
			map.set(connection.serverSlug, list);
		}
		return map;
	});

	async function fetchConnections(): Promise<void> {
		connectionsLoad ??= loadConnections();
		await connectionsLoad;
	}

	async function fetchConnectionsLazy(): Promise<void> {
		if (hasLoadedConnections) return;
		await fetchConnections();
	}

	async function loadConnections(): Promise<void> {
		isLoadingConnections.value = true;
		try {
			const fetched = await fetchMcpConnections(rootStore.restApiContext);
			connections.value = fetched.map((connection) => ({ ...connection, status: 'connecting' }));
			hasLoadedConnections = true;
			void fetchAllConnectionTools();
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.fetchConnections'));
		} finally {
			connectionsLoad = null;
			isLoadingConnections.value = false;
		}
	}

	async function fetchCatalogLazy(): Promise<void> {
		catalogLoad ??= loadCatalog();
		await catalogLoad;
	}

	async function loadCatalog(): Promise<void> {
		isLoadingCatalog.value = true;
		try {
			catalog.value = await fetchMcpRegistryServers(rootStore.restApiContext);
		} catch (error) {
			catalogLoad = null;
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.fetchCatalog'));
		} finally {
			isLoadingCatalog.value = false;
		}
	}

	function clearConnectionTools(id: string): void {
		connectionToolsById.delete(id);
		inFlightConnectionToolsById.delete(id);
	}

	function setConnectionStatus(id: string, status: InstanceAiMcpConnection['status']): void {
		connections.value = connections.value.map((connection) =>
			connection.id === id ? { ...connection, status } : connection,
		);
	}

	function applyToolsResult(result: InstanceAiMcpConnectionToolsResponse): void {
		setConnectionStatus(result.id, result.status);
		if (result.status === 'connected') {
			connectionToolsById.set(result.id, result.tools);
		} else {
			connectionToolsById.delete(result.id);
		}
	}

	function connectionErrorMessage(reason?: InstanceAiMcpConnectionFailureReason): string {
		switch (reason) {
			case 'server_unavailable':
				return i18n.baseText('instanceAi.mcp.error.connection.serverUnavailable');
			case 'authentication':
				return i18n.baseText('instanceAi.mcp.error.connection.authentication');
			default:
				return i18n.baseText('instanceAi.mcp.error.connection.unknown');
		}
	}

	function showConnectionError(reason?: InstanceAiMcpConnectionFailureReason): void {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('instanceAi.mcp.error.connection.title'),
			message: connectionErrorMessage(reason),
		});
	}

	async function fetchAllConnectionTools(): Promise<void> {
		const requestVersion = ++bulkToolsRequestVersion;
		if (connections.value.length === 0) return;
		try {
			const results = await fetchAllMcpConnectionTools(rootStore.restApiContext);
			if (requestVersion !== bulkToolsRequestVersion) return;
			results.forEach((result) => {
				const connection = connections.value.find((item) => item.id === result.id);
				if (connection?.status === 'connecting' && !inFlightConnectionToolsById.has(result.id)) {
					applyToolsResult(result);
				}
			});
		} catch (error) {
			if (requestVersion !== bulkToolsRequestVersion) return;
			connections.value = connections.value.map((connection) => ({
				...connection,
				status: connection.status === 'connecting' ? 'disconnected' : connection.status,
			}));
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.checkConnections'));
		}
	}

	async function fetchConnectionTools(id: string): Promise<void> {
		const inFlight = inFlightConnectionToolsById.get(id);
		if (inFlight) {
			await inFlight.catch(() => undefined);
			return;
		}

		setConnectionStatus(id, 'connecting');
		const promise = fetchMcpConnectionTools(rootStore.restApiContext, id);
		const isCurrent = () => inFlightConnectionToolsById.get(id) === promise;
		inFlightConnectionToolsById.set(id, promise);
		try {
			const result = await promise;
			if (isCurrent()) {
				applyToolsResult(result);
				if (result.status === 'disconnected') {
					showConnectionError(result.failureReason);
				}
			}
		} catch {
			if (isCurrent()) {
				setConnectionStatus(id, 'disconnected');
				connectionToolsById.delete(id);
				showConnectionError('unknown');
			}
		} finally {
			if (isCurrent()) {
				inFlightConnectionToolsById.delete(id);
			}
		}
	}

	async function fetchConnectionToolsLazy(id: string): Promise<void> {
		const connection = connections.value.find((item) => item.id === id);
		if (!connection || connection.status === 'connecting') return;
		if (connection.status === 'connected' && connectionToolsById.has(id)) return;
		await fetchConnectionTools(id);
	}

	async function connect(body: CreateMcpConnectionBody): Promise<InstanceAiMcpConnection | null> {
		try {
			const created = await createMcpConnection(rootStore.restApiContext, body);
			const connection: InstanceAiMcpConnection = { ...created, status: 'connecting' };
			connections.value = [...connections.value, connection];
			void fetchConnectionTools(connection.id);
			return connection;
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.connect'));
			return null;
		}
	}

	async function updateConnection(
		id: string,
		body: UpdateMcpConnectionBody,
	): Promise<InstanceAiMcpConnection | null> {
		try {
			const updated = await updateMcpConnection(rootStore.restApiContext, id, body);
			const current = connections.value.find((connection) => connection.id === id);
			const connection: InstanceAiMcpConnection = {
				...updated,
				status: body.credentialId ? 'connecting' : (current?.status ?? 'connecting'),
			};
			connections.value = connections.value.map((item) => (item.id === id ? connection : item));
			if (body.credentialId) {
				clearConnectionTools(id);
				void fetchConnectionTools(id);
			}
			return connection;
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.updateSettings'));
			return null;
		}
	}

	async function disconnect(id: string): Promise<boolean> {
		try {
			await deleteMcpConnection(rootStore.restApiContext, id);
			connections.value = connections.value.filter((c) => c.id !== id);
			clearConnectionTools(id);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.disconnect'));
			return false;
		}
	}

	// When a credential is deleted, drop its connections and tools, backend does the same.
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialDeleted: (deletedCredentialId) => {
			const orphaned = connections.value.filter((c) => c.credentialId === deletedCredentialId);
			if (orphaned.length === 0) return;
			connections.value = connections.value.filter((c) => c.credentialId !== deletedCredentialId);
			for (const connection of orphaned) {
				clearConnectionTools(connection.id);
			}
		},
	});

	function reset(): void {
		connections.value = [];
		connectionsLoad = null;
		catalog.value = null;
		catalogLoad = null;
		connectionToolsById.clear();
		inFlightConnectionToolsById.clear();
		hasLoadedConnections = false;
		bulkToolsRequestVersion++;
	}

	return {
		connections,
		catalog,
		connectionToolsById,
		isLoadingConnections,
		isLoadingCatalog,
		connectionsByServerSlug,
		fetchConnections,
		fetchConnectionsLazy,
		fetchCatalogLazy,
		fetchConnectionToolsLazy,
		connect,
		updateConnection,
		disconnect,
		reset,
	};
});
