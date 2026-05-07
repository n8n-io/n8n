<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model (delegated to the
 * canonical ChatHub ModelSelector), and instructions. Credential selection is
 * handled inside the model picker — no separate credential field.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatModelDto,
	ChatModelsResponse,
} from '@n8n/api-types';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useUsersStore } from '@/features/settings/users/users.store';
import shared from '../styles/agent-panel.module.scss';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import AgentPanelHeader from './AgentPanelHeader.vue';

import type { AgentJsonConfig } from '../types';
import {
	CHATHUB_TO_CATALOG,
	CATALOG_TO_CHATHUB,
	AGENT_UNSUPPORTED_PROVIDERS,
} from '../provider-mapping';
import { parseModelString, modelToString, sanitizeModelId } from '../utils/model-string';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
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
	const modelStr = modelToString(props.config?.model);
	if (!modelStr) return null;
	const parsed = parseModelString(modelStr);
	if (!parsed) return null;
	const chatHubProvider = CATALOG_TO_CHATHUB[parsed.provider];
	if (!chatHubProvider) return null;

	const registryEntry = filteredAgents.value[chatHubProvider]?.models.find(
		(m) => isLlmProviderModel(m.model) && m.model.model === parsed.name,
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
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';
	emit('update:config', {
		model: `${catalogProvider}/${sanitizeModelId(catalogProvider, selection.model)}`,
		credential: credentialId,
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
	const parsed = parseModelString(modelToString(props.config?.model));
	const currentChatHubProvider = parsed ? CATALOG_TO_CHATHUB[parsed.provider] : undefined;
	if (currentChatHubProvider === provider) {
		emit('update:config', { credential: credentialId ?? '' });
	}
}

const instructions = ref(props.config?.instructions ?? '');

// Keep the local editor stable while external config updates arrive.
watch(
	() => props.config?.instructions ?? '',
	(value) => {
		if (value !== instructions.value) instructions.value = value;
	},
);

const emitInstructions = useDebounceFn(() => {
	emit('update:config', { instructions: instructions.value });
}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));

function onInstructionsInput(value: string) {
	instructions.value = value;
	void emitInstructions();
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-info-panel">
		<AgentPanelHeader
			v-if="!props.embedded"
			:title="i18n.baseText('agents.builder.agent.title')"
			:description="i18n.baseText('agents.builder.agent.description')"
		/>

		<div :class="[$style.field, props.disabled && shared.disabledOverlay]">
			<label :class="$style.label"
				><N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.agent.model.label')
				}}</N8nText></label
			>
			<ModelSelector
				:selected-agent="selectedAgent"
				:include-custom-agents="false"
				:credentials="credentialsByProvider"
				:agents="filteredAgents"
				:is-loading="false"
				:warn-missing-credentials="true"
				horizontal
				data-testid="agent-model-selector"
				@change="onModelChange"
				@select-credential="onSelectCredential"
			/>
		</div>

		<div :class="[$style.field, $style.instructionsField]">
			<label :class="$style.label">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.agent.instructions.label')
				}}</N8nText>
			</label>
			<AgentMiniEditor
				:class="$style.instructionsEditor"
				:model-value="instructions"
				language="markdown"
				:readonly="props.disabled"
				max-height="640px"
				min-height="160px"
				@update:model-value="onInstructionsInput"
			/>
			<N8nText size="xsmall" color="text-light">{{
				i18n.baseText('agents.builder.agent.instructions.characterCount', {
					interpolate: { count: String(instructions.length) },
				})
			}}</N8nText>
		</div>
	</div>
</template>

<style module>
.panel {
	overflow-y: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.instructionsField {
	flex: 1;
	min-height: 0;
}

.instructionsEditor {
	flex: 1;
	min-height: 0;
	display: flex;
}

.instructionsEditor > :global(.cm-editor) {
	flex: 1;
	min-height: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	display: block;
}
</style>
