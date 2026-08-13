import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionToolResponse,
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
	fetchMcpConnectionTools,
	fetchMcpConnections,
	fetchMcpRegistryServers,
	updateMcpConnection,
	type CreateMcpConnectionBody,
	type UpdateMcpConnectionBody,
} from './instanceAi.mcp.api';

export const useInstanceAiMcpStore = defineStore('instanceAiMcp', () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const credentialsStore = useCredentialsStore();

	const connections = ref<InstanceAiMcpConnectionResponse[]>([]);
	let connectionsLoad: Promise<void> | null = null;
	const catalog = ref<McpRegistryServerResponse[] | null>(null);
	let catalogLoad: Promise<void> | null = null;
	const connectionToolsById = reactive(new Map<string, InstanceAiMcpConnectionToolResponse[]>());
	const isLoadingConnections = ref(false);
	const isLoadingCatalog = ref(false);
	const inFlightConnectionToolsById = new Map<
		string,
		Promise<InstanceAiMcpConnectionToolResponse[]>
	>();

	const connectionsByServerSlug = computed(() => {
		const map = new Map<string, InstanceAiMcpConnectionResponse[]>();
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

	async function loadConnections(): Promise<void> {
		isLoadingConnections.value = true;
		try {
			connections.value = await fetchMcpConnections(rootStore.restApiContext);
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

	async function fetchConnectionToolsLazy(id: string): Promise<void> {
		if (connectionToolsById.has(id)) return;

		const inFlight = inFlightConnectionToolsById.get(id);
		if (inFlight) {
			await inFlight.catch(() => undefined);
			return;
		}

		const promise = fetchMcpConnectionTools(rootStore.restApiContext, id);
		const isCurrent = () => inFlightConnectionToolsById.get(id) === promise;
		inFlightConnectionToolsById.set(id, promise);
		try {
			const tools = await promise;
			if (isCurrent()) {
				connectionToolsById.set(id, tools);
			}
		} catch (error) {
			if (isCurrent()) {
				toast.showError(error, i18n.baseText('instanceAi.mcp.error.fetchTools'));
			}
		} finally {
			if (isCurrent()) {
				inFlightConnectionToolsById.delete(id);
			}
		}
	}

	async function connect(
		body: CreateMcpConnectionBody,
	): Promise<InstanceAiMcpConnectionResponse | null> {
		try {
			const created = await createMcpConnection(rootStore.restApiContext, body);
			connections.value = [...connections.value, created];
			return created;
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.connect'));
			return null;
		}
	}

	async function updateConnection(
		id: string,
		body: UpdateMcpConnectionBody,
	): Promise<InstanceAiMcpConnectionResponse | null> {
		try {
			const updated = await updateMcpConnection(rootStore.restApiContext, id, body);
			connections.value = connections.value.map((c) => (c.id === id ? updated : c));
			if (body.credentialId) {
				clearConnectionTools(id);
				void fetchConnectionToolsLazy(id);
			}
			return updated;
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
	}

	return {
		connections,
		catalog,
		connectionToolsById,
		isLoadingConnections,
		isLoadingCatalog,
		connectionsByServerSlug,
		fetchConnections,
		fetchCatalogLazy,
		fetchConnectionToolsLazy,
		connect,
		updateConnection,
		disconnect,
		reset,
	};
});
