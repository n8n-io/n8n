<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nNotice,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import { useExposeAllWorkflowsToMcpOffer } from '@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';
import McpAllowedCallbackUrlsDialog from '@/features/ai/mcpAccess/components/McpAllowedCallbackUrlsDialog.vue';
import McpConnectClientDialog from '@/features/ai/mcpAccess/components/McpConnectClientDialog.vue';
import McpConnectedClientRow from '@/features/ai/mcpAccess/components/McpConnectedClientRow.vue';
import McpStatusControl from '@/features/ai/mcpAccess/components/McpStatusControl.vue';
import OAuthClientDetailsModal from '@/features/ai/mcpAccess/components/OAuthClientDetailsModal.vue';
import RevokeOAuthClientConfirmModal from '@/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useOAuthClientRevoke } from '@/features/ai/mcpAccess/composables/useOAuthClientRevoke';
import {
	MCP_AGENTS_VIEW,
	MCP_CLIENTS_VIEW,
	MCP_DOCS_PAGE_URL,
	MCP_WORKFLOWS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

import { UNKNOWN_COUNT_VALUE } from '@/features/ai/mcpAccess/mcp.constants';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();
const router = useRouter();

const mcpStore = useMCPStore();
const settingsStore = useSettingsStore();
const { offerToExposeAllWorkflows } = useExposeAllWorkflowsToMcpOffer();
const exposeAllWorkflowsToMcpStore = useExposeAllWorkflowsToMcpStore();

const agentsModuleActive = computed(() => settingsStore.isModuleActive('agents'));

const mcpStatusLoading = ref(false);
const showDisableDialog = ref(false);
const isLoadingClients = ref(true);

const canManageMcpInstance = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'mcp:manage' } }),
);
const canToggleMCP = computed(() => canManageMcpInstance.value && !mcpStore.mcpManagedByEnv);

const exposedWorkflowsCount = ref<number | null>(null);
const autoExposeSaving = ref(false);
const showCallbackUrlsDialog = ref(false);
const savingCallbackUrls = ref(false);

const onAutoExposeSwitchUpdate = (value: string | number | boolean) => {
	void onToggleAutoExpose(value === true);
};

const onToggleAutoExpose = async (value: boolean) => {
	autoExposeSaving.value = true;
	try {
		const updated = await mcpStore.setAutoExposeNewWorkflows(value);
		mcp.trackAutoExposeToggled({ enabled: updated, source: 'settings' });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.autoExpose.error.title'));
	} finally {
		autoExposeSaving.value = false;
	}
};

const showInstanceCapacityNotice = computed(
	() => canManageMcpInstance.value && mcpStore.instanceClientStats?.atCapacity === true,
);

const instanceCapacityNoticeContent = computed(() => {
	const stats = mcpStore.instanceClientStats;
	if (!stats) return '';
	return i18n.baseText('settings.mcp.instanceCapacity.warning', {
		interpolate: { count: String(stats.count), limit: String(stats.limit) },
	});
});

const workflowsExposedValue = computed(() =>
	exposedWorkflowsCount.value === null
		? UNKNOWN_COUNT_VALUE
		: i18n.baseText('settings.mcp.workflowsExposed.count', {
				adjustToNumber: exposedWorkflowsCount.value,
				interpolate: { count: String(exposedWorkflowsCount.value) },
			}),
);

const exposedAgentsCount = ref<number | null>(null);

const agentsExposedValue = computed(() =>
	exposedAgentsCount.value === null
		? UNKNOWN_COUNT_VALUE
		: i18n.baseText('settings.mcp.agentsExposed.count', {
				adjustToNumber: exposedAgentsCount.value,
				interpolate: { count: String(exposedAgentsCount.value) },
			}),
);

const callbackUrlsValue = computed(() =>
	mcpStore.allowedRedirectUris.length === 0
		? i18n.baseText('settings.mcp.callbackUrls.value.all')
		: i18n.baseText('settings.mcp.callbackUrls.value.count', {
				adjustToNumber: mcpStore.allowedRedirectUris.length,
				interpolate: { count: String(mcpStore.allowedRedirectUris.length) },
			}),
);

const fetchExposedWorkflowsCount = async () => {
	try {
		const response = await mcpStore.fetchWorkflowsAvailableForMCP(1, 1);
		exposedWorkflowsCount.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	}
};

const fetchExposedAgentsCount = async () => {
	if (!agentsModuleActive.value) return;
	try {
		const response = await mcpStore.fetchAgentsAvailableForMCP(1, 1);
		exposedAgentsCount.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.agents.list.error.fetching'));
	}
};

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await Promise.all([
				fetchExposedWorkflowsCount(),
				fetchExposedAgentsCount(),
				fetchConnectedClientsPreview(),
			]);
		}
		mcp.trackUserToggledMcpAccess(enabled);
		if (enabled && updated) {
			// Best-effort expose-all offer for enrolled users; enabling MCP no longer
			// auto-opens the connect dialog (the user connects a client when ready).
			void offerToExposeAllWorkflows(async () => {
				await Promise.all([fetchExposedWorkflowsCount(), fetchExposedAgentsCount()]);
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		mcpStatusLoading.value = false;
	}
};

const onConfirmDisable = async () => {
	showDisableDialog.value = false;
	await onToggleMCPAccess(false);
};

/**
 * Loads the user's own first clients for the inline preview, along with the
 * totals the "N clients have access" count renders. Only the user's own clients
 * are previewed here; other users' clients stay behind the clients page, which
 * gates them by permission.
 */
const fetchConnectedClientsPreview = async () => {
	isLoadingClients.value = true;
	try {
		await mcpStore.fetchOAuthClientsPreview();
		isLoadingClients.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

const previewClients = computed(() => mcpStore.oauthClientsPreview);

/** Instance-wide count when the user can see it, own count otherwise. */
const connectedClientsTotal = computed(
	() => mcpStore.oauthClientTotals.all ?? mcpStore.oauthClientTotals.mine,
);

// The "View all" row is the section's only content while clients load or when the
// user has none. Next to a preview it only earns its place when more clients exist
// than the preview shows (more of the user's own, or other users' for managers).
const showViewAllRow = computed(
	() =>
		previewClients.value.length === 0 || connectedClientsTotal.value > previewClients.value.length,
);

const onConnectClient = () => {
	mcp.trackConnectClientClicked('settings');
	mcpStore.openConnectPopover();
};

const openClientsView = () => {
	// The preview is the user's own clients, so "View all" continues into that list.
	// With none of their own to land on, a manager goes straight to everyone's.
	const { mine, all } = mcpStore.oauthClientTotals;
	const tab = mine === 0 && (all ?? 0) > 0 ? 'all' : 'mine';
	void router.push({ name: MCP_CLIENTS_VIEW, query: { tab } });
};

const detailsClient = ref<OAuthClientResponseDto | null>(null);
const detailsOpen = ref(false);

const openClientDetails = (client: OAuthClientResponseDto) => {
	detailsClient.value = client;
	detailsOpen.value = true;
};

const { revokeClient, revoking, isRevokingForOther, requestRevoke, cancelRevoke, confirmRevoke } =
	useOAuthClientRevoke({ refreshList: false, onRevoked: fetchConnectedClientsPreview });

const openWorkflowsView = () => {
	void router.push({ name: MCP_WORKFLOWS_VIEW });
};

const openAgentsView = () => {
	void router.push({ name: MCP_AGENTS_VIEW });
};

const loadRedirectUris = async () => {
	try {
		await mcpStore.fetchAllowedRedirectUris();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.loading'));
	}
};

const onSaveCallbackUrls = async (uris: string[]) => {
	try {
		savingCallbackUrls.value = true;
		await mcpStore.setAllowedRedirectUris(uris);
		showCallbackUrlsDialog.value = false;
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.allowedRedirectUris.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.saving'));
	} finally {
		savingCallbackUrls.value = false;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (!mcpStore.mcpAccessEnabled) {
		return;
	}
	const fetches: Array<Promise<unknown>> = [
		fetchExposedWorkflowsCount(),
		fetchExposedAgentsCount(),
		fetchConnectedClientsPreview(),
	];
	if (canManageMcpInstance.value) {
		fetches.push(loadRedirectUris());
		fetches.push(mcpStore.getInstanceClientStats());
	}
	await Promise.all(fetches);
});

// The preview is per-user data; don't let it outlive the page (a soft-redirect
// logout keeps the store), so the next visit starts from the loading state.
onBeforeUnmount(() => {
	mcpStore.clearOAuthClientsPreview();
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.mcp.page.title')"
			:description="i18n.baseText('settings.mcp.page.description')"
			:docs-url="MCP_DOCS_PAGE_URL"
			data-test-id="mcp-settings-header"
		/>

		<MCPEmptyState
			v-if="!mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			:managed-by-env="mcpStore.mcpManagedByEnv"
			@turn-on-mcp="onToggleMCPAccess(true)"
		/>

		<template v-else>
			<N8nNotice
				v-if="showInstanceCapacityNotice"
				theme="warning"
				data-test-id="mcp-instance-capacity-notice"
				:content="instanceCapacityNoticeContent"
			/>

			<N8nSettingsSection
				:title="i18n.baseText('settings.mcp.connectionDetails.title')"
				data-test-id="mcp-enabled-section"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.status.title')"
						:description="i18n.baseText('settings.mcp.status.description')"
					>
						<template #action>
							<McpStatusControl
								:disabled="!canToggleMCP"
								:loading="mcpStatusLoading"
								:managed-by-env="mcpStore.mcpManagedByEnv"
								@disable="showDisableDialog = true"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.yourClient.title')"
						:description="i18n.baseText('settings.mcp.yourClient.description')"
					>
						<template #action>
							<N8nButton
								variant="outline"
								size="medium"
								icon="mcp"
								:label="i18n.baseText('settings.mcp.yourClient.connect')"
								data-test-id="mcp-connect-client-button"
								@click="onConnectClient"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection :title="i18n.baseText('settings.mcp.access.title')">
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.workflowsExposed.title')"
						:description="i18n.baseText('settings.mcp.workflowsExposed.description')"
						clickable
						data-test-id="mcp-workflows-exposed-row"
						@click="openWorkflowsView"
					>
						<template #action>
							<N8nSettingsRowConfigure :value="workflowsExposedValue" />
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-if="canManageMcpInstance && exposeAllWorkflowsToMcpStore.isEnabled"
						:title="i18n.baseText('settings.mcp.autoExpose.title')"
						:description="i18n.baseText('settings.mcp.autoExpose.description')"
					>
						<template #action>
							<ElSwitch
								data-test-id="mcp-auto-expose-toggle"
								:model-value="mcpStore.autoExposeNewWorkflows"
								:disabled="mcpStore.mcpManagedByEnv"
								:loading="autoExposeSaving"
								@update:model-value="onAutoExposeSwitchUpdate"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="agentsModuleActive">
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.agentsExposed.title')"
						:description="i18n.baseText('settings.mcp.agentsExposed.description')"
						clickable
						data-test-id="mcp-agents-exposed-row"
						@click="openAgentsView"
					>
						<template #action>
							<N8nSettingsRowConfigure :value="agentsExposedValue" />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="canManageMcpInstance">
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.callbackUrls.title')"
						:description="i18n.baseText('settings.mcp.callbackUrls.description')"
						clickable
						data-test-id="mcp-callback-urls-row"
						@click="showCallbackUrlsDialog = true"
					>
						<template #action>
							<N8nSettingsRowConfigure :value="callbackUrlsValue" />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection :title="i18n.baseText('settings.mcp.connectedClients.title')">
				<N8nSettingsRowGroup v-if="previewClients.length > 0" data-test-id="mcp-clients-preview">
					<McpConnectedClientRow
						v-for="client in previewClients"
						:key="client.id"
						:client="client"
						:scope-tools="mcpStore.oauthClientScopeTools"
						@click="openClientDetails(client)"
						@revoke="requestRevoke(client)"
					/>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="showViewAllRow">
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.connectedClients.viewAll.title')"
						:description="
							isLoadingClients
								? UNKNOWN_COUNT_VALUE
								: i18n.baseText('settings.mcp.connectedClients.viewAll.description', {
										adjustToNumber: connectedClientsTotal,
										interpolate: { count: String(connectedClientsTotal) },
									})
						"
						clickable
						data-test-id="mcp-clients-view-all-row"
						@click="openClientsView"
					>
						<template #action>
							<N8nSettingsRowConfigure
								:value="i18n.baseText('settings.mcp.connectedClients.viewAll.action')"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		</template>

		<N8nDialog
			v-model:open="showDisableDialog"
			size="small"
			:header="i18n.baseText('settings.mcp.status.disableDialog.title')"
			:description="i18n.baseText('settings.mcp.status.disableDialog.description')"
			data-test-id="mcp-disable-dialog"
		>
			<N8nDialogFooter>
				<N8nDialogClose as-child>
					<N8nButton variant="outline" :label="i18n.baseText('generic.cancel')" />
				</N8nDialogClose>
				<N8nButton
					variant="destructive"
					:label="i18n.baseText('settings.mcp.status.disableDialog.confirm')"
					data-test-id="mcp-disable-dialog-confirm"
					@click="onConfirmDisable"
				/>
			</N8nDialogFooter>
		</N8nDialog>

		<McpConnectClientDialog />

		<OAuthClientDetailsModal
			v-model:open="detailsOpen"
			:client="detailsClient"
			@revoke="requestRevoke"
		/>

		<RevokeOAuthClientConfirmModal
			:client="revokeClient"
			:open="!!revokeClient"
			:loading="revoking"
			:revoking-for-other="!!revokeClient && isRevokingForOther(revokeClient)"
			@confirm="confirmRevoke"
			@cancel="cancelRevoke"
			@update:open="cancelRevoke"
		/>

		<McpAllowedCallbackUrlsDialog
			v-model:open="showCallbackUrlsDialog"
			:uris="mcpStore.allowedRedirectUris"
			:saving="savingCallbackUrls"
			@save="onSaveCallbackUrls"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
