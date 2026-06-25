import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiMcpConnectionResponse, McpRegistryServerResponse } from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';
import {
	createMcpConnection,
	deleteMcpConnection,
	fetchMcpConnections,
	fetchMcpRegistryServers,
	updateMcpConnection,
	type CreateMcpConnectionBody,
	type UpdateMcpConnectionBody,
} from './instanceAi.mcp.api';

export const useInstanceAiMcpStore = defineStore('instanceAiMcp', () => {
	const rootStore = useRootStore();
	const toast = useToast();

	const connections = ref<InstanceAiMcpConnectionResponse[]>([]);
	const catalog = ref<McpRegistryServerResponse[] | null>(null);
	const isLoadingConnections = ref(false);
	const isLoadingCatalog = ref(false);

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
		isLoadingConnections.value = true;
		try {
			connections.value = await fetchMcpConnections(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.fetchConnections'));
		} finally {
			isLoadingConnections.value = false;
		}
	}

	async function fetchCatalogLazy(): Promise<void> {
		if (catalog.value !== null) return;
		isLoadingCatalog.value = true;
		try {
			catalog.value = await fetchMcpRegistryServers(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.fetchCatalog'));
		} finally {
			isLoadingCatalog.value = false;
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
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('instanceAi.mcp.error.disconnect'));
			return false;
		}
	}

	function reset(): void {
		connections.value = [];
		catalog.value = null;
	}

	return {
		connections,
		catalog,
		isLoadingConnections,
		isLoadingCatalog,
		connectionsByServerSlug,
		fetchConnections,
		fetchCatalogLazy,
		connect,
		updateConnection,
		disconnect,
		reset,
	};
});
