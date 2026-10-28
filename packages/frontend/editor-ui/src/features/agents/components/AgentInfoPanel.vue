<script setup lang="ts">
import AgentPanel from './AgentPanel.vue';
/**
 * Combined editor for the core agent fields: name, model, and instructions.
 * Credential selection is handled inside the model picker — no separate
 * credential field.
 */
import { computed, ref, useId, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nCallout, N8nIconButton, N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { useToast } from '@n8n/composables/useToast';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import { useUsersStore } from '@n8n/stores/users.store';
import shared from '../styles/agent-panel.module.scss';
import { AI_GATEWAY_MANAGED_TAG, getModelPromptCachingCapability } from '@n8n/api-types';
import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useModelCatalog } from '../composables/useModelCatalog';
import {
	AGENT_MODEL_PROVIDERS,
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
import { normalizeReasoningForModelChange } from '../utils/reasoning';
import AgentModelSelector from './AgentModelSelector.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		embedded?: boolean;
		projectId?: string;
		showModel?: boolean;
		showInstructions?: boolean;
		/**
		 * Emit instructions edits per keystroke instead of debounced. For hosts
		 * whose updates are cheap local writes (inline agent → node parameter);
		 * autosaving hosts (builder) keep the debounce.
		 */
		immediateUpdates?: boolean;
	}>(),
	{
		disabled: false,
		embedded: false,
		showModel: true,
		showInstructions: true,
		immediateUpdates: false,
	},
);
const emit = defineEmits<{
	'update:config': [changes: Partial<AgentJsonConfig>, meta?: { source: 'auto' }];
	'draft:config': [];
}>();

const i18n = useI18n();
const instructionsEditorId = useId();
const usersStore = useUsersStore();
const { showError } = useToast();
const { catalog, ensureLoaded, getModelsForPicker, getDefaultModelForPicker, isLoading } =
	useModelCatalog();

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

const configProvider = computed<AgentModelProvider | null>(() => {
	const parsed = parseModelString(modelToString(props.config?.model));
	return parsed && isAgentModelProvider(parsed.provider) ? parsed.provider : null;
});

// The agent's persisted `config.credential` is the source of truth for the selected
// model's provider. `credentialsByProvider` only tracks manual (localStorage) selections,
// so a builder-created agent — which writes `config` but not localStorage — would fall
// back to the managed default and read as "credentials missing". Overlay the config value.
const effectiveCredentials = computed(() => {
	const base = credentialsByProvider.value;
	if (!base) return base;
	const provider = configProvider.value;
	const credential = props.config?.credential;
	if (!provider || !credential) return base;
	return { ...base, [provider]: credential };
});

const pendingDefaultProvider = ref<AgentModelProvider | null>(null);
// True while the current model was auto-applied by the resolver (not yet
// touched by the user). Drives the “you can change it” hint under the picker.
const defaultModelHint = ref(false);

const filteredAgents = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(effectiveCredentials.value),
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

function onModelChange(selection: AgentModelSelection, source: 'user' | 'auto' = 'user') {
	const credentialId = effectiveCredentials.value?.[selection.provider];
	if (!credentialId) {
		showError(new Error(i18n.baseText('credentials.noResults')), i18n.baseText('error'));
		return;
	}
	const modelName = sanitizeModelId(selection.provider, selection.model);
	const model = `${selection.provider}/${modelName}`;
	const capabilities = PROVIDER_CAPABILITIES[selection.provider];
	const webSearchChanges = normalizeWebSearchForModelChange(
		props.config,
		capabilities?.webSearch ?? false,
	);
	const webSearchConfig =
		'config' in webSearchChanges ? webSearchChanges.config : props.config?.config;
	const promptCachingChanges = normalizePromptCachingForModelChange(
		webSearchConfig,
		getModelPromptCachingCapability(model),
	);
	const normalizedConfig =
		'config' in promptCachingChanges ? promptCachingChanges.config : webSearchConfig;
	const reasoningChanges = normalizeReasoningForModelChange(
		normalizedConfig,
		catalog.value[selection.provider]?.models[modelName]?.reasoning,
	);
	// A default applied by the resolver surfaces a hint so the user knows they
	// can change it; any explicit user pick clears the hint.
	defaultModelHint.value = source === 'auto';
	emit(
		'update:config',
		{
			model,
			credential: credentialId,
			...webSearchChanges,
			...promptCachingChanges,
			...reasoningChanges,
		},
		// A pending agent must not be persisted just because a default model was
		// auto-applied — let the host apply it to the draft without autosaving.
		source === 'auto' ? { source: 'auto' } : undefined,
	);
}

watch(
	() =>
		pendingDefaultProvider.value
			? getDefaultModelForPicker(effectiveCredentials.value, pendingDefaultProvider.value)
			: null,
	(defaultModel) => {
		const currentModel = parseModelString(modelToString(props.config?.model));
		if (
			!defaultModel ||
			props.disabled ||
			(currentModel?.provider === defaultModel.provider && currentModel.name === defaultModel.model)
		) {
			pendingDefaultProvider.value = null;
			return;
		}

		pendingDefaultProvider.value = null;
		onModelChange(defaultModel, 'auto');
	},
);

// An empty draft can mount with a credential already available (localStorage
// pick, managed n8n credits, or an existing credential), where no picker event
// ever fires — seed default resolution from that initial state once, so the
// agent starts with a working model instead of a blank choice. Mirrors the
// backend creation resolver: personal credentials win, and with none the
// managed fallback is OpenAI only (n8n credits serves other providers too,
// but the agreed no-credential default is openai/gpt-5-mini).
const initialDefaultSeeded = ref(false);
watch(
	[effectiveCredentials, () => props.config],
	([credentials, config]) => {
		if (initialDefaultSeeded.value || props.disabled) return;
		if (!credentials || !config || modelToString(config.model)) return;

		const provider =
			AGENT_MODEL_PROVIDERS.find(
				(candidate) => credentials[candidate] && credentials[candidate] !== AI_GATEWAY_MANAGED_TAG,
			) ?? (credentials.openai === AI_GATEWAY_MANAGED_TAG ? 'openai' : undefined);
		if (!provider) return;

		initialDefaultSeeded.value = true;
		pendingDefaultProvider.value = provider;
	},
	{ immediate: true },
);

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
	const parsed = parseModelString(modelToString(props.config?.model));
	if (parsed?.provider === provider && credentialId) {
		emit('update:config', { credential: credentialId });
	}
}

const instructions = ref(props.config?.instructions ?? '');
const instructionsEditor = ref<InstanceType<typeof N8nMarkdownEditor>>();
const modelSelector = ref<InstanceType<typeof AgentModelSelector>>();

// Keep the local editor stable while external config updates arrive.
watch(
	() => props.config?.instructions ?? '',
	(value) => {
		if (value !== instructions.value) instructions.value = value;
	},
);

const emitInstructionsDebounced = useDebounceFn(() => {
	emit('update:config', { instructions: instructions.value });
}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));

function focusInstructions() {
	instructionsEditor.value?.focus();
}

function focusModel() {
	modelSelector.value?.open();
}

function onInstructionsInput(value: string) {
	instructions.value = value;
	emit('draft:config');
	if (props.immediateUpdates) {
		emit('update:config', { instructions: value });
		return;
	}
	void emitInstructionsDebounced();
}
defineExpose({ focusInstructions, focusModel });
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.agent.title')"
		header-visibility="visually-hidden"
		data-testid="agent-info-panel"
	>
		<div :class="$style.panels">
			<div v-if="props.showModel" data-testid="agent-model-panel">
				<div :class="$style.field">
					<div :class="[$style.label, props.disabled && shared.disabled]">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.builder.agent.model.label') }}
							<N8nText step="sm" bold color="danger">*</N8nText>
						</N8nText>
						<N8nText step="sm" color="text-light">
							{{ i18n.baseText('agents.builder.agent.model.description') }}
						</N8nText>
					</div>
					<AgentModelSelector
						ref="modelSelector"
						:disabled="props.disabled"
						:selected-model="selectedAgent"
						:credentials="effectiveCredentials"
						:models-by-provider="filteredAgents"
						:is-loading="isLoading"
						:project-id="projectId"
						:warn-missing-credentials="true"
						:bound-credential-id="props.config?.credential ?? null"
						data-testid="agent-model-selector"
						@change="onModelChange"
						@select-credential="onSelectCredential"
					/>
					<N8nCallout
						v-if="defaultModelHint && !props.disabled"
						theme="info"
						slim
						:class="$style.defaultHint"
						data-testid="agent-default-model-hint"
					>
						<div :class="$style.defaultHintBody">
							<span :class="$style.defaultHintText">
								<strong>{{
									i18n.baseText('agents.builder.agent.model.defaultSelected.title')
								}}</strong>
								{{ i18n.baseText('agents.builder.agent.model.defaultSelected.description') }}
							</span>
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="small"
								:title="i18n.baseText('agents.builder.agent.model.defaultSelected.dismiss')"
								data-testid="agent-default-model-hint-dismiss"
								@click="defaultModelHint = false"
							/>
						</div>
					</N8nCallout>
				</div>
			</div>
			<div
				v-if="props.showModel && props.showInstructions"
				:class="$style.divider"
				aria-hidden="true"
			></div>
			<div
				v-if="props.showInstructions"
				:class="$style.field"
				data-testid="agent-instructions-panel"
			>
				<div :class="[$style.label, props.disabled && shared.disabled]">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.builder.agent.instructions.label') }}
						<N8nText step="sm" bold color="danger">*</N8nText>
					</N8nText>
					<N8nText step="sm" color="text-light">
						{{ i18n.baseText('agents.builder.agent.instructions.description') }}
					</N8nText>
				</div>
				<N8nMarkdownEditor
					ref="instructionsEditor"
					:id="instructionsEditorId"
					:class="$style.instructionsDocument"
					:model-value="instructions"
					:disabled="props.disabled"
					:placeholder="i18n.baseText('agents.builder.agent.instructions.placeholder')"
					show-toolbar="floating"
					expandedViewToolbarMode="always"
					variant="contained"
					allowExpandedView
					data-testid="agent-instructions-document"
					@update:model-value="onInstructionsInput"
				/>
			</div>
		</div>
	</AgentPanel>
</template>

<style module>
.panels {
	display: flex;
	align-items: stretch;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

.panels > * {
	flex: 1;
	min-width: 0;
}

.instructionsDocument {
	display: block;
	width: 100%;
}

.instructionsDocument:disabled {
	opacity: 0.5;
	pointer-events: none;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	user-select: none;
}

.defaultHint {
	margin-top: var(--spacing--3xs);
}

.defaultHintBody {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.defaultHintText {
	flex: 1;
	min-width: 0;
}

.divider {
	flex: initial;
	height: 1px;
	background-color: var(--border-color--subtle);
	margin-inline: calc(var(--spacing--sm) * -1);
}
</style>
