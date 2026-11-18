<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';

const props = defineProps<{ value: string }>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();

async function copy() {
	await clipboard.copy(props.value);
	toast.showMessage({ title: i18n.baseText('generic.copiedToClipboard'), type: 'success' });
}
</script>

<template>
	<N8nButton
		variant="ghost"
		size="xsmall"
		icon-only
		:aria-label="i18n.baseText('docPages.properties.copy')"
		data-testid="doc-property-copy"
		@click.stop="copy"
	>
		<N8nIcon icon="copy" size="small" />
	</N8nButton>
</template>
