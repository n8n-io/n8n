import { defineStore } from 'pinia';
import { MCP_STORE } from './mcp.constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { IWorkflowSettings, WorkflowListItem } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	updateMcpSettings,
	toggleWorkflowsMcpAccessApi,
	fetchApiKey,
	rotateApiKey,
	fetchOAuthClients,
	deleteOAuthClient,
	fetchMcpEligibleWorkflows,
	type ToggleWorkflowsMcpAccessResponse,
	type ToggleWorkflowsMcpAccessTarget,
} from '@/features/ai/mcpAccess/mcp.api';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { isWorkflowListItem } from '@/app/utils/typeGuards';
import type { ApiKey, OAuthClientResponseDto, DeleteOAuthClientResponseDto } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const currentUserMCPKey = ref<ApiKey | null>(null);
	const oauthClients = ref<OAuthClientResponseDto[]>([]);
	const connectPopoverOpen = ref(false);

	const mcpAccessEnabled = computed(() => !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
	const mcpManagedByEnv = computed(() => !!settingsStore.moduleSettings.mcp?.mcpManagedByEnv);

	async function fetchWorkflowsAvailableForMCP(
		page = 1,
		pageSize = 50,
	): Promise<WorkflowListItem[]> {
		const workflows = await workflowsListStore.fetchWorkflowsPage(
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
			mcpManagedByEnv: false,
			...(settingsStore.moduleSettings.mcp ?? {}),
			mcpAccessEnabled: updated,
		};
		return updated;
	}

	function applyAvailableInMCPToLocalStores(workflowId: string, availableInMCP: boolean) {
		const existing = workflowsListStore.workflowsById[workflowId];
		if (existing) {
			if (existing.settings) {
				existing.settings.availableInMCP = availableInMCP;
			} else {
				existing.settings = { availableInMCP } as IWorkflowSettings;
			}
		}

		if (workflowId === workflowsStore.workflowId) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.mergeSettings({ availableInMCP });
		}
	}

	// Toggle MCP access for a single workflow
	async function toggleWorkflowMcpAccess(
		workflowId: string,
		availableInMCP: boolean,
	): Promise<ToggleWorkflowsMcpAccessResponse> {
		const response = await toggleWorkflowsMcpAccessApi(
			rootStore.restApiContext,
			{ workflowIds: [workflowId] },
			availableInMCP,
		);

		if (!(response.updatedIds ?? []).includes(workflowId)) {
			throw new Error(
				i18n.baseText('workflowSettings.toggleMCP.updateSkippedError', {
					interpolate: { workflowId },
				}),
			);
		}

		applyAvailableInMCPToLocalStores(workflowId, availableInMCP);

		return response;
	}

	/**
	 * Bulk-toggle MCP availability, scoped by an id list, a project,
	 * or a folder (+ descendants)
	 */
	async function toggleWorkflowsMcpAccess(
		target: ToggleWorkflowsMcpAccessTarget,
		availableInMCP: boolean,
	): Promise<ToggleWorkflowsMcpAccessResponse> {
		const response = await toggleWorkflowsMcpAccessApi(
			rootStore.restApiContext,
			target,
			availableInMCP,
		);

		for (const id of response.updatedIds ?? []) {
			applyAvailableInMCPToLocalStores(id, availableInMCP);
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

	async function getMcpEligibleWorkflows(options?: {
		take?: number;
		skip?: number;
		query?: string;
	}): Promise<{ count: number; data: WorkflowListItem[] }> {
		return await fetchMcpEligibleWorkflows(rootStore.restApiContext, options);
	}

	function openConnectPopover(): void {
		connectPopoverOpen.value = true;
	}

	function closeConnectPopover(): void {
		connectPopoverOpen.value = false;
	}

	return {
		mcpAccessEnabled,
		mcpManagedByEnv,
		fetchWorkflowsAvailableForMCP,
		setMcpAccessEnabled,
		toggleWorkflowMcpAccess,
		toggleWorkflowsMcpAccess,
		currentUserMCPKey,
		getOrCreateApiKey,
		generateNewApiKey,
		resetCurrentUserMCPKey,
		oauthClients,
		getAllOAuthClients,
		removeOAuthClient,
		getMcpEligibleWorkflows,
		connectPopoverOpen,
		openConnectPopover,
		closeConnectPopover,
	};
});
