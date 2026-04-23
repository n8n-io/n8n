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

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
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
			...(settingsStore.moduleSettings.mcp ?? {}),
			mcpAccessEnabled: updated,
		};
		return updated;
	}

	/**
	 * Patches the local workflow stores (list + active document) so the UI
	 * reflects the new `availableInMCP` value without waiting for a full list
	 * re-fetch. Called only after the backend confirms the workflow is in the
	 * requested state — the bulk endpoint does not return per-workflow
	 * settings, so the merge happens purely on the client.
	 *
	 * Some list entries arrive with `settings: undefined` (legacy workflows
	 * or sparse API responses). We create a minimal settings object in that
	 * case so the UI flips instead of silently ignoring the change.
	 */
	function applyAvailableInMCPToLocalStores(workflowId: string, availableInMCP: boolean) {
		const existing = workflowsListStore.workflowsById[workflowId];
		if (existing) {
			if (existing.settings) {
				existing.settings.availableInMCP = availableInMCP;
			} else {
				// The DB may store workflows without a full `IWorkflowSettings`
				// object. `availableInMCP` is the only field we control here, so
				// we cast — any missing required fields will be filled in on
				// the next list fetch.
				existing.settings = { availableInMCP } as IWorkflowSettings;
			}
		}

		if (workflowId === workflowsStore.workflowId) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.mergeSettings({ availableInMCP });
		}
	}

	/**
	 * Backwards-compatible single-workflow toggle. Internally hits the bulk
	 * endpoint with a one-element id list.
	 *
	 * The bulk backend may skip workflows (unauthorized, archived, not found)
	 * — those are legitimate failures. No-op toggles (already in the
	 * requested state) are reported as updated for idempotency, so we throw
	 * only when the target id isn't in `updatedIds`. Existing `try/catch`
	 * blocks in callers then surface a toast.
	 */
	async function toggleWorkflowMcpAccess(
		workflowId: string,
		availableInMCP: boolean,
	): Promise<ToggleWorkflowsMcpAccessResponse> {
		const response = await toggleWorkflowsMcpAccessApi(
			rootStore.restApiContext,
			{ workflowIds: [workflowId] },
			availableInMCP,
		);

		if (!response.updatedIds.includes(workflowId)) {
			throw new Error(
				`Workflow ${workflowId} could not be updated. It may be archived or you may no longer have permission to edit it.`,
			);
		}

		applyAvailableInMCPToLocalStores(workflowId, availableInMCP);

		return response;
	}

	/**
	 * Bulk-toggle MCP availability, scoped by an id list, a project, or a
	 * folder (+ descendants). Local stores are patched only for workflows that
	 * the backend confirmed were updated. Unlike the single-workflow variant,
	 * this does not throw on partial skips — callers need the full
	 * `{ updatedIds, skippedCount }` response to drive bulk UX.
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

		for (const id of response.updatedIds) {
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
