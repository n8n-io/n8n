<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '@n8n/chat/composables';
import type { CredentialStatus } from '@n8n/chat/types';

const props = defineProps<{
	status: CredentialStatus;
}>();

const { t } = useI18n();

const message = computed(() => {
	if (props.status.testMode) {
		return t('credentialStatusTestMode');
	}

	const template =
		props.status.missingCount === 1
			? t('credentialStatusMissingAccount')
			: t('credentialStatusMissingAccounts');

	return template.replace('{count}', String(props.status.missingCount));
});
</script>

<template>
	<div class="chat-credential-status" data-test-id="chat-credential-status-strip">
		{{ message }}
	</div>
</template>

<style lang="scss">
.chat-credential-status {
	padding: var(--chat--credential-status--padding, 0.75em 1em);
	background: var(--chat--credential-status--background, var(--chat--color-light-shade-50));
	color: var(--chat--credential-status--color, var(--chat--color-dark));
	font-size: var(--chat--credential-status--font-size, 0.85em);
	border-top: var(
		--chat--credential-status--border-top,
		1px solid var(--chat--color-light-shade-100)
	);
}
</style>
