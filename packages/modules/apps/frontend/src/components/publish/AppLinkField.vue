<script setup lang="ts">
import { N8nCopyInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{ url: string }>();

const i18n = useI18n();
</script>

<template>
	<N8nInputLabel :label="i18n.baseText('apps.link.label')" size="small" color="text-dark">
		<N8nCopyInput
			:label="i18n.baseText('apps.link.label')"
			:value="url"
			size="medium"
			data-test-id="app-link"
		/>
	</N8nInputLabel>
</template>
