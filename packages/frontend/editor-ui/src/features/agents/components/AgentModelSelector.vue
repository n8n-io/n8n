<script setup lang="ts">
import { computed, watch } from 'vue';
import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatModelDto,
	ChatModelsResponse,
} from '@n8n/api-types';

import { useUsersStore } from '@/features/settings/users/users.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import {
	AGENT_UNSUPPORTED_PROVIDERS,
	CATALOG_TO_CHATHUB,
	CHATHUB_TO_CATALOG,
} from '../provider-mapping';
import { parseModelString, sanitizeModelId } from '../utils/model-string';

const props = withDefaults(
	defineProps<{
		model: string | null | undefined;
		defaultModel?: string | null | undefined;
		includeCustomAgents?: boolean;
		warnMissingCredentials?: boolean;
		horizontal?: boolean;
	}>(),
	{
		defaultModel: null,
		includeCustomAgents: false,
		warnMissingCredentials: true,
		horizontal: true,
	},
);

const emit = defineEmits<{
	change: [selection: { model: string; credentialId: string | null; provider: ChatHubProvider }];
	selectCredential: [provider: ChatHubProvider, credentialId: string | null];
}>();

const usersStore = useUsersStore();
const chatStore = useChatStore();
const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) void chatStore.fetchAgents(credentials);
	},
	{ immediate: true },
);

const filteredAgents = computed<ChatModelsResponse>(
	() =>
		Object.fromEntries(
			Object.entries(chatStore.agents).filter(
				([provider]) => !AGENT_UNSUPPORTED_PROVIDERS.has(provider),
			),
		) as ChatModelsResponse,
);

const selectedAgent = computed<ChatModelDto | null>(() => {
	const model = props.model || props.defaultModel;
	if (!model) return null;

	const parsed = parseModelString(model);
	if (!parsed) return null;

	const chatHubProvider = CATALOG_TO_CHATHUB[parsed.provider];
	if (!chatHubProvider) return null;

	const registryEntry = filteredAgents.value[chatHubProvider]?.models.find(
		(entry) => isLlmProviderModel(entry.model) && entry.model.model === parsed.name,
	);
	if (registryEntry) return registryEntry;

	return {
		model: { provider: chatHubProvider, model: parsed.name } as ChatHubConversationModel,
		name: parsed.name,
		description: null,
		icon: null,
		updatedAt: null,
		createdAt: null,
		metadata: {} as ChatModelDto['metadata'],
		groupName: null,
		groupIcon: null,
	};
});

function onModelChange(selection: ChatHubConversationModel) {
	if (!isLlmProviderModel(selection)) return;

	const catalogProvider = CHATHUB_TO_CATALOG[selection.provider] ?? selection.provider;
	const model = `${catalogProvider}/${sanitizeModelId(catalogProvider, selection.model)}`;
	emit('change', {
		model,
		credentialId: credentialsByProvider.value?.[selection.provider] ?? null,
		provider: selection.provider,
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
	emit('selectCredential', provider, credentialId);
}
</script>

<template>
	<ModelSelector
		:selected-agent="selectedAgent"
		:include-custom-agents="includeCustomAgents"
		:credentials="credentialsByProvider"
		:agents="filteredAgents"
		:is-loading="false"
		:warn-missing-credentials="warnMissingCredentials"
		:horizontal="horizontal"
		@change="onModelChange"
		@select-credential="onSelectCredential"
	/>
</template>
