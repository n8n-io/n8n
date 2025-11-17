<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useChatStore } from './chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nHeading } from '@n8n/design-system';
import { CHAT_PROVIDER_SETTINGS_MODAL_KEY, LOADING_INDICATOR_TIMEOUT } from './constants';
import ChatProvidersTable from './components/ChatProvidersTable.vue';
import {
	ChatHubLLMProvider,
	ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();

const chatStore = useChatStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const providersLoading = ref(false);
const providers = ref<ChatProviderSettingsDto[]>([]);

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const fetchProviderSettings = async () => {
	providersLoading.value = true;
	try {
		const settings = await chatStore.fetchAllChatSettings();
		providers.value = settings;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.error.fetching.providerSettings'));
	} finally {
		setTimeout(() => {
			providersLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

function onEditProvider(settings: ChatProviderSettingsDto) {
	uiStore.openModalWithData({
		name: CHAT_PROVIDER_SETTINGS_MODAL_KEY,
		data: {
			provider: settings.provider,
			disabled: !isOwner.value && !isAdmin.value,
			onNewCredential: (provider: ChatHubLLMProvider) => {
				const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

				// telemetry.track('User opened Credential modal', {
				// 	credential_type: credentialType,
				// 	source: 'chat_hub_settings',
				// 	new_credential: true,
				// 	workflow_id: null,
				// });

				uiStore.openNewCredential(credentialType);
			},
			onConfirm: async (updatedSettings: ChatProviderSettingsDto) => {
				try {
					await chatStore.updateProviderSettings(updatedSettings);
					// toast.showMessage(i18n.baseText('settings.chatHub.success.providerSettings.updated'));
					await fetchProviderSettings();
				} catch (error) {
					// toast.showError(error, i18n.baseText('settings.chatHub.error.updating.providerSettings'));
				}
			},
			onCancel: () => {},
		},
	});
}

function onRefreshWorkflows() {
	fetchProviderSettings();
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.chatHub'));
	if (!settingsStore.isChatFeatureEnabled) {
		return;
	}
	await fetchProviderSettings();
});
</script>
<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" class="mb-2xs">{{ i18n.baseText('settings.chatHub') }}</N8nHeading>
		<div :class="$style.container">
			<ChatProvidersTable
				:data-test-id="'chat-providers-table'"
				:providers="providers"
				:loading="providersLoading"
				@edit-provider="onEditProvider"
				@refresh="onRefreshWorkflows"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
</style>
