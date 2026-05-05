<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nSelect, N8nSwitch } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonConfig } from '../types';

type MemoryConfig = NonNullable<AgentJsonConfig['memory']>;

const RECENT_MESSAGE_OPTIONS = [5, 10, 25, 50, 100] as const;
type RecentMessageOption = (typeof RECENT_MESSAGE_OPTIONS)[number];

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));

/** Persistent storage types that support semantic recall. */
function patchMemory(patch: Partial<MemoryConfig>) {
	if (!memory.value) return;
	emit('update:config', { memory: { ...memory.value, ...patch } });
}

function isRecentMessageOption(value: number): value is RecentMessageOption {
	return RECENT_MESSAGE_OPTIONS.some((option) => option === value);
}

function onLastMessagesChange(value: unknown) {
	const count = typeof value === 'number' ? value : Number(value);
	if (isRecentMessageOption(count)) patchMemory({ lastMessages: count });
}

function onEnableMemory() {
	emit('update:config', {
		memory: { enabled: true, storage: 'n8n', lastMessages: 10 },
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
		<div :class="$style.header">
			<N8nText tag="h3" :bold="true">{{ i18n.baseText('agents.builder.memory.title') }}</N8nText>
			<N8nSwitch
				:model-value="memory !== null"
				:disabled="props.disabled"
				data-testid="agent-memory-toggle"
				@update:model-value="onMemoryToggle"
			/>
		</div>

		<!-- Configured + enabled state -->
		<template v-if="memory !== null">
			<div :class="$style.row">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.memory.recentMessages.label')
				}}</N8nText>
				<N8nSelect
					:model-value="memory.lastMessages ?? 10"
					size="small"
					:class="$style.inlineSelect"
					data-testid="agent-last-messages-select"
					@update:model-value="onLastMessagesChange"
				>
					<N8nOption
						v-for="option in RECENT_MESSAGE_OPTIONS"
						:key="option"
						:value="option"
						:label="String(option)"
					/>
				</N8nSelect>
			</div>
		</template>
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
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

/* Scoped overlay — header stays interactive so the heading and toggle can render. */
.container.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--spacing--xl);
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

.inlineSelect {
	width: 160px;
}

.divider {
	border: none;
	border-top: var(--border);
	margin: var(--spacing--2xs) 0;
}
</style>
