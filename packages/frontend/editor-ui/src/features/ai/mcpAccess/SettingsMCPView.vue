<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import type { WorkflowListItem } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_DOCS_PAGE_URL,
} from '@/features/ai/mcpAccess/mcp.constants';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';
import MCpHeaderActions from '@/features/ai/mcpAccess/components/header/MCPHeaderActions.vue';
import WorkflowsTable from '@/features/ai/mcpAccess/components/tabs/WorkflowsTable.vue';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import {
	N8nHeading,
	N8nNotice,
	N8nTabs,
	N8nTooltip,
	N8nButton,
	N8nText,
	N8nLink,
	N8nInputLabel,
	N8nInput,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '@/app/constants';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { useExposeAllWorkflowsToMcpOffer } from '@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer';

type MCPTabs = 'workflows' | 'oauth' | 'settings';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();
const telemetry = useTelemetry();

const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const { offerToExposeAllWorkflows } = useExposeAllWorkflowsToMcpOffer();

const mcpStatusLoading = ref(false);
const selectedTab = ref<MCPTabs>('workflows');

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);
const canManageMcpInstance = computed(() => isOwner.value || isAdmin.value);

const tabs = computed<Array<TabOptions<MCPTabs>>>(() => {
	const base: Array<TabOptions<MCPTabs>> = [
		{
			label: i18n.baseText('settings.mcp.tabs.workflows'),
			value: 'workflows',
		},
		{
			label: i18n.baseText('settings.mcp.tabs.oauth'),
			value: 'oauth',
		},
	];
	if (canManageMcpInstance.value) {
		base.push({
			label: i18n.baseText('settings.mcp.tabs.oauthSettings'),
			value: 'settings',
		});
	}
	return base;
});

const workflowsLoading = ref(false);
const availableWorkflows = ref<WorkflowListItem[]>([]);
const availableWorkflowsTotal = ref(0);
const workflowsTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [],
});
const workflowsTableItemsPerPage = ref(workflowsTableState.value.itemsPerPage);

const oAuthClientsLoading = ref(false);
const connectedOAuthClients = ref<OAuthClientResponseDto[]>([]);

const redirectUrisInput = ref('');
const redirectUrisError = ref('');
const redirectUrisLoading = ref(false);

const canToggleMCP = computed(() => canManageMcpInstance.value && !mcpStore.mcpManagedByEnv);

const canSeeInstanceStats = canManageMcpInstance;

const showInstanceCapacityNotice = computed(
	() => canSeeInstanceStats.value && mcpStore.instanceClientStats?.atCapacity === true,
);

const instanceCapacityNoticeContent = computed(() => {
	const stats = mcpStore.instanceClientStats;
	if (!stats) return '';
	return i18n.baseText('settings.mcp.instanceCapacity.warning', {
		interpolate: { count: String(stats.count), limit: String(stats.limit) },
	});
});

const showConnectWorkflowsButton = computed(() => {
	return selectedTab.value === 'workflows' && availableWorkflowsTotal.value > 0;
});

const onTabSelected = async (tab: MCPTabs) => {
	selectedTab.value = tab;
	if (tab === 'workflows' && availableWorkflows.value.length === 0) {
		await fetchAvailableWorkflows();
	} else if (tab === 'oauth' && connectedOAuthClients.value.length === 0) {
		await fetchoAuthCLients();
		telemetry.track('User clicked connected clients tab');
	} else if (tab === 'settings' && mcpStore.allowedRedirectUris.length === 0) {
		await loadRedirectUris();
	}
};

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await fetchAvailableWorkflows();
			await fetchoAuthCLients();
		} else {
			workflowsLoading.value = false;
		}
		mcp.trackUserToggledMcpAccess(enabled);
		if (enabled && updated) {
			// Best-effort offer; must not keep the toggle in its loading state.
			// The popover only opens when the offer modal doesn't, so they never stack.
			void offerToExposeAllWorkflows(refreshWorkflowsFromFirstPage).then((offered) => {
				if (!offered) {
					mcpStore.openConnectPopover();
				}
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		mcpStatusLoading.value = false;
		workflowsLoading.value = false;
	}
};

const showMcpAccessUpdatedToast = (count: number, enabled: boolean) => {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText(
			enabled
				? 'settings.mcp.workflows.enableAccess.success.title'
				: 'settings.mcp.workflows.removeAccess.success.title',
			{
				adjustToNumber: count,
				interpolate: { count: String(count) },
			},
		),
	});
};

const onToggleWorkflowMCPAccess = async (workflowId: string, isEnabled: boolean) => {
	try {
		await mcpStore.toggleWorkflowMcpAccess(workflowId, isEnabled);
		if (isEnabled) {
			await refreshWorkflowsFromFirstPage();
		} else {
			showMcpAccessUpdatedToast(1, false);
			await fetchAvailableWorkflows();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkEnableWorkflowsMCPAccess = async (workflowIds: string[]) => {
	try {
		const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, true);
		showMcpAccessUpdatedToast(response.updatedCount, true);
		await refreshWorkflowsFromFirstPage();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkRemoveWorkflowsMCPAccess = async (workflowIds: string[]) => {
	try {
		const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, false);
		showMcpAccessUpdatedToast(response.updatedCount, false);
		await fetchAvailableWorkflows();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
	}
};

const onUpdateDescription = (workflow: WorkflowListItem) => {
	uiStore.openModalWithData({
		name: WORKFLOW_DESCRIPTION_MODAL_KEY,
		data: {
			workflowId: workflow.id,
			workflowDescription: workflow.description ?? '',
			onSave: (updatedDescription: string | null) => {
				const index = availableWorkflows.value.findIndex((w) => w.id === workflow.id);
				if (index !== -1) {
					availableWorkflows.value[index] = {
						...availableWorkflows.value[index],
						description: updatedDescription ?? undefined,
					};
				}
			},
		},
	});
};

const onTableRefresh = async () => {
	if (selectedTab.value === 'workflows') {
		await fetchAvailableWorkflows();
	} else if (selectedTab.value === 'oauth') {
		await fetchoAuthCLients();
	}
};

const fetchAvailableWorkflows = async () => {
	workflowsLoading.value = true;
	try {
		const response = await mcpStore.fetchWorkflowsAvailableForMCP(
			workflowsTableState.value.page + 1,
			workflowsTableState.value.itemsPerPage,
		);
		if (response.data.length === 0 && response.count > 0 && workflowsTableState.value.page > 0) {
			const maxPage = Math.max(
				0,
				Math.ceil(response.count / workflowsTableState.value.itemsPerPage) - 1,
			);
			workflowsTableState.value = { ...workflowsTableState.value, page: maxPage };
			const clampedResponse = await mcpStore.fetchWorkflowsAvailableForMCP(
				workflowsTableState.value.page + 1,
				workflowsTableState.value.itemsPerPage,
			);
			availableWorkflows.value = clampedResponse.data;
			availableWorkflowsTotal.value = clampedResponse.count;
			return;
		}
		availableWorkflows.value = response.data;
		availableWorkflowsTotal.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	} finally {
		setTimeout(() => {
			workflowsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const refreshWorkflowsFromFirstPage = async () => {
	workflowsTableState.value = { ...workflowsTableState.value, page: 0 };
	await fetchAvailableWorkflows();
};

const onRefreshWorkflows = async () => {
	await fetchAvailableWorkflows();
};

const onWorkflowsTableUpdate = async (options: TableOptions) => {
	const pageSizeChanged = options.itemsPerPage !== workflowsTableItemsPerPage.value;
	workflowsTableState.value = { ...options, page: pageSizeChanged ? 0 : options.page };
	workflowsTableItemsPerPage.value = options.itemsPerPage;
	await fetchAvailableWorkflows();
};

const fetchoAuthCLients = async () => {
	try {
		oAuthClientsLoading.value = true;
		const clients = await mcpStore.getAllOAuthClients();
		connectedOAuthClients.value = clients ?? [];
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	} finally {
		setTimeout(() => {
			oAuthClientsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const revokeClientAccess = async (client: OAuthClientResponseDto) => {
	try {
		await mcpStore.removeOAuthClient(client.id);
		connectedOAuthClients.value = connectedOAuthClients.value.filter((c) => c.id !== client.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.oAuthClients.revoke.success.title'),
			message: i18n.baseText('settings.mcp.oAuthClients.revoke.success.message', {
				interpolate: { name: client.name },
			}),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.revoke.error'));
	}
};

const openConnectWorkflowsModal = () => {
	uiStore.openModalWithData({
		name: MCP_CONNECT_WORKFLOWS_MODAL_KEY,
		data: {
			onEnableMcpAccess: onBulkEnableWorkflowsMCPAccess,
		},
	});
	telemetry.track('User clicked connect workflows from mcp settings');
};

const loadRedirectUris = async () => {
	try {
		const uris = await mcpStore.fetchAllowedRedirectUris();
		redirectUrisInput.value = uris.join(', ');
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.loading'));
	}
};

const validateRedirectUris = (urisString: string): { valid: boolean; error?: string } => {
	const uris = urisString
		.split(',')
		.map((uri) => uri.trim())
		.filter((uri) => uri.length > 0);

	// Empty list is valid (backward compatible - no restrictions)
	if (uris.length === 0) {
		return { valid: true };
	}

	for (const uri of uris) {
		try {
			const url = new URL(uri);

			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				return {
					valid: false,
					error: i18n.baseText('settings.mcp.allowedRedirectUris.validation.invalidProtocol', {
						interpolate: { url: uri },
					}),
				};
			}

			const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
			if (!isLocalhost && url.protocol !== 'https:') {
				return {
					valid: false,
					error: i18n.baseText('settings.mcp.allowedRedirectUris.validation.httpsRequired', {
						interpolate: { url: uri },
					}),
				};
			}
		} catch (error) {
			return {
				valid: false,
				error: i18n.baseText('settings.mcp.allowedRedirectUris.validation.invalidUrl', {
					interpolate: { url: uri },
				}),
			};
		}
	}

	return { valid: true };
};

const saveRedirectUris = async () => {
	redirectUrisError.value = '';

	const validation = validateRedirectUris(redirectUrisInput.value);
	if (!validation.valid) {
		redirectUrisError.value = validation.error ?? '';
		return;
	}

	try {
		redirectUrisLoading.value = true;
		const uris = redirectUrisInput.value
			.split(',')
			.map((uri) => uri.trim())
			.filter((uri) => uri.length > 0);

		await mcpStore.setAllowedRedirectUris(uris);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.allowedRedirectUris.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.saving'));
	} finally {
		redirectUrisLoading.value = false;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (!mcpStore.mcpAccessEnabled) {
		return;
	}
	const fetches: Array<Promise<unknown>> = [fetchAvailableWorkflows(), fetchoAuthCLients()];
	if (canManageMcpInstance.value) {
		fetches.push(loadRedirectUris());
		fetches.push(mcpStore.getInstanceClientStats());
	}
	await Promise.all(fetches);
});
</script>
<template>
	<div :class="$style.container">
		<header :class="$style['main-header']" data-test-id="mcp-settings-header">
			<div :class="$style.headings">
				<N8nHeading size="2xlarge">{{ i18n.baseText('settings.mcp') }}</N8nHeading>
				<div v-show="mcpStore.mcpAccessEnabled" data-test-id="mcp-settings-description">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.description') }}.
					</N8nText>
					<N8nLink
						:href="MCP_DOCS_PAGE_URL"
						target="_blank"
						rel="noopener noreferrer"
						size="small"
						data-test-id="mcp-docs-link"
					>
						{{ i18n.baseText('generic.learnMore') }}
					</N8nLink>
				</div>
			</div>
			<MCpHeaderActions
				:access-enabled="mcpStore.mcpAccessEnabled"
				:toggle-disabled="!canToggleMCP"
				:loading="mcpStatusLoading"
				:managed-by-env="mcpStore.mcpManagedByEnv"
				@disable-mcp-access="onToggleMCPAccess(!mcpStore.mcpAccessEnabled)"
			/>
		</header>
		<MCPEmptyState
			v-if="!mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			:managed-by-env="mcpStore.mcpManagedByEnv"
			@turn-on-mcp="onToggleMCPAccess(true)"
		/>
		<div
			v-if="mcpStore.mcpAccessEnabled"
			:class="$style.container"
			data-test-id="mcp-enabled-section"
		>
			<N8nNotice
				v-if="showInstanceCapacityNotice"
				theme="warning"
				data-test-id="mcp-instance-capacity-notice"
				:content="instanceCapacityNoticeContent"
			/>
			<header :class="$style['tabs-header']">
				<N8nTabs :model-value="selectedTab" :options="tabs" @update:model-value="onTabSelected" />
				<div :class="$style.actions">
					<N8nButton
						variant="solid"
						v-if="showConnectWorkflowsButton"
						:label="i18n.baseText('settings.mcp.connectWorkflows')"
						data-test-id="mcp-connect-workflows-header-button"
						size="small"
						@click="openConnectWorkflowsModal"
					/>
					<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
						<N8nButton
							variant="subtle"
							iconOnly
							data-test-id="mcp-workflows-refresh-button"
							size="small"
							icon="refresh-cw"
							@click="onTableRefresh"
						/>
					</N8nTooltip>
				</div>
			</header>
			<main>
				<WorkflowsTable
					v-if="selectedTab === 'workflows'"
					v-model:table-options="workflowsTableState"
					:data-test-id="'mcp-workflow-table'"
					:workflows="availableWorkflows"
					:total-count="availableWorkflowsTotal"
					:loading="workflowsLoading"
					@remove-mcp-access="(workflow) => onToggleWorkflowMCPAccess(workflow.id, false)"
					@bulk-remove-mcp-access="onBulkRemoveWorkflowsMCPAccess"
					@connect-workflows="openConnectWorkflowsModal"
					@update-description="onUpdateDescription"
					@update:options="onWorkflowsTableUpdate"
					@refresh="onRefreshWorkflows"
				/>
				<OAuthClientsTable
					v-else-if="selectedTab === 'oauth'"
					:data-test-id="'mcp-oauth-clients-table'"
					:clients="connectedOAuthClients"
					:scope-tools="mcpStore.oauthClientScopeTools"
					:loading="oAuthClientsLoading"
					@revoke-client="revokeClientAccess"
					@refresh="onTableRefresh"
				/>
				<section
					v-else-if="selectedTab === 'settings'"
					:class="$style['oauth-settings-content']"
					data-test-id="mcp-oauth-settings-tab"
				>
					<N8nInputLabel
						:label="i18n.baseText('settings.mcp.allowedRedirectUris.label')"
						:tooltip-text="i18n.baseText('settings.mcp.allowedRedirectUris.description')"
						:show-tooltip="true"
					>
						<N8nInput
							v-model="redirectUrisInput"
							type="textarea"
							:rows="6"
							:placeholder="i18n.baseText('settings.mcp.allowedRedirectUris.placeholder')"
							:disabled="!canToggleMCP"
							data-test-id="mcp-redirect-uris-input"
						/>
					</N8nInputLabel>
					<div v-if="redirectUrisError" :class="$style['error-message']">
						<N8nText color="danger" size="small">{{ redirectUrisError }}</N8nText>
					</div>
					<div :class="$style['save-button-container']">
						<N8nButton
							:label="i18n.baseText('settings.mcp.allowedRedirectUris.save')"
							:loading="redirectUrisLoading"
							:disabled="!canToggleMCP"
							size="small"
							data-test-id="mcp-redirect-uris-save-button"
							@click="saveRedirectUris"
						/>
					</div>
				</section>
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.main-header {
	display: flex;
	justify-content: space-between;
	margin-bottom: var(--spacing--xl);

	@media (max-width: 820px) {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--2xs);
	}
}

.headings {
	display: flex;
	flex-direction: column;
	min-height: 60px;
}

.tabs-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.oauth-settings-content {
	padding-top: var(--spacing--sm);
	max-width: 800px;
}

.error-message {
	margin-top: var(--spacing--2xs);
}

.save-button-container {
	margin-top: var(--spacing--sm);
}
</style>
