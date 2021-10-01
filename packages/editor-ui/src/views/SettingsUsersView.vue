<template>
	<SettingsView>
		<div :class="$style.container">
			<div>
				<n8n-heading size="2xlarge">Users</n8n-heading>
			</div>
			<div :class="$style.buttonContainer">
					<n8n-button label="Invite new user" icon="plus-square" @click="onInvite" size="large" />
			</div>
			<div :class="$style.usersList">
				<n8n-users-list :users="allUsers" @delete="onDelete" @reinvite="onReinvite" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { INVITE_USER_MODAL_KEY } from '@/constants';
import { mapGetters } from 'vuex';

import SettingsView from './SettingsView.vue';
import { N8nUsersList } from 'n8n-design-system';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(showMessage).extend({
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
		async onDelete(userId: string) {
			const getUserById = this.$store.getters['users/getUserById'];
			const user = getUserById(userId) as IUser | null;
			if (user) {
				if (!user.firstName) {
					const confirm = await this.confirmMessage('Are you sure you want to delete this invited user?', 'Delete invited user');
					if (confirm) {
						try {
							await this.$store.dispatch('users/deleteUser', {id: user.id});
						} catch (e) {
							this.$showError(e, 'Problem deleting user');
						}
					}
				}
				else {
					this.$store.dispatch('ui/openDeleteUserModal', {id: userId});
				}
			}
		},
		async onReinvite(userId: string) {
			const getUserById = this.$store.getters['users/getUserById'];
			const user = getUserById(userId) as IUser | null;
			if (user) {
				try {
					await this.$store.dispatch('users/reinviteUser', {id: user.id});
				} catch (e) {
					this.$showError(e, 'Problem inviting user');
				}
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	overflow: hidden;
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.buttonContainer {
	display: flex;
	justify-content: right;
}

.usersList {
	overflow: auto;
	height: 100%;
	padding-bottom: var(--spacing-5xl);
}

</style>
