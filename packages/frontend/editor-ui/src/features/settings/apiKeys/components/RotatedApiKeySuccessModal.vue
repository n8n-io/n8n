<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import type { ApiKeyWithRawValue } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nDialog, N8nDialogFooter } from '@n8n/design-system';
import CopyInput from '@/app/components/CopyInput.vue';

defineProps<{
	apiKey: ApiKeyWithRawValue | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('settings.api.rotate.success.title')"
		:description="i18n.baseText('settings.api.rotate.success.copy')"
		data-test-id="api-key-rotated-success"
		@update:open="emit('update:open', $event)"
	>
		<N8nCard v-if="apiKey" class="mb-4xs">
			<CopyInput
				:label="apiKey.label"
				:value="apiKey.rawApiKey"
				:redact-value="true"
				:copy-button-text="i18n.baseText('generic.clickToCopy')"
				:toast-title="i18n.baseText('settings.api.view.copy.toast')"
			/>
		</N8nCard>
		<N8nDialogFooter>
			<N8nButton
				:label="i18n.baseText('settings.api.view.modal.done.button')"
				data-test-id="api-key-rotated-done"
				@click="emit('update:open', false)"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
