<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import {
	ROLE,
	type Role,
	type UsersListSortOptions,
	type User,
	USERS_LIST_SORT_OPTIONS,
} from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import {
	DELETE_USER_MODAL_KEY,
	EnterpriseEditionFeature,
	INVITE_USER_MODAL_KEY,
} from '@/constants';
import type { InvitableRoleName } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useSSOStore } from '@/stores/sso.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import SettingsUsersTable from '@/components/SettingsUsers/SettingsUsersTable.vue';
import { I18nT } from 'vue-i18n';

const clipboard = useClipboard();
const { showToast, showError } = useToast();

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const ssoStore = useSSOStore();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const tooltipKey = 'settings.personal.mfa.enforce.unlicensed_tooltip';

const i18n = useI18n();

const search = ref('');
const usersTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [
		{ id: 'firstName', desc: false },
		{ id: 'lastName', desc: false },
		{ id: 'email', desc: false },
	],
});
const showUMSetupWarning = computed(() => hasPermission(['defaultUser']));
const isEnforceMFAEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.EnforceMFA],
);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.users'));

	if (!showUMSetupWarning.value) {
		await updateUsersTableData(usersTableState.value);
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
const isAdvancedPermissionsEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions],
);

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
	uiStore.openModalWithData({
		name: INVITE_USER_MODAL_KEY,
		data: {
			afterInvite: async () => {
				await updateUsersTableData(usersTableState.value);
			},
		},
	});
}
async function onDelete(userId: string) {
	uiStore.openModalWithData({
		name: DELETE_USER_MODAL_KEY,
		data: {
			userId,
			afterDelete: async () => {
				await updateUsersTableData(usersTableState.value);
			},
		},
	});
}
async function onReinvite(userId: string) {
	try {
		const user = usersStore.usersList.state.items.find((u) => u.id === userId);
		if (user?.email && user?.role) {
			if (!['global:admin', 'global:member'].includes(user.role)) {
				throw new Error('Invalid role name on reinvite');
			}
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
		}
	} catch (e) {
		showError(e, i18n.baseText('settings.users.userReinviteError'));
	}
}
async function onCopyInviteLink(userId: string) {
	const user = usersStore.usersList.state.items.find((u) => u.id === userId);
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
	try {
		const user = usersStore.usersList.state.items.find((u) => u.id === userId);
		if (user) {
			const url = await usersStore.getUserPasswordResetLink(user);
			void clipboard.copy(url.link);

			showToast({
				type: 'success',
				title: i18n.baseText('settings.users.passwordResetUrlCreated'),
				message: i18n.baseText('settings.users.passwordResetUrlCreated.message'),
			});
		}
	} catch (error) {
		showError(error, i18n.baseText('settings.users.passwordResetLinkError'));
	}
}
async function onAllowSSOManualLogin(userId: string) {
	const user = usersStore.usersList.state.items.find((u) => u.id === userId);
	if (user) {
		if (!user.settings) {
			user.settings = {};
		}
		user.settings.allowSSOManualLogin = true;
		await usersStore.updateOtherUserSettings(userId, user.settings);
		await updateUsersTableData(usersTableState.value);

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.allowSSOManualLogin'),
			message: i18n.baseText('settings.users.allowSSOManualLogin.message'),
		});
	}
}
async function onDisallowSSOManualLogin(userId: string) {
	const user = usersStore.usersList.state.items.find((u) => u.id === userId);
	if (user?.settings) {
		user.settings.allowSSOManualLogin = false;
		await usersStore.updateOtherUserSettings(userId, user.settings);
		await updateUsersTableData(usersTableState.value);

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

const onUpdateRole = async (payload: { userId: string; role: Role }) => {
	const user = usersStore.usersList.state.items.find((u) => u.id === payload.userId);
	if (!user) {
		showError(new Error('User not found'), i18n.baseText('settings.users.userNotFound'));
		return;
	}

	await onRoleChange(user, payload.role);
};

async function onRoleChange(user: User, newRoleName: Role) {
	try {
		await usersStore.updateGlobalRole({ id: user.id, newRoleName });

		const role = userRoles.value.find(({ value }) => value === newRoleName)?.label || newRoleName;

		showToast({
			type: 'success',
			title: i18n.baseText('settings.users.userRoleUpdated'),
			message: i18n.baseText('settings.users.userRoleUpdated.message', {
				interpolate: {
					user:
						user.firstName && user.lastName
							? `${user.firstName} ${user.lastName}`
							: (user.email ?? ''),
					role,
				},
			}),
		});
	} catch (e) {
		showError(e, i18n.baseText('settings.users.userReinviteError'));
	}
}

const isValidSortKey = (key: string): key is UsersListSortOptions =>
	(USERS_LIST_SORT_OPTIONS as readonly string[]).includes(key);

const updateUsersTableData = async ({ page, itemsPerPage, sortBy }: TableOptions) => {
	try {
		usersTableState.value = {
			page,
			itemsPerPage,
			sortBy,
		};

		const skip = page * itemsPerPage;
		const take = itemsPerPage;

		const transformedSortBy = sortBy
			.flatMap(({ id, desc }) => {
				const dir = desc ? 'desc' : 'asc';
				if (id === 'name') {
					return [`firstName:${dir}`, `lastName:${dir}`, `email:${dir}`];
				}
				return `${id}:${dir}`;
			})
			.filter(isValidSortKey);

		await usersStore.usersList.execute(0, {
			skip,
			take,
			sortBy: transformedSortBy,
			expand: ['projectRelations'],
			filter: {
				fullText: search.value.trim(),
			},
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.users.table.update.error'));
	}
};

const debouncedUpdateUsersTableData = useDebounceFn(() => {
	usersTableState.value.page = 0; // Reset to first page on search
	void updateUsersTableData(usersTableState.value);
}, 300);

const onSearch = (value: string) => {
	search.value = value;
	void debouncedUpdateUsersTableData();
};

async function onUpdateMfaEnforced(value: boolean) {
	try {
		await usersStore.updateEnforceMfa(value);
		showToast({
			type: 'success',
			title: value
				? i18n.baseText('settings.personal.mfa.enforce.enabled.title')
				: i18n.baseText('settings.personal.mfa.enforce.disabled.title'),
			message: value
				? i18n.baseText('settings.personal.mfa.enforce.enabled.message')
				: i18n.baseText('settings.personal.mfa.enforce.disabled.message'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.personal.mfa.enforce.error'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<N8nHeading tag="h1" size="2xlarge" class="mb-xl">
			{{ i18n.baseText('settings.users') }}
			<N8nText v-if="!showUMSetupWarning" :class="$style.userCount" color="text-light">{{
				i18n.baseText('settings.users.count', {
					interpolate: {
						count: usersStore.usersList.state.count,
					},
					adjustToNumber: usersStore.usersList.state.count,
				})
			}}</N8nText>
		</N8nHeading>
		<div v-if="!usersStore.usersLimitNotReached" :class="$style.setupInfoContainer">
			<N8nActionBox
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
		<N8nNotice v-if="!isAdvancedPermissionsEnabled">
			<I18nT keypath="settings.users.advancedPermissions.warning" scope="global">
				<template #link>
					<N8nLink
						data-test-id="upgrade-permissions-link"
						size="small"
						@click="goToUpgradeAdvancedPermissions"
					>
						{{ i18n.baseText('generic.upgrade') }}
					</N8nLink>
				</template>
			</I18nT>
		</N8nNotice>
		<div :class="$style.settingsContainer">
			<div :class="$style.settingsContainerInfo">
				<N8nText :bold="true"
					>{{ i18n.baseText('settings.personal.mfa.enforce.title') }}
					<N8nBadge v-if="!isEnforceMFAEnabled" class="ml-4xs">{{
						i18n.baseText('generic.upgrade')
					}}</N8nBadge>
				</N8nText>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('settings.personal.mfa.enforce.message')
				}}</N8nText>
			</div>
			<div :class="$style.settingsContainerAction">
				<EnterpriseEdition :features="[EnterpriseEditionFeature.EnforceMFA]">
					<el-switch
						:model-value="settingsStore.isMFAEnforced"
						size="large"
						data-test-id="enable-force-mfa"
						@update:model-value="onUpdateMfaEnforced"
					/>
					<template #fallback>
						<N8nTooltip>
							<el-switch :model-value="settingsStore.isMFAEnforced" size="large" :disabled="true" />
							<template #content>
								<I18nT :keypath="tooltipKey" tag="span" scope="global">
									<template #action>
										<a @click="goToUpgrade">
											{{ i18n.baseText('settings.personal.mfa.enforce.unlicensed_tooltip.link') }}
										</a>
									</template>
								</I18nT>
							</template>
						</N8nTooltip>
					</template>
				</EnterpriseEdition>
			</div>
		</div>
		<div v-if="!showUMSetupWarning" :class="$style.buttonContainer">
			<N8nInput
				:class="$style.search"
				:model-value="search"
				:placeholder="i18n.baseText('settings.users.search.placeholder')"
				clearable
				data-test-id="users-list-search"
				@update:model-value="onSearch"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nTooltip :disabled="!ssoStore.isSamlLoginEnabled">
				<template #content>
					<span> {{ i18n.baseText('settings.users.invite.tooltip') }} </span>
				</template>
				<div>
					<N8nButton
						:disabled="ssoStore.isSamlLoginEnabled || !usersStore.usersLimitNotReached"
						:label="i18n.baseText('settings.users.invite')"
						size="large"
						data-test-id="settings-users-invite-button"
						@click="onInvite"
					/>
				</div>
			</N8nTooltip>
		</div>
		<!-- If there's more than 1 user it means the account quota was more than 1 in the past. So we need to allow instance owner to be able to delete users and transfer workflows.
		-->
		<div
			v-if="usersStore.usersLimitNotReached || usersStore.usersList.state.count > 1"
			:class="$style.usersContainer"
		>
			<SettingsUsersTable
				v-model:table-options="usersTableState"
				data-test-id="settings-users-table"
				:data="usersStore.usersList.state"
				:loading="usersStore.usersList.isLoading"
				:actions="usersListActions"
				@update:options="updateUsersTableData"
				@update:role="onUpdateRole"
				@action="onUsersListAction"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.userCount {
	display: block;
	padding: var(--spacing-3xs) 0 0;
}

.buttonContainer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing-s);
	margin: 0 0 var(--spacing-s);
}

.search {
	max-width: 300px;
}

.setupInfoContainer {
	max-width: 728px;
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing-s);
	margin-bottom: var(--spacing-l);
	justify-content: space-between;
	flex-shrink: 0;

	border-radius: 4px;
	border: 1px solid var(--Colors-Foreground---color-foreground-base, #d9dee8);
}

.settingsContainerInfo {
	display: flex;
	padding: 8px 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: 1px;
}

.settingsContainerAction {
	display: flex;
	padding: 20px 16px 20px 248px;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.container {
	padding-bottom: 20px;
}
</style>
