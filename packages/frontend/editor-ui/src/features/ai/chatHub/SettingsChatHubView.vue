<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from './chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { CHAT_PROVIDER_SETTINGS_MODAL_KEY } from './constants';
import ChatProvidersTable from './components/ChatProvidersTable.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import {
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { EMBEDDINGS_NODE_TYPE_MAP } from '@n8n/chat-hub';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { updateVectorStoreCredentialApi, updateEmbeddingCredentialApi } from './chat.api';
import { providerDisplayNames } from './constants';

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

const EMBEDDING_PROVIDER_OPTIONS = (
	Object.entries(PROVIDER_CREDENTIAL_TYPE_MAP) as Array<[ChatHubLLMProvider, string]>
)
	.filter(([provider]) => provider in EMBEDDINGS_NODE_TYPE_MAP)
	.map(([provider, credentialType]) => ({
		label: providerDisplayNames[provider],
		value: credentialType,
	}));

const { vectorStoreCredentialId, embeddingCredentialId, semanticSearchReadiness } =
	storeToRefs(chatStore);

const localEmbeddingType = ref<string | null>(
	settingsStore.moduleSettings['chat-hub']?.embeddingCredential?.type ??
		EMBEDDING_PROVIDER_OPTIONS[0]?.value ??
		null,
);

const localEmbeddingDisplayName = computed(
	() => EMBEDDING_PROVIDER_OPTIONS.find((o) => o.value === localEmbeddingType.value)?.label ?? '',
);

watch(
	() => settingsStore.moduleSettings['chat-hub']?.embeddingCredential?.type,
	(newType) => {
		localEmbeddingType.value = newType ?? EMBEDDING_PROVIDER_OPTIONS[0]?.value ?? null;
	},
);

const vectorStoreTooltip = computed(() => {
	const issue = semanticSearchReadiness.value.vectorStoreIssue;
	if (!issue) return '';
	if (issue === 'unspecified' || issue === 'notFound') {
		return disabled.value
			? i18n.baseText('settings.chatHub.vectorStore.missing.noAccess')
			: i18n.baseText('settings.chatHub.vectorStore.missing');
	}
	return disabled.value
		? i18n.baseText('settings.chatHub.vectorStore.notShared.noAccess')
		: i18n.baseText('settings.chatHub.vectorStore.notShared');
});

const embeddingTooltip = computed(() => {
	const issue = semanticSearchReadiness.value.embeddingIssue;
	if (!issue) return '';
	if (issue === 'unspecified' || issue === 'notFound') {
		return disabled.value
			? i18n.baseText('settings.chatHub.embeddingModel.missing.noAccess')
			: i18n.baseText('settings.chatHub.embeddingModel.missing');
	}
	return disabled.value
		? i18n.baseText('settings.chatHub.embeddingModel.notShared.noAccess')
		: i18n.baseText('settings.chatHub.embeddingModel.notShared');
});

async function onVectorStoreCredentialSelected(credentialId: string) {
	try {
		await updateVectorStoreCredentialApi(rootStore.restApiContext, credentialId);
		await settingsStore.getModuleSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.vectorStore.save.error'));
	}
}

async function onEmbeddingTypeChange(credentialType: string) {
	localEmbeddingType.value = credentialType;
	const currentType = settingsStore.moduleSettings['chat-hub']?.embeddingCredential?.type;
	if (currentType !== credentialType) {
		try {
			await updateEmbeddingCredentialApi(rootStore.restApiContext, null, credentialType);
			await settingsStore.getModuleSettings();
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.chatHub.embeddingModel.save.error'));
		}
	}
}

async function onEmbeddingCredentialSelected(credentialId: string) {
	if (!localEmbeddingType.value) return;
	try {
		await updateEmbeddingCredentialApi(
			rootStore.restApiContext,
			credentialId,
			localEmbeddingType.value,
		);
		await settingsStore.getModuleSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.embeddingModel.save.error'));
	}
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
			<div :class="$style.section">
				<N8nHeading size="medium" :bold="true" :class="$style.sectionTitle">
					{{ i18n.baseText('settings.chatHub.semanticSearch.title') }}
				</N8nHeading>
				<div :class="$style.semanticSearchCard">
					<div :class="$style.semanticSearchRow">
						<div :class="$style.rowInfo">
							<div :class="$style.rowLabelRow">
								<N8nText :bold="true" tag="span" :class="$style.rowLabel">
									{{ i18n.baseText('settings.chatHub.vectorStore.title') }}
								</N8nText>
								<N8nTooltip
									v-if="semanticSearchReadiness.vectorStoreIssue"
									:content="vectorStoreTooltip"
								>
									<N8nIcon icon="exclamation-triangle" :class="$style.iconWarning" size="large" />
								</N8nTooltip>
								<N8nIcon v-else icon="check" :class="$style.iconReady" size="large" />
							</div>
							<N8nText color="text-light" tag="span" :class="$style.rowDescription">
								{{ i18n.baseText('settings.chatHub.vectorStore.description') }}
							</N8nText>
						</div>
						<div :class="[$style.rowControls, disabled && $style.rowControlsDisabled]">
							<div :class="$style.labeledControl">
								<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
									{{ i18n.baseText('settings.chatHub.label.provider') }}
								</N8nText>
								<N8nSelect
									model-value="vectorStorePGVectorScopedApi"
									size="small"
									:disabled="true"
									:class="$style.typeSelect"
								>
									<N8nOption value="vectorStorePGVectorScopedApi" label="PGVector" />
								</N8nSelect>
							</div>
							<div :class="$style.labeledControl">
								<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
									{{ i18n.baseText('settings.chatHub.label.credential') }}
								</N8nText>
								<CredentialPicker
									:class="$style.credentialPicker"
									app-name="PGVector"
									:credential-type="VECTOR_STORE_CREDENTIAL_TYPE"
									:selected-credential-id="vectorStoreCredentialId"
									create-button-variant="subtle"
									@credential-selected="onVectorStoreCredentialSelected"
									@credential-deselected="onVectorStoreCredentialDeselected"
								/>
							</div>
						</div>
					</div>
					<div :class="[$style.semanticSearchRow, $style.semanticSearchRowBordered]">
						<div :class="$style.rowInfo">
							<div :class="$style.rowLabelRow">
								<N8nText :bold="true" tag="span" :class="$style.rowLabel">
									{{ i18n.baseText('settings.chatHub.embeddingModel.title') }}
								</N8nText>
								<N8nTooltip
									v-if="semanticSearchReadiness.embeddingIssue"
									:content="embeddingTooltip"
								>
									<N8nIcon icon="exclamation-triangle" :class="$style.iconWarning" size="large" />
								</N8nTooltip>
								<N8nIcon v-else icon="check" :class="$style.iconReady" size="large" />
							</div>
							<N8nText color="text-light" tag="span" :class="$style.rowDescription">
								{{ i18n.baseText('settings.chatHub.embeddingModel.description') }}
							</N8nText>
						</div>
						<div :class="[$style.rowControls, disabled && $style.rowControlsDisabled]">
							<div :class="$style.labeledControl">
								<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
									{{ i18n.baseText('settings.chatHub.label.provider') }}
								</N8nText>
								<N8nSelect
									:model-value="localEmbeddingType"
									size="small"
									:disabled="disabled"
									:class="$style.typeSelect"
									@update:model-value="onEmbeddingTypeChange"
								>
									<N8nOption
										v-for="option in EMBEDDING_PROVIDER_OPTIONS"
										:key="option.value"
										:value="option.value"
										:label="option.label"
									/>
								</N8nSelect>
							</div>
							<div :class="$style.labeledControl">
								<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
									{{ i18n.baseText('settings.chatHub.label.credential') }}
								</N8nText>
								<CredentialPicker
									v-if="localEmbeddingType"
									:class="$style.credentialPicker"
									:app-name="localEmbeddingDisplayName"
									:credential-type="localEmbeddingType"
									:selected-credential-id="embeddingCredentialId"
									create-button-variant="subtle"
									@credential-selected="onEmbeddingCredentialSelected"
									@credential-deselected="onEmbeddingCredentialDeselected"
								/>
							</div>
						</div>
					</div>
				</div>
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

.semanticSearchCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.semanticSearchRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
}

.semanticSearchRowBordered {
	border-top: var(--border);
}

.rowInfo {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.rowLabelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.rowLabel {
	display: block;
}

.rowDescription {
	display: block;
}

.rowControls {
	display: flex;
	gap: var(--spacing--sm);
	flex-shrink: 0;
	align-items: flex-end;
}

.rowControlsDisabled {
	pointer-events: none;
	opacity: 0.6;
}

.labeledControl {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.controlLabel {
	display: block;
}

.credentialPicker {
	width: 300px;
}

.iconReady {
	color: var(--color--success);
}

.iconWarning {
	color: var(--color--warning);
}
</style>
