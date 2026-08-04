<script lang="ts" setup>
import type { ServiceAccount } from '@n8n/api-types';
import { N8nAlertDialog } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { getServiceAccountDisplayName } from '../serviceAccounts.utils';

const props = defineProps<{
	serviceAccount: ServiceAccount | null;
	open: boolean;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const name = computed(() =>
	props.serviceAccount ? getServiceAccountDisplayName(props.serviceAccount) : '',
);
</script>

<template>
	<!--
		Confirmed rather than immediate: this is the last moment the user is
		themselves, and the transition discards the current page.
	-->
	<N8nAlertDialog
		:open="open"
		:title="i18n.baseText('settings.serviceAccounts.actAs.title', { interpolate: { name } })"
		:description="i18n.baseText('settings.serviceAccounts.actAs.description')"
		:action-label="
			i18n.baseText('settings.serviceAccounts.actAs.confirm', { interpolate: { name } })
		"
		:cancel-label="i18n.baseText('generic.cancel')"
		:loading="loading"
		size="medium"
		data-test-id="act-as-service-account-confirm"
		@action="emit('confirm')"
		@cancel="emit('cancel')"
		@update:open="emit('update:open', $event)"
	/>
</template>
