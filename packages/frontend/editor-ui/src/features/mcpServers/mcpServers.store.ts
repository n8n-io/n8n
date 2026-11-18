import type {
	AddMcpServerResourceDto,
	AddMcpServerToolDto,
	McpServerDetailDto,
	McpServerSkillTargetDto,
	McpServerSummaryDto,
	McpServerToolTargetDto,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as api from './mcpServers.api';

export const useMcpServersStore = defineStore('mcpServers', () => {
	const rootStore = useRootStore();
	const context = () => rootStore.restApiContext;

	const servers = ref<McpServerSummaryDto[]>([]);
	const serversLoaded = ref(false);
	const detail = ref<McpServerDetailDto | null>(null);
	/** Count of PATCH requests in flight, for the "Saving…" state. */
	const pendingSaves = ref(0);
	const saving = computed(() => pendingSaves.value > 0);

	async function fetchServers() {
		servers.value = await api.listMcpServers(context());
		serversLoaded.value = true;
		return servers.value;
	}

	function upsertSummary(server: McpServerDetailDto) {
		const index = servers.value.findIndex((item) => item.id === server.id);
		const summary: McpServerSummaryDto = { ...server };
		if (index === -1) servers.value = [summary, ...servers.value];
		else servers.value.splice(index, 1, summary);
	}

	function setDetail(server: McpServerDetailDto) {
		if (!detail.value || detail.value.id === server.id) detail.value = server;
		upsertSummary(server);
		return server;
	}

	async function track<T>(work: Promise<T>): Promise<T> {
		pendingSaves.value++;
		try {
			return await work;
		} finally {
			pendingSaves.value--;
		}
	}

	async function fetchServer(serverId: string) {
		const server = await api.getMcpServer(context(), serverId);
		detail.value = server;
		upsertSummary(server);
		return server;
	}

	function clearDetail() {
		detail.value = null;
	}

	async function createServer(name: string) {
		const server = await api.createMcpServer(context(), { name });
		upsertSummary(server);
		return server;
	}

	async function updateServer(serverId: string, body: UpdateMcpServerDto) {
		return setDetail(await track(api.updateMcpServer(context(), serverId, body)));
	}

	async function deleteServer(serverId: string) {
		await api.deleteMcpServer(context(), serverId);
		servers.value = servers.value.filter((item) => item.id !== serverId);
		if (detail.value?.id === serverId) detail.value = null;
	}

	async function addTool(serverId: string, body: AddMcpServerToolDto) {
		return setDetail(await track(api.addMcpServerTool(context(), serverId, body)));
	}

	async function updateTool(serverId: string, toolId: string, body: UpdateMcpServerToolDto) {
		return setDetail(await track(api.updateMcpServerTool(context(), serverId, toolId, body)));
	}

	async function removeTool(serverId: string, toolId: string) {
		return setDetail(await track(api.removeMcpServerTool(context(), serverId, toolId)));
	}

	async function addResource(serverId: string, body: AddMcpServerResourceDto) {
		return setDetail(await track(api.addMcpServerResource(context(), serverId, body)));
	}

	async function removeResource(serverId: string, resourceId: string) {
		return setDetail(await track(api.removeMcpServerResource(context(), serverId, resourceId)));
	}

	async function createApiKey(serverId: string, label: string) {
		const created = await api.createMcpServerApiKey(context(), serverId, label);
		await fetchServer(serverId);
		return created;
	}

	async function revokeApiKey(serverId: string, keyId: string) {
		return setDetail(await track(api.revokeMcpServerApiKey(context(), serverId, keyId)));
	}

	async function setOAuthUserRevoked(serverId: string, userId: string, revoked: boolean) {
		return setDetail(
			await track(api.setMcpServerOAuthUserRevoked(context(), serverId, userId, revoked)),
		);
	}

	async function searchTargets(search = ''): Promise<McpServerToolTargetDto[]> {
		return await api.listMcpServerTargets(context(), search);
	}

	async function searchSkills(search = ''): Promise<McpServerSkillTargetDto[]> {
		return await api.listMcpServerSkills(context(), search);
	}

	return {
		servers,
		serversLoaded,
		detail,
		saving,
		fetchServers,
		fetchServer,
		clearDetail,
		createServer,
		updateServer,
		deleteServer,
		addTool,
		updateTool,
		removeTool,
		addResource,
		removeResource,
		createApiKey,
		revokeApiKey,
		setOAuthUserRevoked,
		searchTargets,
		searchSkills,
	};
});
