<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { N8nAiModelSelectorDropdown } from '@n8n/design-system';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import type {
	ChatHubProvider,
	ChatHubLLMProvider,
	ChatModelDto,
	ChatHubConversationModel,
	ChatModelsResponse,
} from '@n8n/api-types';
import {
	CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	NEW_AGENT_MENU_ID,
	providerDisplayNames,
} from '@/features/ai/chatHub/constants';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import {
	flattenModel,
	fromStringToModel,
	isLlmProviderModel,
} from '@/features/ai/chatHub/chat.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ChatProviderAvatar from './ChatProviderAvatar.vue';
import { applySearch, buildModelSelectorMenuItems } from '../model-selector.utils';

const {
	selectedAgent,
	includeCustomAgents = true,
	credentials,
	showBorder = true,
	warnMissingCredentials = false,
	agents,
	isLoading,
} = defineProps<{
	selectedAgent: ChatModelDto | null;
	includeCustomAgents?: boolean;
	credentials: CredentialsMap | null;
	showBorder?: boolean;
	warnMissingCredentials?: boolean;
	agents: ChatModelsResponse;
	isLoading: boolean;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	createCustomAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string | null];
}>();

function handleSelectCredentials(provider: ChatHubProvider, id: string | null) {
	emit('selectCredential', provider, id);
}

function handleSelectModelById(provider: ChatHubLLMProvider, modelId: string) {
	emit('change', { provider, model: modelId });
}

const i18n = useI18n();
const dropdownRef = useTemplateRef('dropdownRef');
const uiStore = useUIStore();
const settingStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const projectStore = useProjectsStore();
const telemetry = useTelemetry();

const searchQuery = ref('');

const credentialsName = computed(() =>
	selectedAgent
		? credentialsStore.getCredentialById(credentials?.[selectedAgent.model.provider] ?? '')?.name
		: undefined,
);

const isCredentialsRequired = computed(() => isLlmProviderModel(selectedAgent?.model));
const isCredentialsMissing = computed(
	() =>
		warnMissingCredentials &&
		isCredentialsRequired.value &&
		selectedAgent?.model.provider &&
		!credentials?.[selectedAgent?.model.provider],
);

const menu = computed(() =>
	buildModelSelectorMenuItems(agents, {
		includeCustomAgents,
		isLoading,
		i18n,
		settings: settingStore.moduleSettings?.['chat-hub']?.providers ?? {},
		credentials,
	}),
);

const filteredMenu = computed(() => applySearch(menu.value, searchQuery.value, i18n));

const selectedLabel = computed(
	() => selectedAgent?.name ?? i18n.baseText('chatHub.models.selector.defaultLabel'),
);

const canCreateCredentials = computed(() => {
	return getResourcePermissions(projectStore.personalProject?.scopes).credential.create;
});

function openCredentialsSelectorOrCreate(provider: ChatHubLLMProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0 && canCreateCredentials.value) {
		uiStore.openNewCredential(credentialType);
		return;
	}

	uiStore.openModalWithData({
		name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
		data: {
			credentialType,
			displayName: providerDisplayNames[provider],
			initialValue: credentials?.[provider] ?? null,
			onSelect: (credentialId: string | null) => handleSelectCredentials(provider, credentialId),
		},
	});
}

function openModelByIdSelector(provider: ChatHubLLMProvider) {
	uiStore.openModalWithData({
		name: CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
		data: {
			provider,
			initialValue: null,
			onSelect: handleSelectModelById,
		},
	});
}

function onSelect(id: string) {
	if (id === NEW_AGENT_MENU_ID) {
		emit('createCustomAgent');
		return;
	}

	const [, identifier] = id.split('::');
	const parsedModel = fromStringToModel(id);

	if (!parsedModel) {
		return;
	}

	if (identifier === 'configure' && isLlmProviderModel(parsedModel)) {
		openCredentialsSelectorOrCreate(parsedModel.provider);
		return;
	}

	if (identifier === 'add-model' && isLlmProviderModel(parsedModel)) {
		openModelByIdSelector(parsedModel.provider);
		return;
	}

	telemetry.track('User selected model or agent', {
		...flattenModel(parsedModel),
		is_custom: parsedModel.provider === 'custom-agent',
	});

	emit('change', parsedModel);
}

function handleSearch(query: string) {
	searchQuery.value = query.toLowerCase();
}

defineExpose({
	open: () => dropdownRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		openCredentialsSelectorOrCreate(provider),
});
</script>

<template>
	<N8nAiModelSelectorDropdown
		ref="dropdownRef"
		:items="filteredMenu"
		:selected-label="selectedLabel"
		:selected-credential-name="credentialsName"
		:credentials-missing="isCredentialsMissing"
		:no-match-label="i18n.baseText('chatHub.models.selector.noMatch')"
		:show-border="showBorder"
		data-test-id="chat-model-selector"
		credential-data-test-id="chat-model-selector-credential"
		@search="handleSearch"
		@select="onSelect"
	>
		<template #trigger-leading="{ ui }">
			<ChatAgentAvatar
				:agent="selectedAgent"
				:size="credentialsName || !isCredentialsRequired ? 'md' : 'sm'"
				:class="ui.class"
			/>
		</template>

		<template #item-leading="{ item, ui }">
			<ChatProviderAvatar
				v-if="item.data?.provider"
				:provider="item.data?.provider"
				:icon="item.icon"
				:class="ui.class"
			/>
		</template>
	</N8nAiModelSelectorDropdown>
</template>
