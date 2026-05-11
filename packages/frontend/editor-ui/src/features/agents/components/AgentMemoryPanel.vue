<script setup lang="ts">
import { computed } from 'vue';
import { N8nSwitch, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY } from '../constants';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const uiStore = useUIStore();

const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
const episodicMemoryCredential = computed(() =>
	episodicMemory.value?.enabled ? episodicMemory.value.credential : null,
);

function onEnableMemory() {
	const existingMemory = props.config?.memory;
	emit('update:config', {
		memory: {
			...existingMemory,
			enabled: true,
			storage: 'n8n',
			lastMessages: existingMemory?.lastMessages ?? 10,
		},
	});
}

function onDisableMemory() {
	emit('update:config', {
		memory: { ...(props.config?.memory ?? { storage: 'n8n' as const }), enabled: false },
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
	const updatedMemory: NonNullable<AgentJsonConfig['memory']> = {
		...existingMemory,
		enabled: true,
		storage: 'n8n',
		lastMessages: existingMemory?.lastMessages ?? 10,
		episodicMemory: {
			enabled: true,
			credential: credentialId,
		},
	};

	emit('update:config', { memory: updatedMemory });
}

function disableEpisodicMemory() {
	const updatedMemory: NonNullable<AgentJsonConfig['memory']> = {
		...props.config?.memory,
		enabled: props.config?.memory?.enabled ?? false,
		storage: 'n8n',
		episodicMemory: { enabled: false },
	};

	emit('update:config', { memory: updatedMemory });
}

function onEpisodicMemoryToggle(enabled: boolean) {
	if (!enabled) {
		disableEpisodicMemory();
		return;
	}

	uiStore.openModalWithData({
		name: AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY,
		data: {
			initialValue: episodicMemoryCredential.value,
			onSelect: enableEpisodicMemory,
		},
	});
}
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.memory.title')
				}}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.memory.description') }}
				</N8nText>
			</div>
			<N8nSwitch
				:model-value="memory !== null"
				:disabled="props.disabled"
				data-testid="agent-memory-toggle"
				@update:model-value="onMemoryToggle"
			/>
		</div>

		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
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
	flex: 1;
	min-width: 0;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.disabled {
	opacity: 0.6;
}
</style>
