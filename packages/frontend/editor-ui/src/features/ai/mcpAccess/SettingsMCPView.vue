<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
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
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { useExposeAllWorkflowsToMcpOffer } from '@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';
import McpAllowedCallbackUrlsDialog from '@/features/ai/mcpAccess/components/McpAllowedCallbackUrlsDialog.vue';
import McpConnectClientDialog from '@/features/ai/mcpAccess/components/McpConnectClientDialog.vue';
import McpConnectedClientsPreview from '@/features/ai/mcpAccess/components/McpConnectedClientsPreview.vue';
import McpStatusControl from '@/features/ai/mcpAccess/components/McpStatusControl.vue';
import OAuthClientDetailsModal from '@/features/ai/mcpAccess/components/OAuthClientDetailsModal.vue';
import RevokeOAuthClientConfirmModal from '@/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import {
	MCP_CLIENTS_VIEW,
	MCP_DOCS_PAGE_URL,
	MCP_WORKFLOWS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();
const telemetry = useTelemetry();
const router = useRouter();

const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const { offerToExposeAllWorkflows } = useExposeAllWorkflowsToMcpOffer();

const mcpStatusLoading = ref(false);
const showDisableDialog = ref(false);

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);
const canManageMcpInstance = computed(() => isOwner.value || isAdmin.value);
const canToggleMCP = computed(() => canManageMcpInstance.value && !mcpStore.mcpManagedByEnv);

const exposedWorkflowsCount = ref(0);

const revokeClient = ref<OAuthClientResponseDto | null>(null);
const revoking = ref(false);
// Stays set through the close animation.
const detailsClient = ref<OAuthClientResponseDto | null>(null);
const showDetailsModal = ref(false);

const showCallbackUrlsDialog = ref(false);
const savingCallbackUrls = ref(false);

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
	i18n.baseText('settings.mcp.workflowsExposed.count', {
		adjustToNumber: exposedWorkflowsCount.value,
		interpolate: { count: String(exposedWorkflowsCount.value) },
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

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await Promise.all([fetchExposedWorkflowsCount(), fetchoAuthCLients()]);
		}
		mcp.trackUserToggledMcpAccess(enabled);
		if (enabled && updated) {
			// Best-effort offer; the connect dialog only opens when the offer
			// modal doesn't, so they never stack.
			void offerToExposeAllWorkflows(fetchExposedWorkflowsCount).then((offered) => {
				if (!offered) {
					mcpStore.openConnectPopover();
				}
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

const fetchoAuthCLients = async () => {
	try {
		await mcpStore.getAllOAuthClients();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

/** Instance-wide count when the user can see it, own count otherwise. */
const connectedClientsTotal = computed(
	() => mcpStore.oauthClientTotals.all ?? mcpStore.oauthClientTotals.mine,
);

const onOpenClientDetails = (client: OAuthClientResponseDto) => {
	detailsClient.value = client;
	showDetailsModal.value = true;
	telemetry.track('User opened MCP client details');
};

const openClientsView = () => {
	void router.push({ name: MCP_CLIENTS_VIEW });
};

const onRevokeRequest = (client: OAuthClientResponseDto) => {
	revokeClient.value = client;
};

const onRevokeConfirm = async () => {
	const client = revokeClient.value;
	if (!client) return;
	try {
		revoking.value = true;
		await mcpStore.removeOAuthClient(client.id, client.owner?.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.oAuthClients.revoke.success.title'),
			message: i18n.baseText('settings.mcp.oAuthClients.revoke.success.message', {
				interpolate: { name: client.name },
			}),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.revoke.error'));
	} finally {
		revoking.value = false;
		revokeClient.value = null;
	}
};

const openWorkflowsView = () => {
	void router.push({ name: MCP_WORKFLOWS_VIEW });
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
	const fetches: Array<Promise<unknown>> = [fetchExposedWorkflowsCount(), fetchoAuthCLients()];
	if (canManageMcpInstance.value) {
		fetches.push(loadRedirectUris());
		fetches.push(mcpStore.getInstanceClientStats());
	}
	await Promise.all(fetches);
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

			<N8nSettingsSection data-test-id="mcp-enabled-section">
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
								:label="i18n.baseText('settings.mcp.yourClient.connect')"
								data-test-id="mcp-connect-client-button"
								@click="mcpStore.openConnectPopover()"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:title="i18n.baseText('settings.mcp.access.title')"
				:description="i18n.baseText('settings.mcp.access.description')"
			>
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
						v-if="canManageMcpInstance"
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

			<N8nSettingsSection
				:title="i18n.baseText('settings.mcp.connectedClients.title')"
				:description="i18n.baseText('settings.mcp.connectedClients.description')"
			>
				<McpConnectedClientsPreview
					:clients="mcpStore.oauthClients"
					:total-count="connectedClientsTotal"
					@open-details="onOpenClientDetails"
					@revoke="onRevokeRequest"
					@view-all="openClientsView"
				/>
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
			v-model:open="showDetailsModal"
			:client="detailsClient"
			:scope-tools="mcpStore.oauthClientScopeTools"
			@revoke="onRevokeRequest"
		/>

		<McpAllowedCallbackUrlsDialog
			v-model:open="showCallbackUrlsDialog"
			:uris="mcpStore.allowedRedirectUris"
			:saving="savingCallbackUrls"
			@save="onSaveCallbackUrls"
		/>

		<RevokeOAuthClientConfirmModal
			:client="revokeClient"
			:open="!!revokeClient"
			:loading="revoking"
			:revoking-for-other="
				!!revokeClient?.owner && revokeClient.owner.id !== usersStore.currentUser?.id
			"
			@confirm="onRevokeConfirm"
			@cancel="revokeClient = null"
			@update:open="revokeClient = null"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell pads the page top (70.5px); collapse it so the page
   header starts at the layout's own 24px inset, like the prototype. */
.layout {
	margin-top: -70.5px;
}
</style>
