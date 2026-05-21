<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nText, N8nSwitch } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY,
	AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE,
	DEFAULT_AGENT_MEMORY_LAST_MESSAGES,
} from '../constants';
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
const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(
	() => memory.value !== null && episodicMemory.value?.enabled === true,
);
const episodicMemoryCredential = computed(() =>
	episodicMemory.value?.enabled === true ? episodicMemory.value.credential : null,
);

function onEnableMemory() {
	const existingMemory = props.config?.memory;
	emit('update:config', {
		memory: {
			...existingMemory,
			enabled: true,
			storage: 'n8n',
			lastMessages: existingMemory?.lastMessages ?? DEFAULT_AGENT_MEMORY_LAST_MESSAGES,
		},
	});
}

function onDisableMemory() {
	emit('update:config', {
		memory: {
			...(props.config?.memory ?? { storage: 'n8n' as const }),
			enabled: false,
			episodicMemory: { enabled: false },
		},
	});
}

function onMemoryToggle(enabled: boolean) {
	if (enabled) {
		onEnableMemory();
	} else {
		onDisableMemory();
	}
}

function enableEpisodicMemory(credentialId: string) {
	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;
	emit('update:config', {
		memory: {
			...existingMemory,
			enabled: true,
			storage: 'n8n',
			lastMessages: existingMemory?.lastMessages ?? DEFAULT_AGENT_MEMORY_LAST_MESSAGES,
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
			...(props.config?.memory ?? { storage: 'n8n' as const }),
			enabled: props.config?.memory?.enabled ?? false,
			episodicMemory: { enabled: false },
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
			confirmLabel: i18n.baseText('agents.builder.episodicMemoryCredentialModal.confirm'),
			showDelete: false,
			hideCreateNew: false,
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
		<div :class="$style.titleGroup">
			<div :class="$style.header">
				<N8nText tag="h3" :bold="true">{{ i18n.baseText('agents.builder.memory.title') }}</N8nText>
				<N8nSwitch
					:model-value="memory !== null"
					:disabled="props.disabled"
					data-testid="agent-memory-toggle"
					@update:model-value="onMemoryToggle"
				/>
			</div>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.memory.description') }}
			</N8nText>
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
				<N8nButton
					v-if="episodicMemoryEnabled"
					variant="ghost"
					size="small"
					:disabled="props.disabled"
					data-testid="agent-episodic-memory-change-credential"
					@click="openEpisodicMemoryCredentialModal"
				>
					{{ i18n.baseText('agents.builder.memory.episodicMemory.changeCredential') }}
				</N8nButton>
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
