import { defineStore } from 'pinia';
import { MCP_ENDPOINT, MCP_STORE } from './mcp.constants';
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
	fetchInstanceMcpClientStats,
	deleteOAuthClient,
	fetchMcpEligibleWorkflows,
	getAllowedRedirectUris,
	updateAllowedRedirectUris,
	type ToggleWorkflowsMcpAccessResponse,
	type ToggleWorkflowsMcpAccessTarget,
} from '@/features/ai/mcpAccess/mcp.api';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import {
	EMPTY_OAUTH_CLIENT_FILTERS,
	type OAuthClientFilters,
} from '@/features/ai/mcpAccess/clients.utils';
import { isWorkflowListItem } from '@/app/utils/typeGuards';
import type {
	ApiKey,
	InstanceMcpClientStatsResponseDto,
	OAuthClientResponseDto,
	DeleteOAuthClientResponseDto,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const currentUserMCPKey = ref<ApiKey | null>(null);
	const oauthClients = ref<OAuthClientResponseDto[]>([]);
	const oauthClientScopeTools = ref<Record<string, string[]> | undefined>(undefined);
	const oauthClientsOwnership = ref<'mine' | 'all'>('mine');
	const oauthClientTotals = ref<{ mine: number; all?: number }>({ mine: 0 });
	const oauthClientsPage = ref(0);
	const oauthClientsPageSize = ref(10);
	const oauthClientsFilters = ref<OAuthClientFilters>({ ...EMPTY_OAUTH_CLIENT_FILTERS });
	/** Total rows matching the filters (across all pages) for the current ownership. */
	const oauthClientsCount = ref(0);
	/** Distinct consent owners for the "Connected by" filter (managers only). */
	const oauthClientOwners = ref<Array<NonNullable<OAuthClientResponseDto['owner']>>>([]);
	const allowedRedirectUris = ref<string[]>([]);
	const instanceClientStats = ref<InstanceMcpClientStatsResponseDto | null>(null);
	const connectPopoverOpen = ref(false);

	const mcpAccessEnabled = computed(() => !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
	const mcpManagedByEnv = computed(() => !!settingsStore.moduleSettings.mcp?.mcpManagedByEnv);

	// Backend-provided canonical URL, so a configured dedicated MCP base URL is
	// reflected; the editor-base fallback covers settings not yet loaded.
	const serverUrl = computed(
		() =>
			settingsStore.moduleSettings.mcp?.serverUrl ?? `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`,
	);

	async function fetchWorkflowsAvailableForMCP(
		page = 1,
		pageSize = 50,
	): Promise<{ data: WorkflowListItem[]; count: number }> {
		const { data, count } = await workflowsListStore.fetchWorkflowsPageWithCount(
			undefined, // projectId
			page,
			pageSize,
			'updatedAt:desc',
			{ isArchived: false, availableInMCP: true },
			false, // includeFolders
			false, // onlySharedWithMe
		);
		return { data: data.filter(isWorkflowListItem), count };
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

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		workflowDocumentStore.mergeSettings({ availableInMCP });
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

		const confirmedIds = new Set([
			...(response.updatedIds ?? []),
			...(response.unchangedIds ?? []),
		]);

		if (!confirmedIds.has(workflowId)) {
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

		const confirmedIds = new Set([
			...(response.updatedIds ?? []),
			...(response.unchangedIds ?? []),
		]);

		for (const id of confirmedIds) {
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
		const filters = oauthClientsFilters.value;
		const response = await fetchOAuthClients(rootStore.restApiContext, {
			ownership: oauthClientsOwnership.value,
			skip: oauthClientsPage.value * oauthClientsPageSize.value,
			take: oauthClientsPageSize.value,
			name: filters.search.trim() || undefined,
			ownerId: filters.ownerId ?? undefined,
			type: filters.type ?? undefined,
			connected: filters.connected ?? undefined,
		});

		// Clamp to the last page when the requested one shrank away (e.g. after a revoke)
		if (response.data.length === 0 && response.count > 0 && oauthClientsPage.value > 0) {
			oauthClientsPage.value = Math.max(
				0,
				Math.ceil(response.count / oauthClientsPageSize.value) - 1,
			);
			return await getAllOAuthClients();
		}

		oauthClients.value = response.data;
		oauthClientScopeTools.value = response.scopeTools;
		oauthClientTotals.value = response.totals;
		oauthClientsCount.value = response.count;
		oauthClientOwners.value = response.owners ?? [];
		return response.data;
	}

	async function setOAuthClientsOwnership(ownership: 'mine' | 'all'): Promise<void> {
		oauthClientsOwnership.value = ownership;
		oauthClientsPage.value = 0;
		oauthClientsFilters.value = { ...EMPTY_OAUTH_CLIENT_FILTERS };
		await getAllOAuthClients();
	}

	async function setOAuthClientsFilters(filters: OAuthClientFilters): Promise<void> {
		oauthClientsFilters.value = filters;
		oauthClientsPage.value = 0;
		await getAllOAuthClients();
	}

	async function setOAuthClientsPagination(page: number, pageSize: number): Promise<void> {
		// A page-size change restarts from the first page
		oauthClientsPage.value = pageSize === oauthClientsPageSize.value ? page : 0;
		oauthClientsPageSize.value = pageSize;
		await getAllOAuthClients();
	}

	async function getInstanceClientStats(): Promise<InstanceMcpClientStatsResponseDto | null> {
		try {
			const stats = await fetchInstanceMcpClientStats(rootStore.restApiContext);
			instanceClientStats.value = stats;
			return stats;
		} catch {
			// Endpoint is admin-only; non-admin members get 403. Swallow silently
			// so the settings page still renders for them.
			instanceClientStats.value = null;
			return null;
		}
	}

	async function removeOAuthClient(
		clientId: string,
		userId?: string,
	): Promise<DeleteOAuthClientResponseDto> {
		const response = await deleteOAuthClient(rootStore.restApiContext, clientId, userId);
		// Refetch instead of splicing locally so the tab totals stay accurate
		await getAllOAuthClients();
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

	async function fetchAllowedRedirectUris(): Promise<string[]> {
		const response = await getAllowedRedirectUris(rootStore.restApiContext);
		allowedRedirectUris.value = response.uris;
		return response.uris;
	}

	async function setAllowedRedirectUris(uris: string[]): Promise<void> {
		await updateAllowedRedirectUris(rootStore.restApiContext, uris);
		allowedRedirectUris.value = uris;
	}

	return {
		mcpAccessEnabled,
		mcpManagedByEnv,
		serverUrl,
		fetchWorkflowsAvailableForMCP,
		setMcpAccessEnabled,
		toggleWorkflowMcpAccess,
		toggleWorkflowsMcpAccess,
		currentUserMCPKey,
		getOrCreateApiKey,
		generateNewApiKey,
		resetCurrentUserMCPKey,
		oauthClients,
		oauthClientsOwnership,
		oauthClientTotals,
		oauthClientOwners,
		oauthClientsPage,
		oauthClientsPageSize,
		oauthClientsFilters,
		oauthClientsCount,
		setOAuthClientsOwnership,
		setOAuthClientsFilters,
		setOAuthClientsPagination,
		instanceClientStats,
		getAllOAuthClients,
		oauthClientScopeTools,
		getInstanceClientStats,
		removeOAuthClient,
		getMcpEligibleWorkflows,
		allowedRedirectUris,
		fetchAllowedRedirectUris,
		setAllowedRedirectUris,
		connectPopoverOpen,
		openConnectPopover,
		closeConnectPopover,
	};
});
