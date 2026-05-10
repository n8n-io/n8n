<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nSwitch } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(defineProps<{ config: AgentJsonConfig | null; disabled?: boolean }>(), {
	disabled: false,
});
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));

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
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText tag="h3" :bold="true">{{ i18n.baseText('agents.builder.memory.title') }}</N8nText>
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
