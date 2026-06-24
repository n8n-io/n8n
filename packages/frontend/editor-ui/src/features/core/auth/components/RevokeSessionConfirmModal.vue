<script lang="ts" setup>
import { N8nAlertDialog } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	open: boolean;
	/** `single` revokes one session; `all` revokes every other session. */
	mode: 'single' | 'all';
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.mode === 'all'
		? i18n.baseText('settings.personal.loginSessions.revokeAll.title')
		: i18n.baseText('settings.personal.loginSessions.revoke.title'),
);

const description = computed(() =>
	props.mode === 'all'
		? i18n.baseText('settings.personal.loginSessions.revokeAll.description')
		: i18n.baseText('settings.personal.loginSessions.revoke.description'),
);
</script>

<template>
	<N8nAlertDialog
		:open="open"
		:title="title"
		:description="description"
		:action-label="i18n.baseText('settings.personal.loginSessions.revoke.button')"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="destructive"
		:loading="loading"
		size="medium"
		data-test-id="login-session-revoke-confirm"
		@action="emit('confirm')"
		@cancel="emit('cancel')"
		@update:open="emit('update:open', $event)"
	/>
</template>
