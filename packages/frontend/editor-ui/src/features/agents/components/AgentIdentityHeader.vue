<script setup lang="ts">
import { computed } from 'vue';
import { N8nInlineTextEdit } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:config': [changes: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();

const name = computed(() => props.config?.name ?? '');
const description = computed(() => props.config?.description ?? '');

function onNameUpdate(value: string) {
	emit('update:config', { name: value });
}

function onDescriptionUpdate(value: string) {
	emit('update:config', { description: value || undefined });
}
</script>

<template>
	<div :class="$style.text" data-testid="agent-identity-header">
		<N8nInlineTextEdit
			:model-value="name"
			:placeholder="i18n.baseText('agents.builder.agent.name.placeholder')"
			:disabled="props.disabled"
			max-width="80%"
			:min-width="96"
			:class="$style.title"
			data-testid="agent-name-inline-edit"
			@update:model-value="onNameUpdate"
		/>
		<N8nInlineTextEdit
			:model-value="description"
			:placeholder="i18n.baseText('agents.builder.agent.description.placeholder')"
			:disabled="props.disabled"
			max-width="80%"
			:min-width="96"
			:class="$style.description"
			data-testid="agent-description-inline-edit"
			@update:model-value="onDescriptionUpdate"
		/>
	</div>
</template>

<style module lang="scss">
.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	color: var(--text-color);
}

.description {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	color: var(--text-color--subtler);
}
</style>
