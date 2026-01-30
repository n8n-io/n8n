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

type MCPTabs = 'workflows' | 'oauth' | 'settings';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();
const telemetry = useTelemetry();

const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();

const mcpStatusLoading = ref(false);
const selectedTab = ref<MCPTabs>('workflows');

const tabs = ref<Array<TabOptions<MCPTabs>>>([
	{
		label: i18n.baseText('settings.mcp.tabs.workflows'),
		value: 'workflows',
	},
	{
		label: i18n.baseText('settings.mcp.tabs.oauth'),
		value: 'oauth',
	},
	{
		label: i18n.baseText('settings.mcp.tabs.oauthSettings'),
		value: 'settings',
	},
]);

const workflowsLoading = ref(false);
const availableWorkflows = ref<WorkflowListItem[]>([]);

const oAuthClientsLoading = ref(false);
const connectedOAuthClients = ref<OAuthClientResponseDto[]>([]);

const redirectUrisInput = ref('');
const redirectUrisError = ref('');
const redirectUrisLoading = ref(false);

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const canToggleMCP = computed(() => isOwner.value || isAdmin.value);

const showConnectWorkflowsButton = computed(() => {
	return selectedTab.value === 'workflows' && availableWorkflows.value.length > 0;
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
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		mcpStatusLoading.value = false;
		workflowsLoading.value = false;
	}
};

const onToggleWorkflowMCPAccess = async (workflowId: string, isEnabled: boolean) => {
	try {
		await mcpStore.toggleWorkflowMcpAccess(workflowId, isEnabled);
		if (isEnabled) {
			await fetchAvailableWorkflows();
		} else {
			availableWorkflows.value = availableWorkflows.value.filter((w) => w.id !== workflowId);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
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
		const workflows = await mcpStore.fetchWorkflowsAvailableForMCP(1, 200);
		availableWorkflows.value = workflows;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	} finally {
		setTimeout(() => {
			workflowsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const onRefreshWorkflows = async () => {
	await fetchAvailableWorkflows();
};

const fetchoAuthCLients = async () => {
	try {
		oAuthClientsLoading.value = true;
		const clients = await mcpStore.getAllOAuthClients();
		connectedOAuthClients.value = clients;
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
			onEnableMcpAccess: async (workflowId: string) => {
				await onToggleWorkflowMCPAccess(workflowId, true);
			},
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
	await fetchAvailableWorkflows();
});
</script>
<template>
	<div :class="$style.container">
		<header :class="$style['main-header']" data-test-id="mcp-settings-header">
			<div :class="$style.headings">
				<N8nHeading size="2xlarge" class="mb-2xs">{{ i18n.baseText('settings.mcp') }}</N8nHeading>
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
				@disable-mcp-access="onToggleMCPAccess(!mcpStore.mcpAccessEnabled)"
			/>
		</header>
		<MCPEmptyState
			v-if="!mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			@turn-on-mcp="onToggleMCPAccess(true)"
		/>
		<div
			v-if="mcpStore.mcpAccessEnabled"
			:class="$style.container"
			data-test-id="mcp-enabled-section"
		>
			<header :class="$style['tabs-header']">
				<N8nTabs :model-value="selectedTab" :options="tabs" @update:model-value="onTabSelected" />
				<div :class="$style.actions">
					<N8nButton
						v-if="showConnectWorkflowsButton"
						:label="i18n.baseText('settings.mcp.connectWorkflows')"
						data-test-id="mcp-connect-workflows-header-button"
						size="small"
						type="primary"
						@click="openConnectWorkflowsModal"
					/>
					<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
						<N8nButton
							data-test-id="mcp-workflows-refresh-button"
							size="small"
							type="tertiary"
							icon="refresh-cw"
							:square="true"
							@click="onTableRefresh"
						/>
					</N8nTooltip>
				</div>
			</header>
			<main>
				<WorkflowsTable
					v-if="selectedTab === 'workflows'"
					:data-test-id="'mcp-workflow-table'"
					:workflows="availableWorkflows"
					:loading="workflowsLoading"
					@remove-mcp-access="(workflow) => onToggleWorkflowMCPAccess(workflow.id, false)"
					@connect-workflows="openConnectWorkflowsModal"
					@update-description="onUpdateDescription"
					@refresh="onRefreshWorkflows"
				/>
				<OAuthClientsTable
					v-else-if="selectedTab === 'oauth'"
					:data-test-id="'mcp-oauth-clients-table'"
					:clients="connectedOAuthClients"
					:loading="oAuthClientsLoading"
					@revoke-client="revokeClientAccess"
					@refresh="onTableRefresh"
				/>
				<section
					v-else-if="selectedTab === 'settings'"
					:class="$style['oauth-settings-content']"
					data-test-id="mcp-oauth-settings-tab"
				>
					<div :class="$style['settings-description']">
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('settings.mcp.allowedRedirectUris.description') }}
						</N8nText>
					</div>
					<N8nInputLabel :label="i18n.baseText('settings.mcp.allowedRedirectUris.label')">
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
	padding: var(--spacing--lg);
	max-width: 800px;
}

.settings-description {
	margin-bottom: var(--spacing--lg);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
	border-left: calc(var(--border-width) * 3) solid var(--color--primary);
}

.error-message {
	margin-top: var(--spacing--2xs);
}

.save-button-container {
	margin-top: var(--spacing--sm);
}
</style>
