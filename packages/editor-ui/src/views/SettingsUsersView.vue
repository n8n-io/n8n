<template>
	<SettingsView>
		<div :class="$style.header">
			<n8n-heading size="2xlarge">Users Settings</n8n-heading>
		</div>
		<div>
			<n8n-button float="right" label="Invite new user" icon="plus-square" @click="onInvite" size="large" />
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { INVITE_USER_MODAL_KEY } from '@/constants';
import Vue from 'vue';

import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsUsersView',
	components: {
		SettingsView,
	},
	methods: {
		onInvite() {
			this.$store.dispatch('ui/openModal', INVITE_USER_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
.header {
	margin-bottom: var(--spacing-2xl);
}
</style>
