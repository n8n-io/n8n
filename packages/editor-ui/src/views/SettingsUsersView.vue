<template>
	<SettingsView>
		<div :class="$style.container">
			<div>
				<n8n-heading size="2xlarge">Users</n8n-heading>
			</div>
			<div :class="$style.buttonContainer">
					<n8n-button label="Invite new user" icon="plus-square" @click="onInvite" size="large" />
			</div>
			<div>
				<n8n-users-list :users="allUsers" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { INVITE_USER_MODAL_KEY } from '@/constants';
import Vue from 'vue';
import { mapGetters } from 'vuex';

import SettingsView from './SettingsView.vue';
import { N8nUsersList } from 'n8n-design-system';

export default Vue.extend({
	name: 'SettingsUsersView',
	components: {
		SettingsView,
		'n8n-users-list': N8nUsersList,
	},
	computed: {
		...mapGetters('users', ['allUsers']),
	},
	methods: {
		onInvite() {
			this.$store.dispatch('ui/openModal', INVITE_USER_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.buttonContainer {
	display: flex;
	justify-content: right;
}
</style>
