<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import {
	chatHubLLMProviderSchema,
	chatHubVectorStoreProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	VECTOR_STORE_PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
	type ChatHubSemanticSearchSettings,
	type ChatHubVectorStoreProvider,
} from '@n8n/api-types';
import { N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { useChatStore } from './chat.store';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/app/stores/settings.store';
import { updateSemanticSearchSettingsApi } from './chat.api';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { providerDisplayNames, vectorStoreProviderDisplayNames } from './constants';
import { DEFAULT_SEMANTIC_SEARCH_SETTINGS, EMBEDDINGS_NODE_TYPE_MAP } from '@n8n/chat-hub';
import { deepCopy } from 'n8n-workflow';

const i18n = useI18n();
const message = useMessage();
const rootStore = useRootStore();
const chatStore = useChatStore();
const toast = useToast();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

const { semanticSearchReadiness } = storeToRefs(chatStore);

const settings = ref<ChatHubSemanticSearchSettings>(deepCopy(DEFAULT_SEMANTIC_SEARCH_SETTINGS));

function trackSettingsUpdate(newSettings: ChatHubSemanticSearchSettings) {
	const vsCredEntered = !!newSettings.vectorStore.credentialId;
	const emCredEntered = !!newSettings.embeddingModel.credentialId;

	telemetry.track('User updated semantic search settings', {
		vector_store_provider: newSettings.vectorStore.provider,
		embedding_provider: newSettings.embeddingModel.provider,
		vector_store_credential_entered: vsCredEntered,
		embedding_credential_entered: emCredEntered,
		vector_store_credential_shared:
			vsCredEntered && semanticSearchReadiness.value.vectorStoreIssue !== 'notShared',
		embedding_credential_shared:
			emCredEntered && semanticSearchReadiness.value.embeddingIssue !== 'notShared',
	});
}

const vectorStoreCredentialType = computed(() => {
	const provider = settings.value.vectorStore.provider;

	return provider ? VECTOR_STORE_PROVIDER_CREDENTIAL_TYPE_MAP[provider] : undefined;
});

const embeddingProviderOptions = computed(() =>
	chatHubLLMProviderSchema.options.filter((provider) => provider in EMBEDDINGS_NODE_TYPE_MAP),
);

const vectorStoreTooltip = computed(() => {
	const issue = semanticSearchReadiness.value.vectorStoreIssue;
	if (!issue) return '';
	if (issue === 'unspecified' || issue === 'notFound') {
		return i18n.baseText('settings.chatHub.vectorStore.missing');
	}
	return i18n.baseText('settings.chatHub.vectorStore.notShared');
});

const embeddingTooltip = computed(() => {
	const issue = semanticSearchReadiness.value.embeddingIssue;
	if (!issue) return '';
	if (issue === 'unspecified' || issue === 'notFound') {
		return i18n.baseText('settings.chatHub.embeddingModel.missing');
	}
	return i18n.baseText('settings.chatHub.embeddingModel.notShared');
});

async function onVectorStoreProviderChange(provider: ChatHubVectorStoreProvider) {
	if (provider === settings.value.vectorStore.provider) {
		return;
	}

	if (settings.value.vectorStore.credentialId) {
		// show confirmation if already fully set-up
		const confirmed = await message.confirm(
			i18n.baseText('settings.chatHub.vectorStore.changeProvider.confirm.message'),
			i18n.baseText('settings.chatHub.vectorStore.changeProvider.confirm.title'),
			{
				confirmButtonText: i18n.baseText(
					'settings.chatHub.vectorStore.changeProvider.confirm.button',
				),
				cancelButtonText: i18n.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (confirmed !== 'confirm') {
			return;
		}
	}

	const newSettings: ChatHubSemanticSearchSettings = {
		...settings.value,
		vectorStore: { provider, credentialId: null },
	};
	try {
		await updateSemanticSearchSettingsApi(rootStore.restApiContext, newSettings);
		await settingsStore.getModuleSettings();
		trackSettingsUpdate(newSettings);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.chatHub.semanticSearch.save.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.vectorStore.save.error'));
	}
}

async function onVectorStoreCredentialSelected(credentialId: string | null) {
	if (credentialId === settings.value.vectorStore.credentialId) {
		return;
	}

	const newSettings: ChatHubSemanticSearchSettings = {
		...settings.value,
		vectorStore: { ...settings.value.vectorStore, credentialId },
	};
	try {
		await updateSemanticSearchSettingsApi(rootStore.restApiContext, newSettings);
		await settingsStore.getModuleSettings();
		trackSettingsUpdate(newSettings);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.chatHub.semanticSearch.save.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.vectorStore.save.error'));
	}
}

async function onEmbeddingModelProviderChange(provider: ChatHubLLMProvider) {
	if (provider === settings.value.embeddingModel.provider) {
		return;
	}

	if (settings.value.embeddingModel.credentialId) {
		// show confirmation if already fully set-up
		const confirmed = await message.confirm(
			i18n.baseText('settings.chatHub.embeddingModel.changeProvider.confirm.message'),
			i18n.baseText('settings.chatHub.embeddingModel.changeProvider.confirm.title'),
			{
				confirmButtonText: i18n.baseText(
					'settings.chatHub.embeddingModel.changeProvider.confirm.button',
				),
				cancelButtonText: i18n.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (confirmed !== 'confirm') {
			return;
		}
	}

	const newSettings: ChatHubSemanticSearchSettings = {
		...settings.value,
		embeddingModel: { provider, credentialId: null },
	};
	try {
		await updateSemanticSearchSettingsApi(rootStore.restApiContext, newSettings);
		await settingsStore.getModuleSettings();
		trackSettingsUpdate(newSettings);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.chatHub.semanticSearch.save.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.embeddingModel.save.error'));
	}
}

async function onEmbeddingCredentialSelected(credentialId: string | null) {
	if (credentialId === settings.value.embeddingModel.credentialId) {
		return;
	}

	const newSettings: ChatHubSemanticSearchSettings = {
		...settings.value,
		embeddingModel: { ...settings.value.embeddingModel, credentialId },
	};
	try {
		await updateSemanticSearchSettingsApi(rootStore.restApiContext, newSettings);
		await settingsStore.getModuleSettings();
		trackSettingsUpdate(newSettings);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.chatHub.semanticSearch.save.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.chatHub.embeddingModel.save.error'));
	}
}

watch(
	() => settingsStore.moduleSettings['chat-hub']?.semanticSearch,
	(newType) => {
		settings.value = newType ?? deepCopy(DEFAULT_SEMANTIC_SEARCH_SETTINGS);
	},
	{ immediate: true },
);
</script>
<template>
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
							<N8nIcon icon="triangle-alert" :class="$style.iconWarning" size="large" />
						</N8nTooltip>
						<N8nIcon v-else icon="check" :class="$style.iconReady" size="large" />
					</div>
					<N8nText color="text-light" size="small" tag="span" :class="$style.rowDescription">
						{{ i18n.baseText('settings.chatHub.vectorStore.description') }}
					</N8nText>
				</div>
				<div :class="$style.rowControls">
					<div :class="$style.labeledControl">
						<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
							{{ i18n.baseText('settings.chatHub.label.provider') }}
						</N8nText>
						<N8nSelect
							:model-value="
								settings.vectorStore.provider ?? chatHubVectorStoreProviderSchema.options[0]
							"
							size="small"
							@update:model-value="onVectorStoreProviderChange"
						>
							<N8nOption
								v-for="option in chatHubVectorStoreProviderSchema.options"
								:key="option"
								:value="option"
								:label="vectorStoreProviderDisplayNames[option]"
							/>
						</N8nSelect>
					</div>
					<div :class="$style.labeledControl">
						<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
							{{ i18n.baseText('settings.chatHub.label.credential') }}
						</N8nText>
						<CredentialPicker
							:class="$style.credentialPicker"
							app-name=""
							:credential-type="vectorStoreCredentialType ?? ''"
							:selected-credential-id="settings.vectorStore.credentialId"
							create-button-variant="subtle"
							@credential-selected="onVectorStoreCredentialSelected"
							@credential-deleted="onVectorStoreCredentialSelected(null)"
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
						<N8nTooltip v-if="semanticSearchReadiness.embeddingIssue" :content="embeddingTooltip">
							<N8nIcon icon="triangle-alert" :class="$style.iconWarning" size="large" />
						</N8nTooltip>
						<N8nIcon v-else icon="check" :class="$style.iconReady" size="large" />
					</div>
					<N8nText color="text-light" size="small" tag="span" :class="$style.rowDescription">
						{{ i18n.baseText('settings.chatHub.embeddingModel.description') }}
					</N8nText>
				</div>
				<div :class="$style.rowControls">
					<div :class="$style.labeledControl">
						<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
							{{ i18n.baseText('settings.chatHub.label.provider') }}
						</N8nText>
						<N8nSelect
							:model-value="settings.embeddingModel.provider ?? embeddingProviderOptions[0]"
							size="small"
							:class="$style.typeSelect"
							@update:model-value="onEmbeddingModelProviderChange"
						>
							<N8nOption
								v-for="option in embeddingProviderOptions"
								:key="option"
								:value="option"
								:label="providerDisplayNames[option]"
							/>
						</N8nSelect>
					</div>
					<div :class="$style.labeledControl">
						<N8nText size="small" color="text-light" tag="span" :class="$style.controlLabel">
							{{ i18n.baseText('settings.chatHub.label.credential') }}
						</N8nText>
						<CredentialPicker
							:class="$style.credentialPicker"
							app-name=""
							:credential-type="
								settings.embeddingModel.provider
									? PROVIDER_CREDENTIAL_TYPE_MAP[settings.embeddingModel.provider]
									: ''
							"
							:selected-credential-id="settings.embeddingModel.credentialId"
							create-button-variant="subtle"
							@credential-selected="onEmbeddingCredentialSelected"
							@credential-deleted="onEmbeddingCredentialSelected(null)"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
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
	border-radius: var(--radius);
	overflow: hidden;
}

.semanticSearchRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
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
