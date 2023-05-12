<template>
	<div :class="$style.container">
		<div>
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.users') }}</n8n-heading>
			<div :class="$style.buttonContainer" v-if="!usersStore.showUMSetupWarning">
				<n8n-tooltip :disabled="!ssoStore.isSamlLoginEnabled">
					<template #content>
						<span> {{ $locale.baseText('settings.users.invite.tooltip') }} </span>
					</template>
					<div>
						<n8n-button
							:disabled="ssoStore.isSamlLoginEnabled"
							:label="$locale.baseText('settings.users.invite')"
							@click="onInvite"
							size="large"
							data-test-id="settings-users-invite-button"
						/>
					</div>
				</n8n-tooltip>
			</div>
		</div>
		<div v-if="!settingsStore.isUserManagementEnabled" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.title)
				"
				:description="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.users.settings.unavailable.description,
					)
				"
				:buttonText="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.button)
				"
				@click="goToUpgrade"
			/>
		</div>
		<div v-else-if="usersStore.showUMSetupWarning" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="$locale.baseText('settings.users.setupToInviteUsers')"
				:buttonText="$locale.baseText('settings.users.setupMyAccount')"
				:description="`${
					isSharingEnabled ? '' : $locale.baseText('settings.users.setupToInviteUsersInfo')
				}`"
				@click="redirectToSetup"
			/>
		</div>
		<div :class="$style.usersContainer" v-else>
			<n8n-users-list
				:actions="usersListActions"
				:users="usersStore.allUsers"
				:currentUserId="usersStore.currentUserId"
				@delete="onDelete"
				@reinvite="onReinvite"
				@copyInviteLink="onCopyInviteLink"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { EnterpriseEditionFeature, INVITE_USER_MODAL_KEY, VIEWS } from '@/constants';

import PageAlert from '../components/PageAlert.vue';
import type { IUser, IUserListAction } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';
import { copyPaste } from '@/mixins/copyPaste';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useUsageStore } from '@/stores/usage.store';
import { useSSOStore } from '@/stores/sso.store';

export default mixins(showMessage, copyPaste).extend({
	name: 'SettingsUsersView',
	components: {
		PageAlert,
	},
	async mounted() {
		if (!this.usersStore.showUMSetupWarning) {
			await this.usersStore.fetchUsers();
		}
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useUsageStore, useSSOStore),
		isSharingEnabled() {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		usersListActions(): IUserListAction[] {
			return [
				{
					label: this.$locale.baseText('settings.users.actions.copyInviteLink'),
					value: 'copyInviteLink',
					guard: (user) => !user.firstName && !!user.inviteAcceptUrl,
				},
				{
					label: this.$locale.baseText('settings.users.actions.reinvite'),
					value: 'reinvite',
					guard: (user) => !user.firstName && this.settingsStore.isSmtpSetup,
				},
				{
					label: this.$locale.baseText('settings.users.actions.delete'),
					value: 'delete',
				},
			];
		},
	},
	methods: {
		redirectToSetup() {
			void this.$router.push({ name: VIEWS.SETUP });
		},
		onInvite() {
			this.uiStore.openModal(INVITE_USER_MODAL_KEY);
		},
		async onDelete(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user) {
				this.uiStore.openDeleteUserModal(userId);
			}
		},
		async onReinvite(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user) {
				try {
					await this.usersStore.reinviteUser({ id: user.id });

					this.$showToast({
						type: 'success',
						title: this.$locale.baseText('settings.users.inviteResent'),
						message: this.$locale.baseText('settings.users.emailSentTo', {
							interpolate: { email: user.email || '' },
						}),
					});
				} catch (e) {
					this.$showError(e, this.$locale.baseText('settings.users.userReinviteError'));
				}
			}
		},
		async onCopyInviteLink(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user?.inviteAcceptUrl) {
				this.copyToClipboard(user.inviteAcceptUrl);

				this.$showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.inviteUrlCreated'),
					message: this.$locale.baseText('settings.users.inviteUrlCreated.message'),
				});
			}
		},
		goToUpgrade() {
			this.uiStore.goToUpgrade('users', 'upgrade-users');
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
