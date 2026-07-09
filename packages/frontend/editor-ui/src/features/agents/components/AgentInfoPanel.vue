<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model, and instructions.
 * Credential selection is handled inside the model picker — no separate
 * credential field.
 */
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useToast } from '@/app/composables/useToast';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import { useUsersStore } from '@/features/settings/users/users.store';
import shared from '../styles/agent-panel.module.scss';
import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useModelCatalog } from '../composables/useModelCatalog';
import {
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	isAgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';
import { PROVIDER_CAPABILITIES } from '../provider-capabilities';
import type { AgentJsonConfig } from '../types';
import { parseModelString, modelToString, sanitizeModelId } from '../utils/model-string';
import { normalizeWebSearchForModelChange } from '../utils/nativeWebSearch';
import { normalizePromptCachingForModelChange } from '../utils/promptCaching';
import AgentModelSelector from './AgentModelSelector.vue';
import AgentPanelHeader from './AgentPanelHeader.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		embedded?: boolean;
		projectId?: string;
		showModel?: boolean;
		showInstructions?: boolean;
		showInstructionsToolbar?: boolean;
	}>(),
	{
		disabled: false,
		embedded: false,
		showModel: true,
		showInstructions: true,
		showInstructionsToolbar: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const usersStore = useUsersStore();
const { showError } = useToast();
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();

const projectId = useAgentProjectId(() => props.projectId);

const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	projectId,
);

watch(
	projectId,
	(id) => {
		if (id) void ensureLoaded(id);
	},
	{ immediate: true },
);

const filteredAgents = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(credentialsByProvider.value),
);

const selectedAgent = computed<AgentModelOption | null>(() => {
	const modelStr = modelToString(props.config?.model);
	if (!modelStr) return null;
	const parsed = parseModelString(modelStr);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return null;

	const registryEntry = filteredAgents.value[parsed.provider]?.models.find(
		(m) => m.model === parsed.name,
	);
	if (registryEntry) return registryEntry;

	return {
		provider: parsed.provider,
		model: parsed.name,
		name: parsed.name,
		description: null,
		createdAt: null,
		metadata: {
			functionCalling: false,
			available: true,
		},
	};
});

const panelTestId = computed(() => {
	if (props.showModel && !props.showInstructions) return 'agent-model-panel';
	if (!props.showModel && props.showInstructions) return 'agent-instructions-panel';
	return 'agent-info-panel';
});

const instructionsToolbarMode = computed(() =>
	props.showInstructionsToolbar ? 'always' : 'never',
);
const instructionsEditorVariant = computed(() =>
	props.showInstructionsToolbar ? 'contained' : 'ghost',
);

function onModelChange(selection: AgentModelSelection) {
	const credentialId = credentialsByProvider.value?.[selection.provider];
	if (!credentialId) {
		showError(new Error(i18n.baseText('credentials.noResults')), i18n.baseText('error'));
		return;
	}
	const model = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	const capabilities = PROVIDER_CAPABILITIES[selection.provider];
	const webSearchChanges = normalizeWebSearchForModelChange(
		props.config,
		capabilities?.webSearch ?? false,
	);
	emit('update:config', {
		model,
		credential: credentialId,
		...webSearchChanges,
		...normalizePromptCachingForModelChange(
			webSearchChanges.config ?? props.config?.config,
			capabilities?.promptCaching ?? false,
		),
	});
}

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
	const parsed = parseModelString(modelToString(props.config?.model));
	if (parsed?.provider === provider && credentialId) {
		emit('update:config', { credential: credentialId });
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
	<div :class="$style.panel" :data-testid="panelTestId">
		<AgentPanelHeader
			v-if="!props.embedded"
			:title="i18n.baseText('agents.builder.agent.title')"
			:description="i18n.baseText('agents.builder.agent.description')"
		/>

		<div v-if="props.showModel" :class="[$style.field, props.disabled && shared.disabledOverlay]">
			<label :class="$style.label"
				><N8nText step="sm" bold :class="shared.dataEntryLabel">{{
					i18n.baseText('agents.builder.agent.model.label')
				}}</N8nText></label
			>
			<AgentModelSelector
				:selected-model="selectedAgent"
				:credentials="credentialsByProvider"
				:models-by-provider="filteredAgents"
				:is-loading="isLoading"
				:project-id="projectId"
				:warn-missing-credentials="true"
				data-testid="agent-model-selector"
				@change="onModelChange"
				@select-credential="onSelectCredential"
			/>
		</div>

		<div v-if="props.showInstructions" :class="[$style.field, $style.instructionsField]">
			<label :class="$style.label">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
					i18n.baseText('agents.builder.agent.instructions.label')
				}}</N8nText>
			</label>
			<N8nMarkdownEditor
				:class="$style.instructionsDocument"
				:model-value="instructions"
				:readonly="props.disabled"
				:variant="instructionsEditorVariant"
				:show-toolbar="instructionsToolbarMode"
				max-height="none"
				data-testid="agent-instructions-document"
				@update:model-value="onInstructionsInput"
			/>
		</div>
	</div>
</template>

<style module>
.panel {
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.instructionsDocument {
	display: block;
	width: 100%;
}

.instructionsDocument :global(.n8n-markdown) {
	max-height: none;
	min-height: calc(var(--spacing--4xl) + var(--spacing--xl));
	overflow-y: visible;
	padding: 0;
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
