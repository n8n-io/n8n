<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useModelCatalog } from '../composables/useModelCatalog';
import {
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	isAgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';
import type { AgentJsonConfig } from '../types';
import { modelToString, parseModelString, sanitizeModelId } from '../utils/model-string';
import shared from '../styles/agent-panel.module.scss';
import AgentModelSelector from './AgentModelSelector.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		projectId?: string;
	}>(),
	{
		disabled: false,
		projectId: undefined,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const usersStore = useUsersStore();
const projectId = computed(() => props.projectId ?? '');
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	projectId,
);
const pendingCredential = ref<{ provider: AgentModelProvider; credentialId: string } | null>(null);

const configuredMemoryWorker = computed(() => {
	const episodicMemory = props.config?.memory?.episodicMemory;
	const episodicWorker =
		episodicMemory?.enabled === true ? (episodicMemory.reflectorModel ?? null) : null;

	return (
		episodicWorker ??
		props.config?.memory?.observationalMemory?.reflectorModel ??
		props.config?.memory?.observationalMemory?.observerModel ??
		null
	);
});
const configuredMemoryModel = computed(() => configuredMemoryWorker.value?.model ?? null);
const configuredMemoryCredential = computed(
	() => configuredMemoryWorker.value?.credential ?? props.config?.credential ?? null,
);
const configuredMemoryProvider = computed<AgentModelProvider | null>(() => {
	const model = configuredMemoryModel.value ?? modelToString(props.config?.model);
	if (!model) return null;

	const parsed = parseModelString(model);
	return parsed && isAgentModelProvider(parsed.provider) ? parsed.provider : null;
});
const effectiveCredentials = computed(() => {
	const credentials = credentialsByProvider.value;
	const provider = configuredMemoryProvider.value;
	const credential = configuredMemoryCredential.value;
	if (!credentials) return credentials;

	const effectiveCredentials =
		provider && credential ? { ...credentials, [provider]: credential } : { ...credentials };
	if (pendingCredential.value) {
		effectiveCredentials[pendingCredential.value.provider] = pendingCredential.value.credentialId;
	}

	return effectiveCredentials;
});
const selectedMemoryModel = ref<string | null>(configuredMemoryModel.value);
const modelsByProvider = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(effectiveCredentials.value),
);
const selectedModel = computed<AgentModelOption | null>(() => {
	const modelString = selectedMemoryModel.value ?? modelToString(props.config?.model);
	if (!modelString) return null;

	const parsed = parseModelString(modelString);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return null;

	const catalogModel = modelsByProvider.value[parsed.provider]?.models.find(
		(model) => model.model === parsed.name,
	);
	if (catalogModel) return catalogModel;

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

watch([configuredMemoryProvider, configuredMemoryCredential], ([provider, credential]) => {
	if (
		pendingCredential.value?.provider === provider &&
		pendingCredential.value.credentialId === credential
	) {
		pendingCredential.value = null;
	}
});

function onMemoryModelChange(selection: AgentModelSelection) {
	const credentialId = effectiveCredentials.value?.[selection.provider] ?? '';
	if (!credentialId) return;

	const model = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	const workerModel = { model, credential: credentialId };
	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;

	selectedMemoryModel.value = model;
	emit('update:config', {
		memory: {
			...existingMemory,
			enabled: true,
			storage: 'n8n',
			observationalMemory: {
				...existingMemory?.observationalMemory,
				observerModel: workerModel,
				reflectorModel: workerModel,
			},
			...(existingEpisodicMemory?.enabled === true
				? {
						episodicMemory: {
							...existingEpisodicMemory,
							reflectorModel: workerModel,
						},
					}
				: {}),
		},
	});
}

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
	pendingCredential.value = credentialId ? { provider, credentialId } : null;
}
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.rowLabel">
			<N8nText step="sm" bold :class="shared.dataEntryLabel">
				{{ i18n.baseText('agents.builder.memory.recallModel.label') }}
			</N8nText>
			<N8nText size="small" :class="shared.dataEntrySubLabel">
				{{ i18n.baseText('agents.builder.memory.recallModel.hint') }}
			</N8nText>
		</div>
		<div :class="$style.modelSelector">
			<AgentModelSelector
				:selected-model="selectedModel"
				:credentials="effectiveCredentials"
				:models-by-provider="modelsByProvider"
				:is-loading="isLoading"
				:project-id="projectId"
				:warn-missing-credentials="true"
				:bound-credential-id="configuredMemoryCredential"
				credential-modal-append-to-body
				:disabled="props.disabled"
				data-testid="agent-memory-recall-model-selector"
				@change="onMemoryModelChange"
				@select-credential="onSelectCredential"
			/>
		</div>
	</div>
</template>

<style module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.rowLabel {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.modelSelector {
	flex: 0 0 calc(var(--spacing--5xl) + var(--spacing--lg));
}

.modelSelector > * {
	width: 100%;
}
</style>
