<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model (delegated to the
 * canonical ChatHub ModelSelector), and instructions. Credential selection is
 * handled inside the model picker — no separate credential field.
 */
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatHubProvider } from '@n8n/api-types';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import shared from '../styles/agent-panel.module.scss';
import AgentPanelHeader from './AgentPanelHeader.vue';

import type { AgentJsonConfig } from '../types';
import { CATALOG_TO_CHATHUB } from '../provider-mapping';
import { PROVIDER_CAPABILITIES } from '../provider-capabilities';
import { parseModelString, modelToString } from '../utils/model-string';
import { normalizeWebSearchForModelChange } from '../utils/nativeWebSearch';
import AgentModelSelector from './AgentModelSelector.vue';
import { useToast } from '@/app/composables/useToast';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const { showError } = useToast();

function onModelChange(selection: { model: string; credentialId: string | null }) {
	if (!selection.credentialId) {
		showError(new Error(i18n.baseText('credentials.noResults')), i18n.baseText('error'));
		return;
	}
	const parsed = parseModelString(selection.model);
	const nextProviderTool = parsed
		? (PROVIDER_CAPABILITIES[parsed.provider]?.webSearch ?? false)
		: false;
	emit('update:config', {
		model: selection.model,
		credential: selection.credentialId,
		...normalizeWebSearchForModelChange(props.config, nextProviderTool),
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	const parsed = parseModelString(modelToString(props.config?.model));
	if (parsed && CATALOG_TO_CHATHUB[parsed.provider] === provider && credentialId) {
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
				:model="modelToString(props.config?.model)"
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
			<N8nMarkdownEditor
				:class="$style.instructionsEditor"
				:model-value="instructions"
				:readonly="props.disabled"
				max-height="640px"
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
	width: 100%;
}

.instructionsEditor :global(.n8n-markdown),
.instructionsEditor :global(textarea) {
	min-height: 160px;
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
