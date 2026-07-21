<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nTooltip,
	N8nIconButton,
	N8nText,
	N8nSwitch,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE } from '../constants';
import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import { useModelCatalog } from '../composables/useModelCatalog';
import AgentModelSelector from './AgentModelSelector.vue';
import {
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	isAgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';
import type { AgentJsonConfig } from '../types';
import { parseModelString, modelToString, sanitizeModelId } from '../utils/model-string';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const settingsDialogOpen = ref(false);
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
const projectId = useAgentProjectId();
const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	projectId,
);
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
const episodicMemoryCredential = computed(() =>
	episodicMemory.value?.enabled === true ? episodicMemory.value.credential : null,
);
const selectedEpisodicMemoryCredential = computed(() =>
	episodicMemoryCredential.value === MANAGED_CREDENTIAL_TOKEN
		? null
		: episodicMemoryCredential.value,
);
const isAiAssistantProxyEnabled = computed(
	() => settingsStore.moduleSettings.agents?.proxyEnabled === true,
);
const configuredMemoryModel = computed(() => {
	const episodicModel =
		episodicMemory.value?.enabled === true
			? (episodicMemory.value.reflectorModel?.model ?? episodicMemory.value.extractorModel?.model)
			: null;

	return (
		episodicModel ??
		props.config?.memory?.observationalMemory?.reflectorModel?.model ??
		props.config?.memory?.observationalMemory?.observerModel?.model ??
		null
	);
});
const selectedMemoryModel = ref<string | null>(configuredMemoryModel.value);

watch(
	projectId,
	(id) => {
		if (id) void ensureLoaded(id);
	},
	{ immediate: true },
);

watch(configuredMemoryModel, (model) => {
	selectedMemoryModel.value = model;
});

const filteredAgents = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(credentialsByProvider.value),
);

const selectedAgent = computed<AgentModelOption | null>(() => {
	const modelStr = selectedMemoryModel.value ?? modelToString(props.config?.model);
	if (!modelStr) return null;
	const parsed = parseModelString(modelStr);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return null;

	const registryEntry = filteredAgents.value[parsed.provider]?.models.find(
		(model) => model.model === parsed.name,
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

function buildEnabledMemoryConfig() {
	const existingMemory = props.config?.memory;

	return {
		...existingMemory,
		enabled: true,
		storage: 'n8n' as const,
	};
}

function enableEpisodicMemory(credentialId: string) {
	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: {
				...(existingEpisodicMemory?.enabled === true ? existingEpisodicMemory : {}),
				enabled: true,
				credential: credentialId,
			},
		},
	});
}

function disableEpisodicMemory() {
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: { enabled: false },
		},
	});
}

function onMemoryRecallModelChange(selection: AgentModelSelection) {
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';
	if (!credentialId) return;

	const model = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	selectedMemoryModel.value = model;
	const workerModel = { model, credential: credentialId };

	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;

	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			observationalMemory: {
				...existingMemory?.observationalMemory,
				observerModel: workerModel,
				reflectorModel: workerModel,
			},
			...(existingEpisodicMemory?.enabled === true
				? {
						episodicMemory: {
							...existingEpisodicMemory,
							extractorModel: workerModel,
							reflectorModel: workerModel,
						},
					}
				: {}),
		},
	});
}

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
}

function onEpisodicMemoryToggle(enabled: boolean) {
	if (!enabled) {
		disableEpisodicMemory();
		return;
	}

	if (isAiAssistantProxyEnabled.value) {
		enableEpisodicMemory(MANAGED_CREDENTIAL_TOKEN);
		return;
	}

	settingsDialogOpen.value = true;
}
</script>

<template>
	<div :class="[$style.container, props.disabled && $style.disabled]">
		<div :class="$style.header">
			<div :class="$style.titleGroup">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.memory.title') }}
				</N8nText>
				<N8nText size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.memory.description') }}
				</N8nText>
			</div>
			<N8nTooltip>
				<template #content>{{ i18n.baseText('generic.settings') }}</template>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon-size="medium"
					icon="cog"
					:aria-label="i18n.baseText('generic.settings')"
					:disabled="props.disabled"
					data-testid="agent-memory-settings-button"
					@click="settingsDialogOpen = true"
				/>
			</N8nTooltip>
		</div>

		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
				</N8nText>
				<N8nText size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.hint') }}
				</N8nText>
			</div>
			<N8nSwitch
				:model-value="episodicMemoryEnabled"
				:disabled="props.disabled"
				data-testid="agent-episodic-memory-toggle"
				@update:model-value="(value) => onEpisodicMemoryToggle(Boolean(value))"
			/>
		</div>

		<N8nDialog :open="settingsDialogOpen" size="medium" @update:open="settingsDialogOpen = $event">
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{ i18n.baseText('agents.builder.memory.settings.title' as BaseTextKey) }}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<div :class="$style.dialogContent">
				<div :class="$style.row">
					<div :class="$style.titleGroup">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.builder.memory.recallModel.label') }}
						</N8nText>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{ i18n.baseText('agents.builder.memory.recallModel.hint') }}
						</N8nText>
					</div>
					<div :class="$style.modelSelector">
						<AgentModelSelector
							:selected-model="selectedAgent"
							:credentials="credentialsByProvider"
							:models-by-provider="filteredAgents"
							:is-loading="isLoading"
							:project-id="projectId"
							:warn-missing-credentials="true"
							credential-modal-append-to-body
							data-testid="agent-memory-recall-model-selector"
							@change="onMemoryRecallModelChange"
							@select-credential="onSelectCredential"
						/>
					</div>
				</div>

				<div v-if="!isAiAssistantProxyEnabled" :class="$style.row">
					<div :class="$style.titleGroup">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">
							{{
								i18n.baseText(
									'agents.builder.memory.episodicMemory.credential.label' as BaseTextKey,
								)
							}}
						</N8nText>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{
								i18n.baseText('agents.builder.memory.episodicMemory.credential.hint' as BaseTextKey)
							}}
						</N8nText>
					</div>
					<div :class="$style.credentialPicker">
						<CredentialPicker
							app-name="OpenAI"
							size="medium"
							button-size="large"
							:credential-type="AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE"
							:selected-credential-id="selectedEpisodicMemoryCredential"
							:project-id="projectId"
							:show-delete="false"
							:hide-create-new="false"
							:teleported="false"
							credential-modal-append-to-body
							:class="$style.credentialPicker"
							data-testid="agent-episodic-memory-credential-picker"
							@credential-selected="enableEpisodicMemory"
						/>
					</div>
				</div>
			</div>
		</N8nDialog>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleGroup {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleGroup > :global(.n8n-text) {
	max-width: 100%;
	overflow-wrap: anywhere;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.dialogContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-top: var(--spacing--lg);
}

.dialogContent .row {
	flex-direction: column;
	align-items: stretch;
}

.dialogContent .modelSelector,
.dialogContent .credentialPicker {
	flex-basis: auto;
	width: 100%;
	max-width: none;
	margin-left: 0;
}

.credentialPicker input {
	min-height: 36px;
	height: 36px;
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);

	button {
		color: var(--icon-color);
	}
}

.modelSelector,
.credentialPicker {
	display: flex;
	flex: 0 1 280px;
	justify-content: flex-end;
	margin-left: auto;
	min-width: min(280px, 100%);
}

.modelSelector > *,
.credentialPicker > * {
	width: 100%;
}

.container.disabled {
	opacity: 0.6;
}

.inlineInput {
	width: 70px;
	text-align: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--hover);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
}

.inlineInput:focus {
	border-color: var(--background--brand);
}

.divider {
	border: none;
	border-top: var(--border);
	margin: var(--spacing--2xs) 0;
}
</style>
