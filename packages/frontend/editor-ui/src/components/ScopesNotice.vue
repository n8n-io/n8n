<script lang="ts" setup>
import { useCredentialsStore } from '@/stores/credentials.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nNotice } from '@n8n/design-system';
const credentialsStore = useCredentialsStore();
const i18n = useI18n();

const props = defineProps<{
	activeCredentialType: string;
	scopes: string[];
}>();

const shortCredentialDisplayName = computed((): string => {
	const oauth1Api = i18n.baseText('generic.oauth1Api');
	const oauth2Api = i18n.baseText('generic.oauth2Api');

	return (
		credentialsStore
			.getCredentialTypeByName(props.activeCredentialType)
			?.displayName.replace(new RegExp(`${oauth1Api}|${oauth2Api}`), '')
			.trim() || ''
	);
});

const scopesShortContent = computed((): string => {
	return i18n.baseText('nodeSettings.scopes.notice', {
		adjustToNumber: props.scopes.length,
		interpolate: {
			activeCredential: shortCredentialDisplayName.value,
		},
	});
});

const scopesFullContent = computed((): string => {
	return i18n.baseText('nodeSettings.scopes.expandedNoticeWithScopes', {
		adjustToNumber: props.scopes.length,
		interpolate: {
			activeCredential: shortCredentialDisplayName.value,
			scopes: props.scopes
				.map((s: string) => (s.includes('/') ? s.split('/').pop() : s))
				.join('<br>'),
		},
	});
});
</script>

<template>
	<N8nNotice :content="scopesShortContent" :full-content="scopesFullContent" />
</template>
