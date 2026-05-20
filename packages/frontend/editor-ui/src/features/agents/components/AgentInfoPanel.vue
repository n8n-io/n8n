<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model, and instructions.
 * Credential selection is handled inside the model picker — no separate
 * credential field.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useUsersStore } from '@/features/settings/users/users.store';
import shared from '../styles/agent-panel.module.scss';
import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import AgentModelSelector from './AgentModelSelector.vue';
import AgentPanelHeader from './AgentPanelHeader.vue';

import type { AgentJsonConfig } from '../types';
import { parseModelString, modelToString, sanitizeModelId } from '../utils/model-string';
import AgentMiniEditor from './AgentMiniEditor.vue';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useModelCatalog } from '../composables/useModelCatalog';
import {
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	isAgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		embedded?: boolean;
		projectId?: string;
	}>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const { showError } = useToast();
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();

const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const projectId = computed(() => props.projectId ?? projectsStore.personalProject?.id ?? '');

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

function onModelChange(selection: AgentModelSelection) {
	const credentialId = credentialsByProvider.value?.[selection.provider];
	if (!credentialId) {
		showError(new Error(i18n.baseText('credentials.noResults')), i18n.baseText('error'));
		return;
	}
	emit('update:config', {
		model: `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`,
		credential: credentialId,
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
			<AgentModelSelector
				:selected-model="selectedAgent"
				:credentials="credentialsByProvider"
				:models-by-provider="filteredAgents"
				:is-loading="isLoading"
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
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
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
