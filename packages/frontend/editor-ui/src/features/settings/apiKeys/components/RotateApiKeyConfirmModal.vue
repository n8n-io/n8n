<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ApiKey } from '@n8n/api-types';
import { N8nAlertDialog } from '@n8n/design-system';

const props = defineProps<{
	apiKey: ApiKey | null;
	open: boolean;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.apiKey
		? i18n.baseText('settings.api.rotate.title', {
				interpolate: { label: props.apiKey.label },
			})
		: '',
);
</script>

<template>
	<N8nAlertDialog
		:open="open"
		:title="title"
		:description="i18n.baseText('settings.api.rotate.description')"
		:action-label="i18n.baseText('settings.api.rotate.button')"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="solid"
		:loading="loading"
		size="medium"
		data-test-id="api-key-rotate-confirm"
		@action="emit('confirm')"
		@cancel="emit('cancel')"
		@update:open="emit('update:open', $event)"
	/>
</template>
