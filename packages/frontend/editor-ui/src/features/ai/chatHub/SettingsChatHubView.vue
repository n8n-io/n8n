<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from './chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nButton, N8nCallout, N8nHeading } from '@n8n/design-system';
import { CHAT_CREDENTIAL_SELECTOR_MODAL_KEY, CHAT_PROVIDER_SETTINGS_MODAL_KEY } from './constants';
import ChatProvidersTable from './components/ChatProvidersTable.vue';
import {
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { updateVectorStoreCredentialApi } from './chat.api';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();

const chatStore = useChatStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const rootStore = useRootStore();

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const disabled = computed(() => !isOwner.value && !isAdmin.value);

const VECTOR_STORE_CREDENTIAL_TYPE = 'vectorStorePGVectorScopedApi';

const { vectorStoreCredentialId, vectorStoreCredential, isVectorStoreReady } =
	storeToRefs(chatStore);

function openVectorStoreSelector() {
	uiStore.openModalWithData({
		name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
		data: {
			credentialType: VECTOR_STORE_CREDENTIAL_TYPE,
			displayName: 'PGVector',
			initialValue: vectorStoreCredentialId.value,
			onSelect: async (credentialId) => {
				if (!credentialId) {
					return;
				}
				try {
					await updateVectorStoreCredentialApi(rootStore.restApiContext, credentialId);
					await settingsStore.getModuleSettings();
				} catch (error) {
					toast.showError(error, i18n.baseText('settings.chatHub.vectorStore.save.error'));
				}
			},
		},
	});
}

function onSetupVectorStore() {
	const existing = credentialsStore.getCredentialsByType(VECTOR_STORE_CREDENTIAL_TYPE);
	if (existing.length > 0) {
		openVectorStoreSelector();
	} else {
		uiStore.openNewCredential(VECTOR_STORE_CREDENTIAL_TYPE);
	}
}

function onConfigureVectorStore() {
	openVectorStoreSelector();
}

let unsubscribeCredentialActions: (() => void) | null = null;

function subscribeToCredentialActions() {
	unsubscribeCredentialActions = credentialsStore.$onAction(({ name, after }) => {
		if (name !== 'createNewCredential') {
			return;
		}
		after(async (result) => {
			const credential = result as unknown as ICredentialsResponse;
			if (credential?.type !== VECTOR_STORE_CREDENTIAL_TYPE) {
				return;
			}
			try {
				await updateVectorStoreCredentialApi(rootStore.restApiContext, credential.id);
				await settingsStore.getModuleSettings();
			} catch (error) {
				toast.showError(error, i18n.baseText('settings.chatHub.vectorStore.save.error'));
			}
		});
	});
}

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
	subscribeToCredentialActions();
	await Promise.all([
		fetchSettings(),
		credentialsStore.fetchAllCredentials(),
		credentialsStore.fetchCredentialTypes(false),
	]);
});

onUnmounted(() => {
	unsubscribeCredentialActions?.();
});
</script>
<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" :class="$style.title">
			{{ i18n.baseText('settings.chatHub') }}
		</N8nHeading>
		<div :class="$style.container">
			<div :class="$style.section">
				<N8nHeading size="medium" :bold="true" :class="$style.sectionTitle">
					{{ i18n.baseText('settings.chatHub.vectorStore.title') }}
				</N8nHeading>
				<N8nCallout v-if="isVectorStoreReady" theme="success" icon="check">
					{{ i18n.baseText('settings.chatHub.vectorStore.ready') }}
					<template v-if="!disabled" #trailingContent>
						<N8nButton size="small" variant="subtle" @click="onConfigureVectorStore">
							{{ i18n.baseText('settings.chatHub.vectorStore.configureButton') }}
						</N8nButton>
					</template>
				</N8nCallout>
				<N8nCallout v-else-if="vectorStoreCredential" theme="warning" icon="info">
					{{
						disabled
							? i18n.baseText('settings.chatHub.vectorStore.notShared.noAccess')
							: i18n.baseText('settings.chatHub.vectorStore.notShared')
					}}
					<template v-if="!disabled" #trailingContent>
						<N8nButton size="small" variant="subtle" @click="onConfigureVectorStore">
							{{ i18n.baseText('settings.chatHub.vectorStore.configureButton') }}
						</N8nButton>
					</template>
				</N8nCallout>
				<N8nCallout v-else theme="warning" icon="info">
					{{
						disabled
							? i18n.baseText('settings.chatHub.vectorStore.missing.noAccess')
							: i18n.baseText('settings.chatHub.vectorStore.missing')
					}}
					<template v-if="!disabled" #trailingContent>
						<N8nButton size="small" variant="subtle" @click="onSetupVectorStore">
							{{ i18n.baseText('settings.chatHub.vectorStore.configureButton') }}
						</N8nButton>
					</template>
				</N8nCallout>
			</div>
			<ChatProvidersTable
				:data-test-id="'chat-providers-table'"
				:settings="chatStore.settings"
				:loading="chatStore.settingsLoading"
				:disabled="disabled"
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

.title {
	margin-bottom: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionTitle {
	margin-bottom: var(--spacing--3xs);
}
</style>
