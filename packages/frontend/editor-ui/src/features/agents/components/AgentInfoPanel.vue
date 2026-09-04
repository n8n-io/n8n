<script setup lang="ts">
import AgentPanel from './AgentPanel.vue';
/**
 * Combined editor for the core agent fields: name, model, and instructions.
 * Credential selection is handled inside the model picker — no separate
 * credential field.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import {
	N8nCallout,
	N8nIconButton,
	N8nInput,
	N8nMarkdownEditor,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { useToast } from '@n8n/composables/useToast';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
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
		immediateUpdates: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const usersStore = useUsersStore();
const credentialsStore = useCredentialsStore();
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

// Azure OpenAI classic deployments are user-named in Azure and surfaced in the
// deployment-based URL path; Foundry endpoints take the model id directly, so
// the deployment name only applies to classic. The credential's `endpointType`
// is only readable with credential edit access — when it can't be determined,
// keep the field visible and let backend validation stay the enforcement point.
const azureEndpointType = ref<'classic' | 'foundry' | 'unknown'>('unknown');

watch(
	[configProvider, () => props.config?.credential],
	async ([provider, credentialId]) => {
		azureEndpointType.value = 'unknown';
		if (provider !== 'azure-openai' || !credentialId || credentialId === AI_GATEWAY_MANAGED_TAG) {
			return;
		}
		try {
			const credential = await credentialsStore.getCredentialData({ id: credentialId });
			// Ignore stale responses from rapid credential switches.
			if (props.config?.credential !== credentialId) return;
			const data = credential && typeof credential.data === 'object' ? credential.data : undefined;
			if (data?.endpointType === 'classic' || data?.endpointType === 'foundry') {
				azureEndpointType.value = data.endpointType;
			}
		} catch {
			// No read access to the credential data (e.g. shared credential) —
			// keep 'unknown' so the field stays visible.
		}
	},
	{ immediate: true },
);

const showDeploymentName = computed(() => {
	if (props.disabled || !props.showModel) return false;
	if (configProvider.value !== 'azure-openai') return false;
	const credentialId = props.config?.credential;
	if (!credentialId || credentialId === AI_GATEWAY_MANAGED_TAG) return false;
	if (!credentialsStore.getCredentialById(credentialId)) return false;
	return azureEndpointType.value !== 'foundry';
});

const deploymentName = ref(props.config?.modelDeploymentName ?? '');
const deploymentNameFocused = ref(false);

watch(
	() => props.config?.modelDeploymentName ?? '',
	(value) => {
		// The autosave round-trip echoes the server's config copy, which lags the
		// input by a save cycle — syncing it mid-typing would wipe newer keystrokes.
		// External updates (model-change seeding, AI edits) land while unfocused.
		if (deploymentNameFocused.value) return;
		if (value !== deploymentName.value) deploymentName.value = value;
		// Parent replaced the value (agent switch / echo). Drop a queued emit
		// so it cannot write the previous agent's name onto the new config.
		cancelDeploymentNameEmit();
	},
);

// Hand-rolled so a model change can drop a queued emit. `useDebounceFn` has no cancel.
let deploymentNameEmitTimer: ReturnType<typeof setTimeout> | undefined;

function cancelDeploymentNameEmit() {
	if (deploymentNameEmitTimer === undefined) return;
	clearTimeout(deploymentNameEmitTimer);
	deploymentNameEmitTimer = undefined;
}

onBeforeUnmount(cancelDeploymentNameEmit);

function scheduleDeploymentNameEmit(value: string) {
	cancelDeploymentNameEmit();
	deploymentNameEmitTimer = setTimeout(() => {
		deploymentNameEmitTimer = undefined;
		emit('update:config', { modelDeploymentName: value });
	}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));
}

function onDeploymentNameInput(value: string) {
	deploymentName.value = value;
	if (props.immediateUpdates) {
		cancelDeploymentNameEmit();
		emit('update:config', { modelDeploymentName: value });
		return;
	}
	scheduleDeploymentNameEmit(value);
}

function deriveDefaultDeploymentName(selection: AgentModelSelection): string {
	// Azure deployments are conventionally named after the model. Default the
	// deployment name to the chosen model's display name, lowercased with
	// whitespace turned into dashes (e.g. "GPT-4o mini" → "gpt-4o-mini").
	const displayName =
		filteredAgents.value[selection.provider]?.models.find((m) => m.model === selection.model)
			?.name ?? selection.model;
	return displayName.toLowerCase().replace(/\s+/g, '-');
}

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
	// Azure OpenAI classic needs a user-named deployment; seed it from the model
	// so the field isn't blank. Following the model on change is the sensible
	// default — deployments are usually named after the model. Foundry endpoints
	// take the model id directly and don't need one.
	// Drop any in-flight typed/cleared value so it can't land after this seed
	// and wipe the model-derived name.
	cancelDeploymentNameEmit();
	const deploymentNameChange =
		selection.provider === 'azure-openai' && azureEndpointType.value !== 'foundry'
			? { modelDeploymentName: deriveDefaultDeploymentName(selection) }
			: {};
	if (deploymentNameChange.modelDeploymentName !== undefined) {
		deploymentName.value = deploymentNameChange.modelDeploymentName;
	}
	emit('update:config', {
		model,
		credential: credentialId,
		...webSearchChanges,
		...promptCachingChanges,
		...reasoningChanges,
		...deploymentNameChange,
	});
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
	<AgentPanel :show-header="false" data-testid="agent-info-panel">
		<div :class="$style.panels">
			<div v-if="props.showModel" data-testid="agent-model-panel">
				<div :class="$style.field">
					<div :class="[$style.label, props.disabled && shared.disabled]">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.builder.agent.model.label') }}
						</N8nText>
						<N8nText step="sm" color="text-light">What model this agent uses</N8nText>
					</div>
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

				<div
					v-if="showDeploymentName"
					:class="$style.field"
					data-testid="agent-deployment-name-field"
				>
					<label :class="[$style.label, props.disabled && shared.disabled]">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
							i18n.baseText('agents.builder.agent.model.deploymentName.label')
						}}</N8nText>
					</label>
					<N8nInput
						:model-value="deploymentName"
						:placeholder="i18n.baseText('agents.builder.agent.model.deploymentName.placeholder')"
						:disabled="props.disabled"
						data-testid="agent-deployment-name"
						@focus="deploymentNameFocused = true"
						@blur="deploymentNameFocused = false"
						@update:model-value="onDeploymentNameInput"
					/>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.agent.model.deploymentName.description') }}
					</N8nText>
				</div>
			</div>

			<div
				v-if="props.showInstructions"
				:class="$style.field"
				data-testid="agent-instructions-panel"
			>
				<div :class="[$style.label, props.disabled && shared.disabled]">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.builder.agent.instructions.label') }}
					</N8nText>
					<N8nText step="sm" color="text-light"> What this agent should do </N8nText>
				</div>
				<N8nMarkdownEditor
					id="editor"
					:class="$style.instructionsDocument"
					:model-value="instructions"
					:disabled="props.disabled"
					:max-height="props.instructionsMaxHeight"
					show-toolbar="floating"
					variant="ghost"
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
	margin-inline: -12px;
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
</style>
