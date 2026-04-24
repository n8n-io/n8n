<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model (delegated to the
 * canonical ChatHub ModelSelector), and instructions. Credential selection is
 * handled inside the model picker — no separate credential field.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nInput, N8nText } from '@n8n/design-system';
import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatModelDto,
	ChatModelsResponse,
} from '@n8n/api-types';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';

import type { AgentJsonConfig } from '../types';
import {
	CHATHUB_TO_CATALOG,
	CATALOG_TO_CHATHUB,
	AGENT_UNSUPPORTED_PROVIDERS,
} from '../provider-mapping';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = withDefaults(defineProps<{ config: AgentJsonConfig | null; disabled?: boolean }>(), {
	disabled: false,
});
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

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

function parseModelString(model: string): { provider: string; name: string } | null {
	const slashIndex = model.indexOf('/');
	if (slashIndex <= 0) return null;
	return { provider: model.slice(0, slashIndex), name: model.slice(slashIndex + 1) };
}

function modelToString(
	raw: string | { provider: string | null; name: string | null } | undefined,
): string {
	if (!raw) return '';
	if (typeof raw === 'string') return raw;
	return `${raw.provider ?? ''}/${raw.name ?? ''}`;
}

const selectedAgent = computed<ChatModelDto | null>(() => {
	const modelStr = modelToString(props.config?.model);
	if (!modelStr) return null;
	const parsed = parseModelString(modelStr);
	if (!parsed) return null;
	const chatHubProvider = CATALOG_TO_CHATHUB[parsed.provider];
	if (!chatHubProvider) return null;
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

function sanitizeModelId(provider: string, modelId: string): string {
	if (provider === 'google') return modelId.replace(/^models\//, '');
	return modelId;
}

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

const name = ref(props.config?.name ?? '');
const description = ref(props.config?.description ?? '');
const instructions = ref(props.config?.instructions ?? '');

watch(
	() => props.config,
	(config) => {
		if (!config) return;
		name.value = config.name ?? '';
		description.value = config.description ?? '';
		instructions.value = config.instructions ?? '';
	},
	{ deep: true },
);

const emitName = useDebounceFn((value: string) => {
	emit('update:config', { name: value });
}, getDebounceTime(DEBOUNCE_TIME.INPUT.TEXT_CHANGE));

const emitDescription = useDebounceFn((value: string) => {
	emit('update:config', { description: value || undefined });
}, getDebounceTime(DEBOUNCE_TIME.INPUT.TEXT_CHANGE));

const emitInstructions = useDebounceFn(() => {
	emit('update:config', { instructions: instructions.value });
}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));

function onNameInput(value: string) {
	name.value = value;
	void emitName(value);
}

function onDescriptionInput(value: string) {
	description.value = value;
	void emitDescription(value);
}

function onInstructionsInput(value: string) {
	instructions.value = value;
	void emitInstructions();
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-info-panel">
		<div :class="$style.header">
			<N8nText tag="h3" size="large" :bold="true">Agent</N8nText>
			<N8nText size="small" color="text-light"
				>Core setup that defines how this agent behaves</N8nText
			>
		</div>

		<div :class="$style.field">
			<label :class="$style.label"><N8nText size="small" :bold="true">Name</N8nText></label>
			<N8nInput
				:model-value="name"
				placeholder="My agent"
				:disabled="props.disabled"
				data-testid="agent-name-input"
				@update:model-value="onNameInput"
			/>
		</div>

		<div :class="$style.field">
			<label :class="$style.label"><N8nText size="small" :bold="true">Description</N8nText></label>
			<N8nInput
				:model-value="description"
				placeholder="What does this agent do?"
				:disabled="props.disabled"
				data-testid="agent-description-input"
				@update:model-value="onDescriptionInput"
			/>
		</div>

		<div :class="[$style.field, props.disabled && $style.fieldDisabled]">
			<label :class="$style.label"><N8nText size="small" :bold="true">Model</N8nText></label>
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
				<N8nText size="small" :bold="true">Instructions</N8nText>
			</label>
			<AgentMiniEditor
				:class="$style.instructionsEditor"
				:model-value="instructions"
				language="markdown"
				:readonly="props.disabled"
				max-height="100%"
				min-height="160px"
				@update:model-value="onInstructionsInput"
			/>
			<N8nText size="xsmall" color="text-light">{{ instructions.length }} characters</N8nText>
		</div>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	scrollbar-width: thin;
	scrollbar-color: var(--color--foreground--shade-1) transparent;
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

.panel::-webkit-scrollbar {
	width: 6px;
}

.panel::-webkit-scrollbar-track {
	background: transparent;
}

.panel::-webkit-scrollbar-thumb {
	background: var(--color--foreground--shade-1);
	border-radius: 999px;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	display: block;
}

.fieldDisabled {
	pointer-events: none;
	opacity: 0.6;
}
</style>
