<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { N8nAlertDialog } from '@n8n/design-system';

const props = defineProps<{
	client: OAuthClientResponseDto | null;
	open: boolean;
	loading?: boolean;
	/** When the caller is not the consent owner — admin revoking another user's client. */
	revokingForOther?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.client
		? i18n.baseText('settings.mcp.oAuthClients.revoke.title', {
				interpolate: { name: props.client.name },
			})
		: '',
);

const description = computed(() => {
	if (!props.client) return '';
	if (props.revokingForOther) {
		const owner = props.client.owner;
		const ownerName =
			[owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || owner?.email || '';
		return i18n.baseText('settings.mcp.oAuthClients.revoke.description.other', {
			interpolate: { ownerName },
		});
	}
	return i18n.baseText('settings.mcp.oAuthClients.revoke.description.own');
});
</script>

<template>
	<N8nAlertDialog
		:open="open"
		:title="title"
		:description="description"
		:action-label="i18n.baseText('settings.mcp.oAuthClients.revoke.button')"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="destructive"
		:loading="loading"
		size="medium"
		data-test-id="mcp-client-revoke-confirm"
		@action="emit('confirm')"
		@cancel="emit('cancel')"
		@update:open="emit('update:open', $event)"
	/>
</template>
