<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT } from '@/app/constants';
import {
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useChatStore } from './chat.store';
import ChatProvidersTable from './components/ChatProvidersTable.vue';
import { CHAT_PROVIDER_SETTINGS_MODAL_KEY } from './constants';
import ChatSemanticSearchSettings from './ChatSemanticSearchSettings.vue';

const i18n = useI18n();
const posthogStore = usePostHog();
const isSemanticSearchEnabled = computed(() =>
	posthogStore.isVariantEnabled(
		CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT.name,
		CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT.variant,
	),
);
const toast = useToast();
const documentTitle = useDocumentTitle();

const chatStore = useChatStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);
const disabled = computed(() => !isOwner.value && !isAdmin.value);

const fetchSettings = async () => {
	try {
		await chatStore.fetchAllChatSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.providers.fetching.error'));
	}
};

function onEditProvider(settings: ChatProviderSettingsDto) {
	uiStore.openModalWithData({
		name: CHAT_PROVIDER_SETTINGS_MODAL_KEY,
		data: {
			provider: settings.provider,
			disabled: disabled.value,
			onNewCredential: (provider: ChatHubLLMProvider) => {
				const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

				telemetry.track('User opened Credential modal', {
					credential_type: credentialType,
					source: 'chat_hub_settings',
					new_credential: true,
					workflow_id: null,
				});

				uiStore.openNewCredential(credentialType);
			},
			onConfirm: async (updatedSettings: ChatProviderSettingsDto) => {
				try {
					await chatStore.updateProviderSettings(updatedSettings);
					toast.showMessage({
						title: i18n.baseText('settings.chatHub.providers.updated.success'),
						type: 'success',
					});
					await settingsStore.getModuleSettings();
				} catch (error) {
					toast.showError(error, i18n.baseText('settings.chatHub.providers.updated.error'));
				}
			},
			onCancel: () => {},
		},
	});
}

async function onRefreshWorkflows() {
	await fetchSettings();
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.chatHub'));
	if (!settingsStore.isChatFeatureEnabled) {
		return;
	}
	await Promise.all([
		fetchSettings(),
		credentialsStore.fetchAllCredentials(),
		credentialsStore.fetchCredentialTypes(false),
	]);
});
</script>
<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge">
			{{ i18n.baseText('settings.chatHub') }}
		</N8nHeading>
		<ChatProvidersTable
			data-test-id="chat-providers-table"
			:settings="chatStore.settings"
			:loading="chatStore.settingsLoading"
			:disabled="disabled"
			@edit-provider="onEditProvider"
			@refresh="onRefreshWorkflows"
		/>
		<ChatSemanticSearchSettings v-if="isSemanticSearchEnabled" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	padding-bottom: var(--spacing--2xl);
}
</style>
