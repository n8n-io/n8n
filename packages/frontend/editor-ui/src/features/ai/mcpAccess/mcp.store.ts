import { defineStore } from 'pinia';
import { MCP_STORE } from './mcp.constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { WorkflowListItem } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	updateMcpSettings,
	toggleWorkflowMcpAccessApi,
	fetchApiKey,
	rotateApiKey,
	fetchOAuthClients,
	deleteOAuthClient,
} from '@/features/ai/mcpAccess/mcp.api';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { isWorkflowListItem } from '@/app/utils/typeGuards';
import type { ApiKey, OAuthClientResponseDto, DeleteOAuthClientResponseDto } from '@n8n/api-types';

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const currentUserMCPKey = ref<ApiKey | null>(null);
	const oauthClients = ref<OAuthClientResponseDto[]>([]);
	const connectPopoverOpen = ref(false);

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

		const { id, settings, versionId } = response;

		// Update local  version of the workflow
		if (id === workflowsStore.workflowId) {
			workflowsStore.setWorkflowVersionId(versionId);
			if (settings) {
				workflowsStore.private.setWorkflowSettings(settings);
			}
		}
		if (workflowsStore.workflowsById[id]) {
			workflowsStore.workflowsById[id] = {
				...workflowsStore.workflowsById[id],
				settings,
				versionId,
			};
		}

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

	function resetCurrentUserMCPKey(): void {
		currentUserMCPKey.value = null;
	}

	async function getAllOAuthClients(): Promise<OAuthClientResponseDto[]> {
		const response = await fetchOAuthClients(rootStore.restApiContext);
		oauthClients.value = response.data;
		return response.data;
	}

	async function removeOAuthClient(clientId: string): Promise<DeleteOAuthClientResponseDto> {
		const response = await deleteOAuthClient(rootStore.restApiContext, clientId);
		// Remove the client from the local store
		oauthClients.value = oauthClients.value.filter((client) => client.id !== clientId);
		return response;
	}

	function openConnectPopover(): void {
		connectPopoverOpen.value = true;
	}

	function closeConnectPopover(): void {
		connectPopoverOpen.value = false;
	}

	return {
		mcpAccessEnabled,
		fetchWorkflowsAvailableForMCP,
		setMcpAccessEnabled,
		toggleWorkflowMcpAccess,
		currentUserMCPKey,
		getOrCreateApiKey,
		generateNewApiKey,
		resetCurrentUserMCPKey,
		oauthClients,
		getAllOAuthClients,
		removeOAuthClient,
		connectPopoverOpen,
		openConnectPopover,
		closeConnectPopover,
	};
});
