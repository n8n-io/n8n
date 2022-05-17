<template>
	<n8n-notice
		v-if="this.scopes.length > 0"
		:content="scopesShortContent"
		:fullContent="scopesFullContent"
	/>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'ScopesNotice',
	props: [
		'scopes',
		'shortCredentialDisplayName',
	],
	computed: {
		scopesShortContent (): string {
			return this.$locale.baseText(
				'nodeSettings.scopes.notice',
				{
					adjustToNumber: this.scopes.length,
					interpolate: {
						activeCredential: this.shortCredentialDisplayName,
					},
				},
			);
		},
		scopesFullContent (): string {
			return this.$locale.baseText(
				'nodeSettings.scopes.expandedNoticeWithScopes',
				{
					adjustToNumber: this.scopes.length,
					interpolate: {
						activeCredential: this.shortCredentialDisplayName,
						scopes: this.scopes.map(
							(scope: string) => scope.replace(/\//g, '/<wbr>'),
						).join('<br>'),
					},
				},
			);
		},
	},
});
</script>
