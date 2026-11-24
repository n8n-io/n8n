<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.note" data-test-id="app-project-access-note">
		<N8nIcon icon="info" size="small" color="text-light" />
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('apps.access.project') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.note {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
