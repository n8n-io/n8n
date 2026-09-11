<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.card" data-test-id="slot-block-card">
		<N8nIcon icon="file-text" color="text-light" />
		<N8nText color="text-light" size="small" bold>
			{{ i18n.baseText('apps.layout.slot') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg);
	border: 1px dashed var(--border-color);
	border-radius: var(--radius--md);
	background: var(--background--subtle);
}
</style>
