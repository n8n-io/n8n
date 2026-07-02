<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nInlineTextEdit } from '@n8n/design-system';
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

function onNameUpdate(value: string) {
	emit('update:config', { name: value });
}
</script>

<template>
	<div :class="$style.text" data-testid="agent-identity-header">
		<div
			:class="$style.personalisationIcon"
			aria-hidden="true"
			data-testid="agent-personalisation-icon"
		>
			<N8nIcon icon="bot" :size="24" />
		</div>
		<N8nInlineTextEdit
			:model-value="name"
			:placeholder="i18n.baseText('agents.builder.agent.name.placeholder')"
			:disabled="props.disabled"
			max-width="100%"
			:min-width="96"
			:class="$style.title"
			data-testid="agent-name-inline-edit"
			@update:model-value="onNameUpdate"
		/>
	</div>
</template>

<style module lang="scss">
.text {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	flex: 1;
	min-width: 0;
}

.personalisationIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
	border: var(--border);
	border-radius: 50%;
	color: var(--icon-color--strong);
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-3)
	);
}

.title {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	text-align: left;
	color: var(--text-color);
}
</style>
