<script setup lang="ts">
/**
 * Combined editor for the core agent fields: name, model, and instructions.
 * Credential selection is handled inside the model picker — no separate
 * credential field.
 */
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nCallout, N8nIconButton, N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { useToast } from '@n8n/composables/useToast';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import { useUsersStore } from '@n8n/stores/users.store';
import shared from '../styles/agent-panel.module.scss';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
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
import AgentPanelHeader from './AgentPanelHeader.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		embedded?: boolean;
		projectId?: string;
		/** Cap for the instructions editor — compact hosts (NDV) pass a smaller value. */
		instructionsMaxHeight?: string;
		showModel?: boolean;
		showInstructions?: boolean;
		showInstructionsToolbar?: boolean;
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
		instructionsMaxHeight: '360px',
		showModel: true,
		showInstructions: true,
		showInstructionsToolbar: false,
		immediateUpdates: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
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

const panelTestId = computed(() => {
	if (props.showModel && !props.showInstructions) return 'agent-model-panel';
	if (!props.showModel && props.showInstructions) return 'agent-instructions-panel';
	return 'agent-info-panel';
});

const instructionsToolbarMode = computed(() =>
	props.showInstructionsToolbar ? 'always' : 'never',
);

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
		capabilities?.promptCaching ?? false,
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
	emit('update:config', {
		model,
		credential: credentialId,
		...webSearchChanges,
		...promptCachingChanges,
		...reasoningChanges,
	});
}

watch(
	() =>
		pendingDefaultProvider.value
			? getDefaultModelForPicker(effectiveCredentials.value, pendingDefaultProvider.value)
			: null,
	(defaultModel) => {
		if (!defaultModel || props.disabled || modelToString(props.config?.model)) return;

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
	if (credentialId && !modelToString(props.config?.model)) {
		pendingDefaultProvider.value = provider;
	}
	const parsed = parseModelString(modelToString(props.config?.model));
	if (parsed?.provider === provider && credentialId) {
		emit('update:config', { credential: credentialId });
	}
}

function onConfigureCredential(provider: AgentModelProvider) {
	if (!modelToString(props.config?.model)) {
		pendingDefaultProvider.value = provider;
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

const emitInstructionsDebounced = useDebounceFn(() => {
	emit('update:config', { instructions: instructions.value });
}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));

function onInstructionsInput(value: string) {
	instructions.value = value;
	if (props.immediateUpdates) {
		emit('update:config', { instructions: value });
		return;
	}
	void emitInstructionsDebounced();
}
</script>

<template>
	<div :class="$style.panel" :data-testid="panelTestId">
		<AgentPanelHeader
			v-if="!props.embedded"
			:title="i18n.baseText('agents.builder.agent.title')"
			:description="i18n.baseText('agents.builder.agent.description')"
		/>

		<div v-if="props.showModel" :class="[$style.field]">
			<label :class="[$style.label, props.disabled && shared.disabled]"
				><N8nText step="sm" bold :class="shared.dataEntryLabel">{{
					i18n.baseText('agents.builder.agent.model.label')
				}}</N8nText></label
			>
			<AgentModelSelector
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
				@configure-credential="onConfigureCredential"
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
						<strong>{{ i18n.baseText('agents.builder.agent.model.defaultSelected.title') }}</strong>
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

		<div v-if="props.showInstructions" :class="[$style.field]">
			<label :class="[$style.label, props.disabled && shared.disabled]">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
					i18n.baseText('agents.builder.agent.instructions.label')
				}}</N8nText>
			</label>
			<N8nMarkdownEditor
				:class="$style.instructionsDocument"
				:model-value="instructions"
				:disabled="props.disabled"
				:show-toolbar="instructionsToolbarMode"
				:max-height="props.instructionsMaxHeight"
				variant="contained"
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

.instructionsDocument:disabled {
	opacity: 0.5;
}

/* Follow the editor's configured max-height and scroll within the cap. */
.instructionsDocument :global(.n8n-markdown) {
	max-height: var(--markdown-editor-max-height);
	min-height: calc(var(--spacing--4xl) + var(--spacing--xl));
	overflow-y: auto;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	display: block;
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
</style>
