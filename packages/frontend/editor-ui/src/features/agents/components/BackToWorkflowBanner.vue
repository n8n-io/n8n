<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton } from '@n8n/design-system';

const i18n = useI18n();

defineEmits<{
	back: [];
}>();
</script>

<template>
	<div :class="$style.banner" data-test-id="agent-back-to-workflow">
		<N8nButton
			type="tertiary"
			size="small"
			icon="arrow-left"
			:label="i18n.baseText('agents.backToWorkflow')"
			@click="$emit('back')"
		/>
	</div>
</template>

<style module>
.banner {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	background-color: var(--color--background--light-3);
}
</style>
