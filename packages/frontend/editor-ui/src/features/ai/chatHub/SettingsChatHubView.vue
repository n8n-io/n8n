<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useChatStore } from './chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nHeading } from '@n8n/design-system';
import { CHAT_PROVIDER_SETTINGS_MODAL_KEY } from './constants';
import ChatProvidersTable from './components/ChatProvidersTable.vue';
import {
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const i18n = useI18n();
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
		chatStore.fetchVectorStoreUsage(),
	]);
});

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
</script>
<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" :class="$style.title">
			{{ i18n.baseText('settings.chatHub') }}
		</N8nHeading>
		<ChatProvidersTable
			:data-test-id="'chat-providers-table'"
			:settings="chatStore.settings"
			:loading="chatStore.settingsLoading"
			:disabled="disabled"
			@edit-provider="onEditProvider"
			@refresh="onRefreshWorkflows"
		/>

		<N8nHeading size="medium" bold :class="$style.usageTitle">Vector Store Usage</N8nHeading>
		<div v-if="chatStore.vectorStoreUsage" :class="$style.usageSection">
			<div :class="$style.usageStats">
				<span :class="$style.usageText">
					{{ formatBytes(chatStore.vectorStoreUsage.currentSize) }} /
					{{ formatBytes(chatStore.vectorStoreUsage.maxSize) }}
				</span>
				<span :class="$style.usagePercentage">
					{{ chatStore.vectorStoreUsage.usagePercentage }}%
				</span>
			</div>
			<div :class="$style.usageBarContainer">
				<div
					:class="$style.usageBar"
					:style="{ width: `${chatStore.vectorStoreUsage.usagePercentage}%` }"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--lg);
}

.title {
	margin-bottom: var(--spacing--sm);
}

.usageSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.usageTitle {
	margin-bottom: var(--spacing--sm);
}

.usageStats {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.usageText {
	color: var(--color--text);
}

.usagePercentage {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.usageBarContainer {
	width: 100%;
	height: var(--spacing--sm);
	background-color: var(--color--background);
	border-radius: var(--radius);
	overflow: hidden;
}

.usageBar {
	height: 100%;
	background-color: var(--color--primary);
	border-radius: var(--radius);
	transition: width 0.3s ease;
}
</style>
