<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useChatStore } from './chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nHeading, N8nIconButton, N8nText } from '@n8n/design-system';
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
import { useRootStore } from '@n8n/stores/useRootStore';
import { deleteMemoryFactApi } from './chat.api';

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

const memoryFacts = computed(() => {
	return chatStore.memory
		.split('\n')
		.map((f) => f.trim())
		.filter((f) => f.length > 0);
});

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

async function onDeleteMemoryFact(index: number) {
	try {
		await deleteMemoryFactApi(rootStore.restApiContext, index);
		await fetchSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.memory.delete.error'));
	}
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
		<N8nHeading size="2xlarge" :class="$style.title">
			{{ i18n.baseText('settings.chatHub') }}
		</N8nHeading>
		<div :class="$style.container">
			<ChatProvidersTable
				:data-test-id="'chat-providers-table'"
				:settings="chatStore.settings"
				:loading="chatStore.settingsLoading"
				:disabled="disabled"
				@edit-provider="onEditProvider"
				@refresh="onRefreshWorkflows"
			/>
			<div :class="$style.memorySection">
				<div :class="$style.memorySectionHeader">
					<N8nHeading size="large">
						{{ i18n.baseText('settings.chatHub.memory.title') }}
					</N8nHeading>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.chatHub.memory.description') }}
					</N8nText>
				</div>
				<div v-if="memoryFacts.length === 0" :class="$style.memoryEmpty">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.chatHub.memory.empty') }}
					</N8nText>
				</div>
				<ul v-else :class="$style.memoryList">
					<li v-for="(fact, index) in memoryFacts" :key="index" :class="$style.memoryRow">
						<N8nText size="small" :class="$style.memoryFact">{{ fact }}</N8nText>
						<N8nIconButton
							v-if="!disabled"
							icon="trash"
							type="tertiary"
							size="mini"
							:title="i18n.baseText('settings.chatHub.memory.delete.tooltip')"
							@click="onDeleteMemoryFact(index)"
						/>
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--2xl);
}

.title {
	margin-bottom: var(--spacing--sm);
}

.memorySection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.memorySectionHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.memoryEmpty {
	padding: var(--spacing--sm) 0;
}

.memoryList {
	list-style: none;
	padding: 0;
	margin: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.memoryRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.memoryFact {
	flex: 1;
	min-width: 0;
	overflow-wrap: break-word;
}
</style>
