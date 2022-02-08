<template>
	<SettingsView>
		<div :class="$style.container">
			<div>
				<n8n-heading size="2xlarge">Users</n8n-heading>
				<div :class="$style.buttonContainer" v-if="!showUMSetupWarning">
						<n8n-tooltip :disabled="isSmtpSetup" placement="bottom">
							<div slot="content">Set up SMTP to invite users. <a href="https://docs.n8n.io/reference/user-management#smtp" target="_blank">Instructions</a></div>
							<div>
								<n8n-button label="Invite" @click="onInvite" size="large" :disabled="!isSmtpSetup" />
							</div>
						</n8n-tooltip>
				</div>
			</div>
			<div v-if="showUMSetupWarning" :class="$style.setupInfoContainer">
				<n8n-action-box
					emoji="😿"
					heading="You’re missing out on user management"
					description="Set up an owner account in order to invite other users. Once set up, each user will need to use a password to access this instance."
					buttonText="Set up my owner account"
					@click="redirectToSetup"
				/>
			</div>
			<div :class="$style.usersContainer" v-else>
				<PageAlert
					v-if="!isSmtpSetup"
					:message="$locale.baseText('SMTP_TO_ADD_USERS_WARNING')"
					:popupClass="$style.alert"
				/>
				<n8n-users-list :users="allUsers" @delete="onDelete" @reinvite="onReinvite" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { INVITE_USER_MODAL_KEY } from '@/constants';
import { mapGetters } from 'vuex';

import SettingsView from './SettingsView.vue';
import PageAlert from '../components/PageAlert.vue';
import { N8nUsersList } from 'n8n-design-system';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'SettingsUsersView',
	components: {
		SettingsView,
		'n8n-users-list': N8nUsersList,
		PageAlert,
	},
	async mounted() {
		if (!this.showUMSetupWarning) {
			await this.$store.dispatch('users/fetchUsers');
		}
	},
	computed: {
		...mapGetters('users', ['allUsers', 'currentUserId', 'showUMSetupWarning']),
		...mapGetters('settings', ['isSmtpSetup']),
	},
	methods: {
		redirectToSetup() {
			this.$router.push({name: 'SetupView'});
		},
		onInvite() {
			this.$store.dispatch('ui/openModal', INVITE_USER_MODAL_KEY);
		},
		async onDelete(userId: string) {
			const getUserById = this.$store.getters['users/getUserById'];
			const user = getUserById(userId) as IUser | null;
			if (user) {
				this.$store.dispatch('ui/openDeleteUserModal', { id: userId });
			}
		},
		async onReinvite(userId: string) {
			const getUserById = this.$store.getters['users/getUserById'];
			const user = getUserById(userId) as IUser | null;
			if (user) {
				try {
					await this.$store.dispatch('users/reinviteUser', { id: user.id });

					this.$showToast({
						type: 'success',
						title: 'Invite resent',
						message: `To ${user.email}`,
					});
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
	padding-right: var(--spacing-2xs);

	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.usersContainer {
	padding-bottom: 100px;

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.buttonContainer {
	display: inline-block;
	float: right;
	margin-bottom: var(--spacing-l);
}

.setupInfoContainer {
	max-width: 728px;
}

.alert {
	left: calc(50% + 100px);
}

</style>
