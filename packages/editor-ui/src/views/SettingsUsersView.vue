<template>
	<div :class="$style.container">
		<div>
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.users') }}</n8n-heading>
			<div v-if="!showUMSetupWarning" :class="$style.buttonContainer">
				<n8n-tooltip :disabled="!ssoStore.isSamlLoginEnabled">
					<template #content>
						<span> {{ $locale.baseText('settings.users.invite.tooltip') }} </span>
					</template>
					<div>
						<n8n-button
							:disabled="ssoStore.isSamlLoginEnabled || !settingsStore.isBelowUserQuota"
							:label="$locale.baseText('settings.users.invite')"
							size="large"
							data-test-id="settings-users-invite-button"
							@click="onInvite"
						/>
					</div>
				</n8n-tooltip>
			</div>
		</div>
		<div v-if="!settingsStore.isBelowUserQuota" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.title)
				"
				:description="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.users.settings.unavailable.description,
					)
				"
				:button-text="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.button)
				"
				@click:button="goToUpgrade"
			/>
		</div>
		<n8n-notice v-if="!isAdvancedPermissionsEnabled">
			<i18n-t keypath="settings.users.advancedPermissions.warning">
				<template #link>
					<n8n-link size="small" @click="goToUpgradeAdvancedPermissions">
						{{ $locale.baseText('settings.users.advancedPermissions.warning.link') }}
					</n8n-link>
				</template>
			</i18n-t>
		</n8n-notice>
		<!-- If there's more than 1 user it means the account quota was more than 1 in the past. So we need to allow instance owner to be able to delete users and transfer workflows.
		-->
		<div
			v-if="settingsStore.isBelowUserQuota || usersStore.allUsers.length > 1"
			:class="$style.usersContainer"
		>
			<n8n-users-list
				:actions="usersListActions"
				:users="usersStore.allUsers"
				:current-user-id="usersStore.currentUserId"
				:is-saml-login-enabled="ssoStore.isSamlLoginEnabled"
				@delete="onDelete"
				@reinvite="onReinvite"
				@copyInviteLink="onCopyInviteLink"
				@copyPasswordResetLink="onCopyPasswordResetLink"
				@allowSSOManualLogin="onAllowSSOManualLogin"
				@disallowSSOManualLogin="onDisallowSSOManualLogin"
			>
				<template #actions="{ user }">
					<n8n-select
						v-if="user.id !== usersStore.currentUserId"
						:model-value="user?.globalRole?.name || 'member'"
						:disabled="!canUpdateRole"
						data-test-id="user-role-select"
						@update:modelValue="onRoleChange(user, $event)"
					>
						<n8n-option
							v-for="role in userRoles"
							:key="role.value"
							:value="role.value"
							:label="role.label"
							:disabled="role.disabled"
						/>
					</n8n-select>
				</template>
			</n8n-users-list>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { EnterpriseEditionFeature, INVITE_USER_MODAL_KEY, VIEWS } from '@/constants';

import type { IUser, IUserListAction, InvitableRoleName } from '@/Interface';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useUsageStore } from '@/stores/usage.store';
import { useSSOStore } from '@/stores/sso.store';
import { hasPermission } from '@/rbac/permissions';
import { ROLE } from '@/utils/userUtils';
import { useClipboard } from '@/composables/useClipboard';
import type { UpdateGlobalRolePayload } from '@/api/users';

export default defineComponent({
	name: 'SettingsUsersView',
	setup() {
		const clipboard = useClipboard();

		return {
			clipboard,
			...useToast(),
		};
	},
	async mounted() {
		if (!this.showUMSetupWarning) {
			await this.usersStore.fetchUsers();
		}
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useUsageStore, useSSOStore),
		isSharingEnabled() {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		showUMSetupWarning() {
			return hasPermission(['defaultUser']);
		},
		usersListActions(): IUserListAction[] {
			return [
				{
					label: this.$locale.baseText('settings.users.actions.copyInviteLink'),
					value: 'copyInviteLink',
					guard: (user) =>
						this.settingsStore.isBelowUserQuota && !user.firstName && !!user.inviteAcceptUrl,
				},
				{
					label: this.$locale.baseText('settings.users.actions.reinvite'),
					value: 'reinvite',
					guard: (user) =>
						this.settingsStore.isBelowUserQuota &&
						!user.firstName &&
						this.settingsStore.isSmtpSetup,
				},
				{
					label: this.$locale.baseText('settings.users.actions.delete'),
					value: 'delete',
					guard: (user) =>
						hasPermission(['rbac'], { rbac: { scope: 'user:delete' } }) &&
						user.id !== this.usersStore.currentUserId,
				},
				{
					label: this.$locale.baseText('settings.users.actions.copyPasswordResetLink'),
					value: 'copyPasswordResetLink',
					guard: (user) =>
						hasPermission(['rbac'], { rbac: { scope: 'user:resetPassword' } }) &&
						this.settingsStore.isBelowUserQuota &&
						!user.isPendingUser &&
						user.id !== this.usersStore.currentUserId,
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
		isAdvancedPermissionsEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(
				EnterpriseEditionFeature.AdvancedPermissions,
			);
		},
		userRoles(): Array<{ value: IRole; label: string; disabled?: boolean }> {
			return [
				{
					value: ROLE.Member,
					label: this.$locale.baseText('auth.roles.member'),
				},
				{
					value: ROLE.Admin,
					label: this.$locale.baseText('auth.roles.admin'),
					disabled: !this.isAdvancedPermissionsEnabled,
				},
			];
		},
		canUpdateRole(): boolean {
			return hasPermission(['rbac'], { rbac: { scope: ['user:update', 'user:changeRole'] } });
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
			const user = this.usersStore.getUserById(userId);
			if (user) {
				this.uiStore.openDeleteUserModal(userId);
			}
		},
		async onReinvite(userId: string) {
			const user = this.usersStore.getUserById(userId);
			if (user?.email && user?.globalRole) {
				if (!['admin', 'member'].includes(user.globalRole.name)) {
					throw new Error('Invalid role name on reinvite');
				}
				try {
					await this.usersStore.reinviteUser({
						email: user.email,
						role: user.globalRole.name as InvitableRoleName,
					});
					this.showToast({
						type: 'success',
						title: this.$locale.baseText('settings.users.inviteResent'),
						message: this.$locale.baseText('settings.users.emailSentTo', {
							interpolate: { email: user.email ?? '' },
						}),
					});
				} catch (e) {
					this.showError(e, this.$locale.baseText('settings.users.userReinviteError'));
				}
			}
		},
		async onCopyInviteLink(userId: string) {
			const user = this.usersStore.getUserById(userId);
			if (user?.inviteAcceptUrl) {
				void this.clipboard.copy(user.inviteAcceptUrl);

				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.inviteUrlCreated'),
					message: this.$locale.baseText('settings.users.inviteUrlCreated.message'),
				});
			}
		},
		async onCopyPasswordResetLink(userId: string) {
			const user = this.usersStore.getUserById(userId);
			if (user) {
				const url = await this.usersStore.getUserPasswordResetLink(user);
				void this.clipboard.copy(url.link);

				this.showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.passwordResetUrlCreated'),
					message: this.$locale.baseText('settings.users.passwordResetUrlCreated.message'),
				});
			}
		},
		async onAllowSSOManualLogin(userId: string) {
			const user = this.usersStore.getUserById(userId);
			if (user) {
				if (!user.settings) {
					user.settings = {};
				}
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
			const user = this.usersStore.getUserById(userId);
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
			void this.uiStore.goToUpgrade('settings-users', 'upgrade-users');
		},
		goToUpgradeAdvancedPermissions() {
			void this.uiStore.goToUpgrade('settings-users', 'upgrade-advanced-permissions');
		},
		async onRoleChange(user: IUser, newRoleName: UpdateGlobalRolePayload['newRoleName']) {
			await this.usersStore.updateGlobalRole({ id: user.id, newRoleName });
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
