<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AiModelSelectorDropdown from '@/features/ai/modelSelector/AiModelSelectorDropdown.vue';
import type {
	AiModelSelectorMenuItem,
	AiModelSelectorMenuItemData,
} from '@/features/ai/modelSelector/types';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { AGENT_MODEL_PROVIDER_DEFINITIONS } from '../model-providers';
import {
	AGENT_EMBEDDING_PROVIDERS,
	getEmbeddingModelProvider,
	getEmbeddingModelsForProvider,
	type AgentEmbeddingProvider,
} from '../vector-stores';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

const MAX_SELECTED_NAME_CHARS = 30;

type MenuItemData = AiModelSelectorMenuItemData & {
	credentialType?: string;
	leadingIcon?: 'settings';
};
type MenuItem = AiModelSelectorMenuItem<MenuItemData>;

const {
	selectedModel,
	selectedCredentialId,
	credentialsByType,
	canCreateCredentials = false,
	disabled = false,
} = defineProps<{
	selectedModel: string;
	selectedCredentialId: string | null;
	credentialsByType: Record<string, AgentCredentialOption[]>;
	canCreateCredentials?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:selectedModel': [model: string];
	'update:selectedCredentialId': [credentialId: string];
	'create-credential': [credentialType: string];
}>();

const i18n = useI18n();

/** Only the model's own name, without the "provider/" prefix. */
function modelShortName(model: string): string {
	return model.split('/').slice(1).join('/');
}

function credentialTypeFor(provider: AgentEmbeddingProvider): string {
	return AGENT_MODEL_PROVIDER_DEFINITIONS[provider].credentialTypes[0];
}

const selectedProvider = computed(() => getEmbeddingModelProvider(selectedModel));

const selectedCredential = computed(() => {
	if (!selectedCredentialId) return null;
	const credentialType = credentialTypeFor(selectedProvider.value);
	return (
		(credentialsByType[credentialType] ?? []).find(
			(credential) => credential.id === selectedCredentialId,
		) ?? null
	);
});

const selectedLabel = computed(() => modelShortName(selectedModel));
const selectedCredentialName = computed(() => selectedCredential.value?.name);
const credentialsMissing = computed(() => !selectedCredentialId);

function modelItemId(provider: AgentEmbeddingProvider, model: string): string {
	return `${provider}::model::${encodeURIComponent(model)}`;
}
function credentialItemId(provider: AgentEmbeddingProvider, credentialId: string): string {
	return `${provider}::credential::${encodeURIComponent(credentialId)}`;
}
function configureItemId(provider: AgentEmbeddingProvider, credentialType: string): string {
	return `${provider}::configure::${encodeURIComponent(credentialType)}`;
}

function providerToMenuItem(provider: AgentEmbeddingProvider): MenuItem {
	const definition = AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
	const credentialType = credentialTypeFor(provider);
	const credentialOptions = credentialsByType[credentialType] ?? [];
	const isSelectedProvider = provider === selectedProvider.value;

	const credentialItems: MenuItem[] = credentialOptions.map((credential) => ({
		id: credentialItemId(provider, credential.id),
		label: credential.name,
		checked: isSelectedProvider && credential.id === selectedCredentialId,
		data: { credentialType },
	}));

	const configureItems: MenuItem[] = canCreateCredentials
		? [
				{
					id: configureItemId(provider, credentialType),
					label: i18n.baseText('agents.modelSelector.configureCredentials'),
					data: { leadingIcon: 'settings' },
				},
			]
		: [];

	const modelItems: MenuItem[] = getEmbeddingModelsForProvider(provider).map((option, index) => ({
		id: modelItemId(provider, option.model),
		label: modelShortName(option.model),
		checked: option.model === selectedModel,
		divided: index === 0,
		data: {
			credentialType,
			description: i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.dimensions', {
				interpolate: { dimensions: String(option.dimensions) },
			}),
			descriptionTooltipTeleported: false,
		},
	}));

	return {
		id: provider,
		label: definition.displayName,
		data: { credentialType },
		children: [...credentialItems, ...configureItems, ...modelItems],
	};
}

const menu = computed<MenuItem[]>(() =>
	AGENT_EMBEDDING_PROVIDERS.map((provider, index) => ({
		...providerToMenuItem(provider),
		divided: index > 0,
	})),
);

function onSelect(id: string) {
	if (disabled) return;

	const [providerId, action, rawValue] = id.split('::');
	if (!rawValue) return;
	const provider = providerId as AgentEmbeddingProvider;
	const value = decodeURIComponent(rawValue);

	if (action === 'credential') {
		emit('update:selectedCredentialId', value);
		if (provider !== selectedProvider.value) {
			const [firstModel] = getEmbeddingModelsForProvider(provider);
			if (firstModel) emit('update:selectedModel', firstModel.model);
		}
		return;
	}

	if (action === 'configure') {
		emit('create-credential', value);
		return;
	}

	if (action === 'model') {
		emit('update:selectedModel', value);
	}
}
</script>

<template>
	<AiModelSelectorDropdown
		:items="menu"
		:selected-label="selectedLabel"
		:selected-credential-name="selectedCredentialName"
		:credentials-missing="credentialsMissing"
		:credentials-missing-label="i18n.baseText('agents.modelSelector.credentialsMissing')"
		:no-match-label="i18n.baseText('agents.modelSelector.noMatch')"
		:disabled="disabled"
		data-test-id="agent-embedding-model-selector"
		credential-data-test-id="agent-embedding-model-selector-credential"
		:max-selected-name-chars="MAX_SELECTED_NAME_CHARS"
		@select="onSelect"
	>
		<template #trigger-leading="{ ui }">
			<CredentialIcon
				:credential-type-name="credentialTypeFor(selectedProvider)"
				:size="18"
				:class="ui.class"
			/>
		</template>

		<template #item-leading="{ item, ui }">
			<N8nIcon v-if="item.data?.leadingIcon" icon="settings" size="large" :class="ui.class" />
			<CredentialIcon
				v-else-if="item.data?.credentialType"
				:credential-type-name="item.data.credentialType"
				:size="16"
				:class="ui.class"
			/>
		</template>
	</AiModelSelectorDropdown>
</template>
