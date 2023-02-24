<template>
	<n8n-notice :content="scopesShortContent" :fullContent="scopesFullContent" />
</template>

<script lang="ts">
import { useCredentialsStore } from '@/stores/credentials';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'ScopesNotice',
	props: ['activeCredentialType', 'scopes'],
	computed: {
		...mapStores(useCredentialsStore),
		scopesShortContent(): string {
			return this.$locale.baseText('nodeSettings.scopes.notice', {
				adjustToNumber: this.scopes.length,
				interpolate: {
					activeCredential: this.shortCredentialDisplayName,
				},
			});
		},
		scopesFullContent(): string {
			return this.$locale.baseText('nodeSettings.scopes.expandedNoticeWithScopes', {
				adjustToNumber: this.scopes.length,
				interpolate: {
					activeCredential: this.shortCredentialDisplayName,
					scopes: this.scopes
						.map((s: string) => (s.includes('/') ? s.split('/').pop() : s))
						.join('<br>'),
				},
			});
		},
		shortCredentialDisplayName(): string {
			const oauth1Api = this.$locale.baseText('generic.oauth1Api');
			const oauth2Api = this.$locale.baseText('generic.oauth2Api');

			return this.credentialsStore
				.getCredentialTypeByName(this.activeCredentialType)
				.displayName.replace(new RegExp(`${oauth1Api}|${oauth2Api}`), '')
				.trim();
		},
	},
});
</script>
