<script setup lang="ts">
import { AGENT_BUILDER_DEFAULT_MODEL } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useAgentModelCredentials } from '../../composables/useAgentModelCredentials';
import AgentModelSelector from '../AgentModelSelector.vue';
import { computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useAgentBuilderSettingsStore } from '../../agentBuilderSettings.store';
import { sanitizeModelId } from '../../utils/model-string';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useModelCatalog } from '../../composables/useModelCatalog';
import {
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	isAgentModelProvider,
	type AgentModelsByProvider,
} from '../../model-providers';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const toast = useToast();
const store = useAgentBuilderSettingsStore();
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();

const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const projectId = computed(() => projectsStore.personalProject?.id ?? '');

watch(
	projectId,
	(id) => {
		if (id) void ensureLoaded(id);
	},
	{ immediate: true },
);

/**
 * When the AI Assistant proxy isn't available, the only meaningful interactive
 * option is the custom-credential picker — surfacing the "Use n8n AI" radio
 * would be confusing. The mode picker is hidden in that case.
 */
const isProxyAvailable = computed(() => Boolean(settingsStore.isAiAssistantEnabled));
const showModePicker = computed(() => isProxyAvailable.value);

/**
 * When proxy is unavailable, the picker is the only way to configure the
 * builder, so it stays visible regardless of the persisted mode. Otherwise it
 * follows the user's selection.
 */
const showCustomPicker = computed(() => store.mode === 'custom' || !isProxyAvailable.value);

const filteredAgents = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(credentialsByProvider.value),
);

const selectedAgent = computed<AgentModelOption | null>(() => {
	const settings = store.effectiveSettings;
	if (settings.mode !== 'custom') return null;
	if (!isAgentModelProvider(settings.provider)) return null;

	const registryEntry = filteredAgents.value[settings.provider]?.models.find(
		(model) => model.model === settings.modelName,
	);
	if (registryEntry) return registryEntry;

	return {
		provider: settings.provider,
		model: settings.modelName,
		name: settings.modelName,
		description: null,
		createdAt: null,
		metadata: {
			functionCalling: false,
			available: true,
		},
	};
});

function onModelChange(selection: AgentModelSelection) {
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';
	if (!credentialId) {
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('settings.agentBuilder.missingCredential.title'),
			message: i18n.baseText('settings.agentBuilder.missingCredential.message'),
		});
		return;
	}
	store.setCustomSelection({
		provider: selection.provider,
		credentialId,
		modelName: sanitizeModelId(selection.provider, selection.model),
	});
}

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	if (!credentialId) return;
	selectCredential(provider, credentialId);
	const settings = store.effectiveSettings;
	if (settings.mode !== 'custom') return;
	if (settings.provider !== provider) return;
	store.setCustomSelection({
		provider: settings.provider,
		credentialId,
		modelName: settings.modelName,
	});
}

const modeOptions = computed(() => [
	{
		label: i18n.baseText('settings.agentBuilder.mode.default.label'),
		value: 'default' as const,
	},
	{
		label: i18n.baseText('settings.agentBuilder.mode.custom.label'),
		value: 'custom' as const,
	},
]);

function onModeChange(value: string | number | boolean) {
	store.setMode(value as 'default' | 'custom');
}

/**
 * Whether the current draft is complete enough to persist:
 *   - 'default' is always valid
 *   - 'custom' requires provider + credentialId + modelName
 */
const isDraftValid = computed(() => {
	const draft = store.effectiveSettings;
	if (draft.mode === 'default') return true;
	return Boolean(draft.provider && draft.credentialId && draft.modelName);
});

const canSave = computed(() => store.isDirty && isDraftValid.value);

const statusText = computed(() => {
	const settings = store.effectiveSettings;
	if (settings.mode === 'default') {
		return isProxyAvailable.value
			? i18n.baseText('settings.agentBuilder.status.proxy', {
					interpolate: { model: AGENT_BUILDER_DEFAULT_MODEL },
				})
			: i18n.baseText('settings.agentBuilder.status.envVar');
	}
	if (!settings.credentialId) {
		return i18n.baseText('settings.agentBuilder.status.customIncomplete');
	}
	return i18n.baseText('settings.agentBuilder.status.custom', {
		interpolate: {
			provider: settings.provider,
			model: settings.modelName,
		},
	});
});

async function onSave() {
	try {
		await store.save();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.agentBuilder.saved'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agentBuilder.saveError'));
	}
}

function onCancel() {
	store.discardDraft();
}
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('settings.agentBuilder.section.model') }}
		</N8nHeading>

		<N8nText tag="p" size="small" color="text-light">
			{{ i18n.baseText('settings.agentBuilder.section.help') }}
		</N8nText>

		<div v-if="showModePicker" :class="$style.modeRow">
			<N8nRadioButtons
				:model-value="store.mode"
				:options="modeOptions"
				size="medium"
				@update:model-value="onModeChange"
			/>
		</div>

		<div v-if="showCustomPicker" :class="$style.picker">
			<AgentModelSelector
				:selected-model="selectedAgent"
				:credentials="credentialsByProvider"
				:models-by-provider="filteredAgents"
				:is-loading="isLoading"
				:project-id="projectId"
				:warn-missing-credentials="true"
				horizontal
				@change="onModelChange"
				@select-credential="onSelectCredential"
			/>
		</div>

		<N8nText tag="p" size="small" color="text-light" :class="$style.status">
			{{ statusText }}
		</N8nText>

		<div v-if="canSave" :class="$style.actions">
			<N8nButton type="secondary" size="small" @click="onCancel">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton size="small" :loading="store.isSaving" @click="onSave">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.modeRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.picker {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.status {
	font-style: italic;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
