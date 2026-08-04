<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<N8nIcon icon="wand-sparkles" :class="$style.icon" />
		<h3 :class="$style.title">
			{{ i18n.baseText('aiAssistant.builder.existingWorkflow.emptyState.title') }}
		</h3>
		<p :class="$style.body">
			{{ i18n.baseText('aiAssistant.builder.existingWorkflow.emptyState.body') }}
		</p>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 0 var(--spacing--lg);
}

.icon {
	font-size: 32px;
	color: var(--color--text);
	margin-bottom: var(--spacing--xs);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0 0 var(--spacing--sm) 0;
	line-height: var(--line-height--lg);
}

.body {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0 0 var(--spacing--xs) 0;
	max-width: 289px;
}
</style>
