<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { N8nAiModelSelectorDropdown, type AiModelSelectorMenuItem } from '@n8n/design-system';

import ModelSelectorTriggerIcon from './model-selector/ModelSelectorTriggerIcon.vue';
import ModelSelectorItemLeadingIcon from './model-selector/ModelSelectorItemLeadingIcon.vue';
import { MAX_MODEL_NAME_CHARS, useAiModelSelectorMenu } from './model-selector/search';
import { buildMenuItemId, parseMenuItemId } from './model-selector/menuItemId';
import { AGENT_MODEL_PROVIDER_DEFINITIONS, getProviderCredentialTypes } from '../model-providers';
import {
	AGENT_EMBEDDING_PROVIDERS,
	getEmbeddingModelProvider,
	getEmbeddingModelsForProvider,
	isAgentEmbeddingProvider,
	type AgentEmbeddingProvider,
} from '../vector-stores';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

type MenuItem = AiModelSelectorMenuItem;

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
	return getProviderCredentialTypes(provider)[0];
}

const selectedProvider = computed<AgentEmbeddingProvider | null>(() =>
	selectedModel ? getEmbeddingModelProvider(selectedModel) : null,
);

const selectedCredential = computed(() => {
	if (!selectedCredentialId || !selectedProvider.value) return null;
	const credentialType = credentialTypeFor(selectedProvider.value);
	return (
		(credentialsByType[credentialType] ?? []).find(
			(credential) => credential.id === selectedCredentialId,
		) ?? null
	);
});

const selectedLabel = computed(() =>
	selectedModel
		? modelShortName(selectedModel)
		: i18n.baseText('agents.modelSelector.defaultLabel'),
);
const selectedCredentialName = computed(() => selectedCredential.value?.name);
const credentialsMissing = computed(
	() => Boolean(selectedProvider.value) && !selectedCredential.value,
);
const triggerCredentialTypeName = computed(() =>
	selectedProvider.value ? credentialTypeFor(selectedProvider.value) : null,
);

function providerToMenuItem(provider: AgentEmbeddingProvider): MenuItem {
	const credentialType = credentialTypeFor(provider);
	const credentialOptions = credentialsByType[credentialType] ?? [];
	const isSelectedProvider = provider === selectedProvider.value;
	const hasProviderCredential = credentialOptions.length > 0;

	const configureItems: MenuItem[] = canCreateCredentials
		? [
				{
					id: buildMenuItemId(provider, 'configure', credentialType),
					label: i18n.baseText('agents.modelSelector.configureCredentials'),
					data: { leadingIcon: 'settings' },
				},
			]
		: [];

	const credentialItems: MenuItem[] = credentialOptions.map((credential) => ({
		id: buildMenuItemId(provider, 'credential', credential.id),
		label: credential.name,
		checked: isSelectedProvider && credential.id === selectedCredentialId,
		data: { credentialType },
	}));

	const modelItems: MenuItem[] = hasProviderCredential
		? getEmbeddingModelsForProvider(provider).map((option, index) => ({
				id: buildMenuItemId(provider, 'model', option.model),
				label: truncateBeforeLast(modelShortName(option.model), MAX_MODEL_NAME_CHARS),
				divided: index === 0,
				data: {
					credentialType,
					fullName: option.model,
					description: i18n.baseText(
						'agents.builder.vectorStores.modal.embeddingModel.dimensions',
						{ interpolate: { dimensions: String(option.dimensions) } },
					),
					descriptionTooltipTeleported: true,
				},
			}))
		: [];

	return {
		id: provider,
		label: AGENT_MODEL_PROVIDER_DEFINITIONS[provider].displayName,
		data: { credentialType },
		children: [...configureItems, ...credentialItems, ...modelItems],
	};
}

const menu = computed<MenuItem[]>(() =>
	AGENT_EMBEDDING_PROVIDERS.map((provider, index) => ({
		...providerToMenuItem(provider),
		...(index === 0 ? { divided: true } : {}),
	})),
);

const { filteredMenu, handleSearch } = useAiModelSelectorMenu(menu, () => disabled);

function onSelect(id: string) {
	if (disabled) return;

	const parsed = parseMenuItemId(id);
	if (!parsed) return;
	const { action, value } = parsed;

	if (action === 'configure') {
		emit('create-credential', value);
		return;
	}

	if (!isAgentEmbeddingProvider(parsed.provider)) return;
	const provider = parsed.provider;

	if (action === 'credential') {
		emit('update:selectedCredentialId', value);
		if (provider !== selectedProvider.value) {
			const [firstModel] = getEmbeddingModelsForProvider(provider);
			if (firstModel) emit('update:selectedModel', firstModel.model);
		}
		return;
	}

	if (action === 'model') {
		emit('update:selectedModel', value);
		const options = credentialsByType[credentialTypeFor(provider)] ?? [];
		const credentialValid = options.some((option) => option.id === selectedCredentialId);
		if (!credentialValid) {
			const [firstCredential] = options;
			if (firstCredential) emit('update:selectedCredentialId', firstCredential.id);
		}
	}
}
</script>

<template>
	<N8nAiModelSelectorDropdown
		:items="filteredMenu"
		:selected-label="selectedLabel"
		:selected-credential-name="selectedCredentialName"
		:credentials-missing="credentialsMissing"
		:credentials-missing-label="i18n.baseText('agents.modelSelector.credentialsMissing')"
		:no-match-label="i18n.baseText('agents.modelSelector.noMatch')"
		:disabled="disabled"
		data-test-id="agent-embedding-model-selector"
		credential-data-test-id="agent-embedding-model-selector-credential"
		@search="handleSearch"
		@select="onSelect"
	>
		<template #trigger-leading="{ ui }">
			<ModelSelectorTriggerIcon
				:credential-type-name="triggerCredentialTypeName"
				:class="ui.class"
			/>
		</template>

		<template #item-leading="{ item, ui }">
			<ModelSelectorItemLeadingIcon :item="item" :class="ui.class" />
		</template>
	</N8nAiModelSelectorDropdown>
</template>
