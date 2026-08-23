<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';

const i18n = useI18n();

defineEmits<{
	back: [];
}>();
</script>

<template>
	<button
		type="button"
		:class="$style.banner"
		data-test-id="agent-back-to-workflow"
		@click="$emit('back')"
	>
		<N8nIcon icon="arrow-left" size="large" />
		<span :class="$style.label">{{ i18n.baseText('agents.backToWorkflow') }}</span>
	</button>
</template>

<style module>
.banner {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--sm);
	border: none;
	border-bottom: var(--border-width, 1px) solid var(--color--purple-500);
	background-color: var(--color--purple-50);
	color: var(--color--purple-950);
	cursor: pointer;
}

/* Dark mode: darker purple surface with light text */
:global(body[data-theme='dark']) .banner {
	border-bottom-color: var(--color--purple-700);
	background-color: var(--color--purple-800);
	color: var(--color--neutral-white);
}

@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .banner {
		border-bottom-color: var(--color--purple-700);
		background-color: var(--color--purple-800);
		color: var(--color--neutral-white);
	}
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
}
</style>
