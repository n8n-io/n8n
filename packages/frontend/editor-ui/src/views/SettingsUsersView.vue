<script lang="ts" setup>
import { ROLE, type Role } from '@n8n/api-types';
import { EnterpriseEditionFeature, INVITE_USER_MODAL_KEY } from '@/constants';
import type { InvitableRoleName, IUser } from '@/Interface';
import type { UserAction } from '@n8n/design-system';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useSSOStore } from '@/stores/sso.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { useClipboard } from '@/composables/useClipboard';
import type { UpdateGlobalRolePayload } from '@/api/users';
import { computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const clipboard = useClipboard();
const { showToast, showError } = useToast();

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const ssoStore = useSSOStore();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const i18n = useI18n();

const showUMSetupWarning = computed(() => {
	return hasPermission(['defaultUser']);
});

const allUsers = computed(() => usersStore.allUsers);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.users'));

	if (!showUMSetupWarning.value) {
		await usersStore.fetchUsers();
	}
});

const usersListActions = computed((): Array<UserAction<IUser>> => {
	return [
		{
			label: i18n.baseText('settings.users.actions.copyInviteLink'),
			value: 'copyInviteLink',
			guard: (user) => usersStore.usersLimitNotReached && !user.firstName && !!user.inviteAcceptUrl,
		},
		{
			label: i18n.baseText('settings.users.actions.reinvite'),
			value: 'reinvite',
			guard: (user) =>
				usersStore.usersLimitNotReached && !user.firstName && settingsStore.isSmtpSetup,
		},
		{
			label: i18n.baseText('settings.users.actions.delete'),
			value: 'delete',
			guard: (user) =>
				hasPermission(['rbac'], { rbac: { scope: 'user:delete' } }) &&
				user.id !== usersStore.currentUserId,
		},
		{
			label: i18n.baseText('settings.users.actions.copyPasswordResetLink'),
			value: 'copyPasswordResetLink',
			guard: (user) =>
				hasPermission(['rbac'], { rbac: { scope: 'user:resetPassword' } }) &&
				usersStore.usersLimitNotReached &&
				!user.isPendingUser &&
				user.id !== usersStore.currentUserId,
		},
		{
			label: i18n.baseText('settings.users.actions.allowSSOManualLogin'),
			value: 'allowSSOManualLogin',
			guard: (user) => !!ssoStore.isSamlLoginEnabled && !user.settings?.allowSSOManualLogin,
		},
		{
			label: i18n.baseText('settings.users.actions.disallowSSOManualLogin'),
			value: 'disallowSSOManualLogin',
			guard: (user) => !!ssoStore.isSamlLoginEnabled && user.settings?.allowSSOManualLogin === true,
		},
	];
});
const isAdvancedPermissionsEnabled = computed((): boolean => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions];
});

const userRoles = computed((): Array<{ value: Role; label: string; disabled?: boolean }> => {
	return [
		{
			value: ROLE.Member,
			label: i18n.baseText('auth.roles.member'),
		},
		{
			value: ROLE.Admin,
			label: i18n.baseText('auth.roles.admin'),
			disabled: !isAdvancedPermissionsEnabled.value,
		},
	];
});

const canUpdateRole = computed((): boolean => {
	return hasPermission(['rbac'], { rbac: { scope: ['user:update', 'user:changeRole'] } });
});

async function onUsersListAction({ action, userId }: { action: string; userId: string }) {
	switch (action) {
		case 'delete':
			await onDelete(userId);
			break;
		case 'reinvite':
			await onReinvite(userId);
			break;
		case 'copyInviteLink':
			await onCopyInviteLink(userId);
			break;
		case 'copyPasswordResetLink':
			await onCopyPasswordResetLink(userId);
			break;
		case 'allowSSOManualLogin':
			await onAllowSSOManualLogin(userId);
			break;
		case 'disallowSSOManualLogin':
			await onDisallowSSOManualLogin(userId);
			break;
	}
}
function onInvite() {
	uiStore.openModal(INVITE_USER_MODAL_KEY);
}
async function onDelete(userId: string) {
	const user = usersStore.usersById[userId];
	if (user) {
		uiStore.openDeleteUserModal(userId);
	}
}
async function onReinvite(userId: string) {
	const user = usersStore.usersById[userId];
	if (user?.email && user?.role) {
		if (!['global:admin', 'global:member'].includes(user.role)) {
			throw new Error('Invalid role name on reinvite');
		}
		try {
			await usersStore.reinviteUser({
				email: user.email,
				role: user.role as InvitableRoleName,
			});
			showToast({
				type: 'success',
				title: i18n.baseText('settings.users.inviteResent'),
				message: i18n.baseText('settings.users.emailSentTo', {
					interpolate: { email: user.email ?? '' },
				}),
			});
		} catch (e) {
			showError(e, i18n.baseText('settings.users.userReinviteError'));
		}
	}
}
async function onCopyInviteLink(userId: string) {
	const user = usersStore.usersById[userId];
	if (user?.inviteAcceptUrl) {
		void clipboard.copy(user.inviteAcceptUrl);

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.inviteUrlCreated'),
			message: i18n.baseText('settings.users.inviteUrlCreated.message'),
		});
	}
}
async function onCopyPasswordResetLink(userId: string) {
	const user = usersStore.usersById[userId];
	if (user) {
		const url = await usersStore.getUserPasswordResetLink(user);
		void clipboard.copy(url.link);

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.passwordResetUrlCreated'),
			message: i18n.baseText('settings.users.passwordResetUrlCreated.message'),
		});
	}
}
async function onAllowSSOManualLogin(userId: string) {
	const user = usersStore.usersById[userId];
	if (user) {
		if (!user.settings) {
			user.settings = {};
		}
		user.settings.allowSSOManualLogin = true;
		await usersStore.updateOtherUserSettings(userId, user.settings);

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.allowSSOManualLogin'),
			message: i18n.baseText('settings.users.allowSSOManualLogin.message'),
		});
	}
}
async function onDisallowSSOManualLogin(userId: string) {
	const user = usersStore.usersById[userId];
	if (user?.settings) {
		user.settings.allowSSOManualLogin = false;
		await usersStore.updateOtherUserSettings(userId, user.settings);
		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.disallowSSOManualLogin'),
			message: i18n.baseText('settings.users.disallowSSOManualLogin.message'),
		});
	}
}
function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('settings-users', 'upgrade-users');
}
function goToUpgradeAdvancedPermissions() {
	void pageRedirectionHelper.goToUpgrade('settings-users', 'upgrade-advanced-permissions');
}
async function onRoleChange(user: IUser, newRoleName: UpdateGlobalRolePayload['newRoleName']) {
	try {
		await usersStore.updateGlobalRole({ id: user.id, newRoleName });

		const role = userRoles.value.find(({ value }) => value === newRoleName)?.label || newRoleName;

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.userRoleUpdated'),
			message: i18n.baseText('settings.users.userRoleUpdated.message', {
				interpolate: {
					user: user.fullName ?? '',
					role,
				},
			}),
		});
	} catch (e) {
		showError(e, i18n.baseText('settings.users.userReinviteError'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<div>
			<n8n-heading size="2xlarge">{{ i18n.baseText('settings.users') }}</n8n-heading>
			<div v-if="!showUMSetupWarning" :class="$style.buttonContainer">
				<n8n-tooltip :disabled="!ssoStore.isSamlLoginEnabled">
					<template #content>
						<span> {{ i18n.baseText('settings.users.invite.tooltip') }} </span>
					</template>
					<div>
						<n8n-button
							:disabled="ssoStore.isSamlLoginEnabled || !usersStore.usersLimitNotReached"
							:label="i18n.baseText('settings.users.invite')"
							size="large"
							data-test-id="settings-users-invite-button"
							@click="onInvite"
						/>
					</div>
				</n8n-tooltip>
			</div>
		</div>
		<div v-if="!usersStore.usersLimitNotReached" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="
					i18n.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.title)
				"
				:description="
					i18n.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.description)
				"
				:button-text="
					i18n.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.button)
				"
				@click:button="goToUpgrade"
			/>
		</div>
		<n8n-notice v-if="!isAdvancedPermissionsEnabled">
			<i18n-t keypath="settings.users.advancedPermissions.warning">
				<template #link>
					<n8n-link size="small" @click="goToUpgradeAdvancedPermissions">
						{{ i18n.baseText('settings.users.advancedPermissions.warning.link') }}
					</n8n-link>
				</template>
			</i18n-t>
		</n8n-notice>
		<!-- If there's more than 1 user it means the account quota was more than 1 in the past. So we need to allow instance owner to be able to delete users and transfer workflows.
		-->
		<div
			v-if="usersStore.usersLimitNotReached || allUsers.length > 1"
			:class="$style.usersContainer"
		>
			<n8n-users-list
				:actions="usersListActions"
				:users="allUsers"
				:current-user-id="usersStore.currentUserId"
				:is-saml-login-enabled="ssoStore.isSamlLoginEnabled"
				@action="onUsersListAction"
			>
				<template #actions="{ user }">
					<n8n-select
						v-if="user.id !== usersStore.currentUserId"
						:model-value="user?.role || 'global:member'"
						:disabled="!canUpdateRole"
						data-test-id="user-role-select"
						@update:model-value="onRoleChange(user, $event)"
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
