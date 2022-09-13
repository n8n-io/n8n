<template>
	<SettingsView>
		<div :class="$style.container">
			<div>
				<n8n-heading size="2xlarge">{{ $locale.baseText('settings.users') }}</n8n-heading>
				<div :class="$style.buttonContainer" v-if="!showUMSetupWarning">
						<n8n-tooltip :disabled="isSmtpSetup" placement="bottom">
							<i18n slot="content" path="settings.users.setupSMTPToInviteUsers" tag="span">
								<template #action>
									<a
										href="https://docs.n8n.io/reference/user-management.html#step-one-smtp"
										target="_blank"
										v-text="$locale.baseText('settings.users.setupSMTPToInviteUsers.instructions')"
									/>
								</template>
							</i18n>
							<div>
								<n8n-button :label="$locale.baseText('settings.users.invite')" @click="onInvite" size="large" :disabled="!isSmtpSetup" />
							</div>
						</n8n-tooltip>
				</div>
			</div>
			<div v-if="showUMSetupWarning" :class="$style.setupInfoContainer">
				<n8n-action-box
					:heading="$locale.baseText('settings.users.setupToInviteUsers')"
					:buttonText="$locale.baseText('settings.users.setupMyAccount')"
					:description="$locale.baseText('settings.users.setupToInviteUsersInfo')"
					@click="redirectToSetup"
				/>
			</div>
			<div :class="$style.usersContainer" v-else>
				<PageAlert
					v-if="!isSmtpSetup"
					:message="$locale.baseText('settings.users.smtpToAddUsersWarning')"
					:popupClass="$style.alert"
				/>
				<n8n-users-list :users="allUsers" :currentUserId="currentUserId" @delete="onDelete" @reinvite="onReinvite" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { INVITE_USER_MODAL_KEY, VIEWS } from '@/constants';
import { mapGetters } from 'vuex';

import SettingsView from './SettingsView.vue';
import PageAlert from '../components/PageAlert.vue';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'SettingsUsersView',
	components: {
		SettingsView,
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
			this.$router.push({name: VIEWS.SETUP});
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
						title: this.$locale.baseText('settings.users.inviteResent'),
						message: this.$locale.baseText(
							'settings.users.emailSentTo',
							{ interpolate: { email: user.email || '' } },
						),
					});
				} catch (e) {
					this.$showError(e, this.$locale.baseText('settings.users.userReinviteError'));
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
