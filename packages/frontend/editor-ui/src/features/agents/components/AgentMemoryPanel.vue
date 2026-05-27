<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nTooltip, N8nIconButton, N8nText, N8nSwitch } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY,
	AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE,
	DEFAULT_AGENT_MEMORY_LAST_MESSAGES,
} from '../constants';
import AgentModelSelector from './AgentModelSelector.vue';
import { modelToString } from '../utils/model-string';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const uiStore = useUIStore();
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
const episodicMemoryCredential = computed(() =>
	episodicMemory.value?.enabled === true ? episodicMemory.value.credential : null,
);
const configuredMemoryModel = computed(() => {
	if (episodicMemory.value?.enabled !== true) return null;

	return (
		episodicMemory.value.reflectorModel?.model ??
		episodicMemory.value.extractorModel?.model ??
		props.config?.memory?.observationalMemory?.reflectorModel?.model ??
		props.config?.memory?.observationalMemory?.observerModel?.model ??
		null
	);
});
const selectedMemoryModel = ref<string | null>(configuredMemoryModel.value);

watch(configuredMemoryModel, (model) => {
	selectedMemoryModel.value = model;
});

function buildEnabledMemoryConfig() {
	const existingMemory = props.config?.memory;

	return {
		...existingMemory,
		enabled: true,
		storage: 'n8n' as const,
		lastMessages: existingMemory?.lastMessages ?? DEFAULT_AGENT_MEMORY_LAST_MESSAGES,
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

function onMemoryRecallModelChange(selection: { model: string; credentialId: string | null }) {
	if (!selection.credentialId) return;

	selectedMemoryModel.value = selection.model;
	const workerModel = { model: selection.model, credential: selection.credentialId };

	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;

	if (existingEpisodicMemory?.enabled !== true) return;

	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			observationalMemory: {
				...existingMemory?.observationalMemory,
				observerModel: workerModel,
				reflectorModel: workerModel,
			},
			episodicMemory: {
				...existingEpisodicMemory,
				extractorModel: workerModel,
				reflectorModel: workerModel,
			},
		},
	});
}

function openEpisodicMemoryCredentialModal() {
	uiStore.openModalWithData({
		name: AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY,
		data: {
			credentialType: AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE,
			displayName: 'OpenAI',
			initialValue: episodicMemoryCredential.value,
			title: i18n.baseText('agents.builder.episodicMemoryCredentialModal.title'),
			description: i18n.baseText('agents.builder.episodicMemoryCredentialModal.description'),
			cancelLabel: i18n.baseText('generic.cancel'),
			confirmLabel: i18n.baseText('generic.connect'),
			showDelete: false,
			hideCreateNew: true,
			source: 'agent_episodic_memory',
			pickerDataTestId: 'agent-episodic-memory-credential-picker',
			onSelect: (credentialId: string | null) => {
				if (credentialId) enableEpisodicMemory(credentialId);
			},
		},
	});
}

function onEpisodicMemoryToggle(enabled: boolean) {
	if (!enabled) {
		disableEpisodicMemory();
		return;
	}

	openEpisodicMemoryCredentialModal();
}
</script>

<template>
	<div :class="[$style.container, props.disabled && $style.disabled]">
		<div v-if="episodicMemoryEnabled" :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText :bold="true">
					{{ i18n.baseText('agents.builder.memory.recallModel.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.memory.recallModel.hint') }}
				</N8nText>
			</div>
			<div :class="$style.modelSelector">
				<AgentModelSelector
					:model="selectedMemoryModel"
					:default-model="modelToString(props.config?.model)"
					data-testid="agent-memory-recall-model-selector"
					@change="onMemoryRecallModelChange"
				/>
			</div>
		</div>

		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText :bold="true">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.hint') }}
				</N8nText>
			</div>
			<div :class="$style.actions">
				<N8nTooltip>
					<template #content>
						{{ i18n.baseText('agents.builder.memory.episodicMemory.changeCredential') }}
					</template>
					<N8nIconButton
						v-if="episodicMemoryEnabled"
						variant="ghost"
						size="small"
						icon-size="medium"
						icon="cog"
						:disabled="props.disabled"
						data-testid="agent-episodic-memory-change-credential"
						@click="openEpisodicMemoryCredentialModal"
					/>
				</N8nTooltip>
				<N8nSwitch
					:model-value="episodicMemoryEnabled"
					:disabled="props.disabled"
					data-testid="agent-episodic-memory-toggle"
					@update:model-value="(value) => onEpisodicMemoryToggle(Boolean(value))"
				/>
			</div>
		</div>
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
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
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

.modelSelector {
	display: flex;
	justify-content: flex-end;
	margin-left: auto;
	min-width: 280px;
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
