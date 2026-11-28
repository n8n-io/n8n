import type { McpServerBlockResponse, McpServerConnectionsResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

import { listMcpServerConnections } from '../mcp-servers.api';

/**
 * The blocked people who have no client on the server, for example after a block through the
 * Assistant. The tab shows each of them as one row.
 */
export function blocksWithoutClient(data: McpServerConnectionsResponse): McpServerBlockResponse[] {
	const connected = new Set(data.connections.map((connection) => connection.userId));
	return data.blocks.filter((block) => !connected.has(block.userId));
}

/**
 * The connections of a server. The server page loads them for the count in the tab label, and
 * the Connections tab shows them.
 */
export function useMcpServerConnections(
	projectId: MaybeRefOrGetter<string>,
	serverId: MaybeRefOrGetter<string>,
) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const latestFetch = useLatestFetch();

	const data = ref<McpServerConnectionsResponse | null>(null);
	const loading = ref(false);
	/** The last load failed and no data is there to show. */
	const loadFailed = ref(false);

	/** One row for each person and client, and one for a blocked person with no client. */
	const rowCount = computed(() => {
		if (!data.value) return null;
		return data.value.connections.length + blocksWithoutClient(data.value).length;
	});

	async function load() {
		const isLatest = latestFetch.next();
		loading.value = true;
		loadFailed.value = false;
		try {
			const response = await listMcpServerConnections(
				rootStore.restApiContext,
				toValue(projectId),
				toValue(serverId),
			);
			if (isLatest()) data.value = response;
		} catch (error) {
			if (isLatest()) {
				loadFailed.value = true;
				toast.showError(error, i18n.baseText('mcpServers.connections.load.error'));
			}
		} finally {
			if (isLatest()) loading.value = false;
		}
	}

	return { data, loading, loadFailed, rowCount, load };
}
