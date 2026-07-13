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
	N8nText,
} from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useExposeAllWorkflowsToMcpOffer } from '@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';
import McpAllowedCallbackUrlsDialog from '@/features/ai/mcpAccess/components/McpAllowedCallbackUrlsDialog.vue';
import McpClientLogoCards from '@/features/ai/mcpAccess/components/McpClientLogoCards.vue';
import McpConnectClientDialog from '@/features/ai/mcpAccess/components/McpConnectClientDialog.vue';
import McpStatusControl from '@/features/ai/mcpAccess/components/McpStatusControl.vue';
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

/** Populates the store's client totals so the "N clients have access" count renders. */
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

const openClientsView = () => {
	void router.push({ name: MCP_CLIENTS_VIEW });
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
	<N8nSettingsLayout full-width :class="$style.layout">
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
								variant="solid"
								size="medium"
								icon="mcp"
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
				<div
					v-if="connectedClientsTotal === 0"
					:class="$style['clients-empty']"
					data-test-id="mcp-clients-empty"
				>
					<McpClientLogoCards :class="$style['clients-empty-cards']" />
					<N8nText bold size="medium" color="text-dark">
						{{ i18n.baseText('settings.mcp.connectedClients.empty.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.connectedClients.empty.description') }}
					</N8nText>
				</div>
				<N8nSettingsRowGroup v-else>
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.connectedClients.viewAll.title')"
						:description="
							i18n.baseText('settings.mcp.connectedClients.viewAll.description', {
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

		<McpAllowedCallbackUrlsDialog
			v-model:open="showCallbackUrlsDialog"
			:uris="mcpStore.allowedRedirectUris"
			:saving="savingCallbackUrls"
			@save="onSaveCallbackUrls"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell pads the page top (70.5px); collapse it so the page
   header starts at the layout's own 24px inset, like the prototype. */
.layout {
	margin-top: -70.5px;
	/* Fill the settings shell width (like the OpenTelemetry page) instead of the
	   default 720px column; also un-caps the page header, which self-caps to this. */
	--settings-content--max-width: none;
}

/* No-clients state: same dashed-card language as the disabled-MCP empty state. */
.clients-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xl) var(--spacing--xl);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
}

.clients-empty-cards {
	margin-bottom: var(--spacing--sm);
}
</style>
