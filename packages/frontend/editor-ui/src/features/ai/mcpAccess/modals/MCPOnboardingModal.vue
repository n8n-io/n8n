<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import MCPAccessTokenPopoverTab from '@/features/ai/mcpAccess/components/header/connectPopover/MCPAccessTokenPopoverTab.vue';
import MCPOnboardingClientSetup from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingClientSetup.vue';
import { MCP_ENDPOINT, MCP_ONBOARDING_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nButton, N8nNotice, N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type MCPOnboardingClient = 'claude_code' | 'codex';
type MCPOnboardingSurface = 'tile' | 'first_open_modal';

const props = defineProps<{
	data?: {
		surface?: MCPOnboardingSurface;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const mcpStore = useMCPStore();
const experimentStore = useSurfaceMcpToNewCloudUsersStore();
const modalBus = createEventBus();

const activeClient = ref<MCPOnboardingClient>('claude_code');
const isEnabling = ref(false);
const enabledDuringThisOpen = ref(false);

const surface = computed<MCPOnboardingSurface>(() => props.data?.surface ?? 'tile');

const clientOptions = computed(() => [
	{
		value: 'claude_code',
		label: i18n.baseText('settings.mcp.onboarding.client.claudeCode'),
	},
	{
		value: 'codex',
		label: i18n.baseText('settings.mcp.onboarding.client.codex'),
	},
]);

const serverUrl = computed(() => `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`);

const isKeyRedacted = computed(
	() => mcpStore.currentUserMCPKey?.apiKey?.includes('******') ?? false,
);

const hasResolvedAccessToken = computed(
	() => Boolean(mcpStore.currentUserMCPKey?.apiKey) && !isKeyRedacted.value,
);

const accessToken = computed(() => {
	const token = mcpStore.currentUserMCPKey?.apiKey ?? '';
	return isKeyRedacted.value ? '<your-access-token>' : token;
});

async function enableMcpAccess() {
	try {
		isEnabling.value = true;
		experimentStore.trackEnableClicked(surface.value);
		const updated = await mcpStore.setMcpAccessEnabled(true);

		if (!updated) {
			return;
		}

		enabledDuringThisOpen.value = true;
		experimentStore.trackEnabled(surface.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		isEnabling.value = false;
	}
}

function handleModalClosed() {
	if (
		surface.value === 'first_open_modal' &&
		!enabledDuringThisOpen.value &&
		!mcpStore.mcpAccessEnabled
	) {
		experimentStore.dismissFirstOpenModal();
		experimentStore.trackDismissed(surface.value);
	}

	mcpStore.resetCurrentUserMCPKey();
}

function handleClientChange(value: string) {
	activeClient.value = value as MCPOnboardingClient;
	experimentStore.trackClientSelected(activeClient.value);
}

function handleConnectionCopy(type: 'serverUrl' | 'accessToken' | 'mcpJson') {
	const parameterMap = {
		serverUrl: 'server-url',
		accessToken: 'access-token',
		mcpJson: 'setup-config',
	} as const;

	experimentStore.trackCopiedParameter(surface.value, activeClient.value, parameterMap[type]);
}

function handleClientSetupCopy() {
	experimentStore.trackCopiedParameter(surface.value, activeClient.value, 'setup-config');
}

onMounted(() => {
	modalBus.on('closed', handleModalClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', handleModalClosed);
	mcpStore.resetCurrentUserMCPKey();
});
</script>

<template>
	<Modal
		:name="MCP_ONBOARDING_MODAL_KEY"
		:title="i18n.baseText('settings.mcp.onboarding.title')"
		width="720px"
		:event-bus="modalBus"
		:close-on-click-modal="true"
	>
		<template #content>
			<div :class="$style.content" data-test-id="mcp-onboarding-modal-content">
				<div :class="$style.summary">
					<N8nText tag="p" size="large" color="text-base">
						{{ i18n.baseText('settings.mcp.onboarding.description') }}
					</N8nText>
				</div>

				<div :class="$style.controls">
					<N8nRadioButtons
						data-test-id="mcp-onboarding-client-switcher"
						:model-value="activeClient"
						:options="clientOptions"
						@update:model-value="handleClientChange"
					/>

					<N8nButton
						variant="solid"
						:loading="isEnabling"
						:disabled="mcpStore.mcpAccessEnabled || isEnabling"
						data-test-id="mcp-onboarding-enable-button"
						@click="enableMcpAccess"
					>
						{{ i18n.baseText('settings.mcp.onboarding.enable') }}
					</N8nButton>
				</div>

				<N8nNotice
					v-if="!mcpStore.mcpAccessEnabled"
					theme="info"
					data-test-id="mcp-onboarding-pending-notice"
				>
					{{ i18n.baseText('settings.mcp.onboarding.pending') }}
				</N8nNotice>

				<div
					v-if="mcpStore.mcpAccessEnabled"
					:class="$style.connectionDetails"
					data-test-id="mcp-onboarding-connection-details"
				>
					<MCPAccessTokenPopoverTab :server-url="serverUrl" @copy="handleConnectionCopy" />
				</div>

				<MCPOnboardingClientSetup
					:client="activeClient"
					:server-url="serverUrl"
					:access-token="accessToken"
					:is-token-ready="hasResolvedAccessToken"
					@copy="handleClientSetupCopy"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.summary {
	max-width: 68ch;
}

.controls {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);

	@media (max-width: 768px) {
		flex-direction: column;
		align-items: stretch;
	}
}

.connectionDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
