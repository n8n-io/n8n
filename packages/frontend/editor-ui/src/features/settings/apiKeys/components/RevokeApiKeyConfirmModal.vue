<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ApiKey } from '@n8n/api-types';
import { N8nAlertDialog } from '@n8n/design-system';

const props = defineProps<{
	apiKey: ApiKey | null;
	open: boolean;
	loading?: boolean;
	/** When the caller is not the key owner — admin revoking another user's key. */
	revokingForOther?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.apiKey
		? i18n.baseText('settings.api.revoke.title', {
				interpolate: { label: props.apiKey.label },
			})
		: '',
);

const description = computed(() => {
	if (!props.apiKey) return '';
	if (props.revokingForOther) {
		const owner = props.apiKey.owner;
		const ownerName =
			[owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || owner?.email || '';
		return i18n.baseText('settings.api.revoke.description.other', {
			interpolate: { ownerName },
		});
	}
	return i18n.baseText('settings.api.revoke.description.own');
});
</script>

<template>
	<N8nAlertDialog
		:open="open"
		:title="title"
		:description="description"
		:action-label="i18n.baseText('settings.api.revoke.button')"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="destructive"
		:loading="loading"
		size="medium"
		data-test-id="api-key-revoke-confirm"
		@action="emit('confirm')"
		@cancel="emit('cancel')"
		@update:open="emit('update:open', $event)"
	/>
</template>
