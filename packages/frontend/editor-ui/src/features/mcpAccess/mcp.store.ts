import { defineStore } from 'pinia';
import { MCP_STORE } from './mcp.constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowListItem } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	updateMcpSettings,
	toggleWorkflowMcpAccessApi,
	fetchApiKey,
	rotateApiKey,
} from '@/features/mcpAccess/mcp.api';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import { isWorkflowListItem } from '@/utils/typeGuards';
import type { ApiKey } from '@n8n/api-types';

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const currentUserMCPKey = ref<ApiKey | null>(null);

	const mcpAccessEnabled = computed(() => !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);

	async function fetchWorkflowsAvailableForMCP(
		page = 1,
		pageSize = 50,
	): Promise<WorkflowListItem[]> {
		const workflows = await workflowsStore.fetchWorkflowsPage(
			undefined, // projectId
			page,
			pageSize,
			'updatedAt:desc',
			{ isArchived: false, availableInMCP: true },
			false, // includeFolders
			false, // includeAllVersions
		);
		return workflows.filter(isWorkflowListItem);
	}

	async function setMcpAccessEnabled(enabled: boolean): Promise<boolean> {
		const { mcpAccessEnabled: updated } = await updateMcpSettings(
			rootStore.restApiContext,
			enabled,
		);
		settingsStore.moduleSettings.mcp = {
			...(settingsStore.moduleSettings.mcp ?? {}),
			mcpAccessEnabled: updated,
		};
		return updated;
	}

	async function toggleWorkflowMcpAccess(
		workflowId: string,
		availableInMCP: boolean,
	): Promise<{
		id: string;
		settings: { availableInMCP?: boolean } | undefined;
		versionId: string;
	}> {
		const response = await toggleWorkflowMcpAccessApi(
			rootStore.restApiContext,
			workflowId,
			availableInMCP,
		);
		return response;
	}

	async function getOrCreateApiKey(): Promise<ApiKey> {
		const apiKey = await fetchApiKey(rootStore.restApiContext);
		currentUserMCPKey.value = apiKey;
		return apiKey;
	}

	async function generateNewApiKey(): Promise<ApiKey> {
		const apiKey = await rotateApiKey(rootStore.restApiContext);
		currentUserMCPKey.value = apiKey;
		return apiKey;
	}

	return {
		mcpAccessEnabled,
		fetchWorkflowsAvailableForMCP,
		setMcpAccessEnabled,
		toggleWorkflowMcpAccess,
		currentUserMCPKey,
		getOrCreateApiKey,
		generateNewApiKey,
	};
});
