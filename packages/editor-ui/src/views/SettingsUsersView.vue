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
				:isSamlLoginEnabled="ssoStore.isSamlLoginEnabled"
				@delete="onDelete"
				@reinvite="onReinvite"
				@copyInviteLink="onCopyInviteLink"
				@copyPasswordResetLink="onCopyPasswordResetLink"
				@allowSSOManualLogin="onAllowSSOManualLogin"
				@disallowSSOManualLogin="onDisallowSSOManualLogin"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { EnterpriseEditionFeature, INVITE_USER_MODAL_KEY, VIEWS } from '@/constants';

import type { IUser, IUserListAction } from '@/Interface';
import { useToast } from '@/composables';
import { copyPaste } from '@/mixins/copyPaste';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useUsageStore } from '@/stores/usage.store';
import { useSSOStore } from '@/stores/sso.store';

export default defineComponent({
	name: 'SettingsUsersView',
	mixins: [copyPaste],
	setup() {
		return {
			...useToast(),
		};
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
				{
					label: this.$locale.baseText('settings.users.actions.copyPasswordResetLink'),
					value: 'copyPasswordResetLink',
				},
				{
					label: this.$locale.baseText('settings.users.actions.allowSSOManualLogin'),
					value: 'allowSSOManualLogin',
					guard: (user) =>
						this.settingsStore.isSamlLoginEnabled && !user.settings?.allowSSOManualLogin,
				},
				{
					label: this.$locale.baseText('settings.users.actions.disallowSSOManualLogin'),
					value: 'disallowSSOManualLogin',
					guard: (user) =>
						this.settingsStore.isSamlLoginEnabled && user.settings?.allowSSOManualLogin === true,
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

					this.showToast({
						type: 'success',
						title: this.$locale.baseText('settings.users.inviteResent'),
						message: this.$locale.baseText('settings.users.emailSentTo', {
							interpolate: { email: user.email || '' },
						}),
					});
				} catch (e) {
					this.showError(e, this.$locale.baseText('settings.users.userReinviteError'));
				}
			}
		},
		async onCopyInviteLink(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user?.inviteAcceptUrl) {
				this.copyToClipboard(user.inviteAcceptUrl);

				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.inviteUrlCreated'),
					message: this.$locale.baseText('settings.users.inviteUrlCreated.message'),
				});
			}
		},
		async onCopyPasswordResetLink(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user) {
				const url = await this.usersStore.getUserPasswordResetLink(user);
				this.copyToClipboard(url.link);

				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.passwordResetUrlCreated'),
					message: this.$locale.baseText('settings.users.passwordResetUrlCreated.message'),
				});
			}
		},
		async onAllowSSOManualLogin(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user?.settings) {
				user.settings.allowSSOManualLogin = true;
				await this.usersStore.updateOtherUserSettings(userId, user.settings);

				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.allowSSOManualLogin'),
					message: this.$locale.baseText('settings.users.allowSSOManualLogin.message'),
				});
			}
		},
		async onDisallowSSOManualLogin(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user?.settings) {
				user.settings.allowSSOManualLogin = false;
				await this.usersStore.updateOtherUserSettings(userId, user.settings);
				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.disallowSSOManualLogin'),
					message: this.$locale.baseText('settings.users.disallowSSOManualLogin.message'),
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
