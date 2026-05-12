<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ROLE, type Role } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { IFormInputs, ThemeOption } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_DOCS_URL,
	TWO_FACTOR_METHOD_PICKER_MODAL_KEY,
	TOTP_SETUP_WIZARD_MODAL_KEY,
	WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import { twoFactorPickerBus, twoFactorWizardBus } from '../auth.eventBus';
import type { TwoFactorMethod } from '../auth.eventBus';
import { useMfaReverify } from '../composables/useMfaReverify';
import type { BaseTextKey } from '@n8n/i18n';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import type { ConfirmPasswordModalEvents } from '../auth.eventBus';
import { confirmPasswordEventBus } from '../auth.eventBus';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nFormInputs,
	N8nHeading,
	N8nIcon,
	N8nInputLabel,
	N8nLink,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
type UserBasicDetailsForm = {
	firstName: string;
	lastName: string;
	email: string;
	/**
	 * Required when changing the user email and no MFA enabled
	 */
	currentPassword?: string;
};

type UserBasicDetailsWithMfa = UserBasicDetailsForm & {
	mfaCode?: string;
	mfaRecoveryCode?: string;
	webauthnResponse?: unknown;
};

type RoleContent = {
	name: string;
	description: string;
};

const i18n = useI18n();
const { showToast, showError } = useToast();
const documentTitle = useDocumentTitle();

const hasAnyBasicInfoChanges = ref<boolean>(false);
const formInputs = ref<null | IFormInputs>(null);
const formBus = createFormEventBus();
const readyToSubmit = ref(false);
const currentSelectedTheme = ref(useUIStore().theme);
const themeOptions = ref<Array<{ name: ThemeOption; label: BaseTextKey }>>([
	{
		name: 'system',
		label: 'settings.personal.theme.systemDefault',
	},
	{
		name: 'light',
		label: 'settings.personal.theme.light',
	},
	{
		name: 'dark',
		label: 'settings.personal.theme.dark',
	},
]);

const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();
const cloudPlanStore = useCloudPlanStore();

const currentUser = computed((): IUser | null => {
	return usersStore.currentUser;
});

const isManagedByEnv = computed((): boolean => {
	return currentUser.value?.isManagedByEnv ?? false;
});

const isExternalAuthEnabled = computed((): boolean => {
	const isLdapEnabled =
		ssoStore.isEnterpriseLdapEnabled && currentUser.value?.signInType === 'ldap';
	const isSamlEnabled = ssoStore.isSamlLoginEnabled && ssoStore.isDefaultAuthenticationSaml;
	const isOidcEnabled =
		ssoStore.isEnterpriseOidcEnabled &&
		ssoStore.isOidcLoginEnabled &&
		currentUser.value?.signInType === 'oidc';
	return isLdapEnabled || isSamlEnabled || isOidcEnabled;
});

const isPersonalSecurityEnabled = computed((): boolean => {
	return usersStore.isInstanceOwner || !isExternalAuthEnabled.value;
});

const mfaEnforced = computed((): boolean => {
	return settingsStore.isMFAEnforced;
});
const isMfaFeatureEnabled = computed((): boolean => {
	return settingsStore.isMfaFeatureEnabled;
});

const activeMfaMethod = computed<TwoFactorMethod | null>(() => {
	if (!currentUser.value?.mfaEnabled) return null;
	return (currentUser.value.mfaMethod as TwoFactorMethod | null | undefined) ?? null;
});

/**
 * Passwordless sign-in (passkey) and Two-factor authentication (TOTP /
 * security key) are presented as independent subsections in the new design.
 *
 * Today the backend still treats passkey as one of three mutually exclusive
 * MFA methods, so the FE derives both states from `mfaMethod` / `mfaEnabled`.
 * Step 2 of this restructure decouples them on the backend so a user can
 * have both active at once.
 */
const hasPasskey = computed(() => activeMfaMethod.value === 'passkey');
const has2fa = computed(
	() => activeMfaMethod.value === 'totp' || activeMfaMethod.value === 'security_key',
);
const twoFactorMethod = computed<TwoFactorMethod | null>(() =>
	has2fa.value ? activeMfaMethod.value : null,
);
const { reverify } = useMfaReverify();

const hasAnyPersonalisationChanges = computed((): boolean => {
	return currentSelectedTheme.value !== uiStore.theme;
});

const hasAnyChanges = computed(() => {
	return hasAnyBasicInfoChanges.value || hasAnyPersonalisationChanges.value;
});

const roles = computed<Record<Role, RoleContent>>(() => ({
	[ROLE.Default]: {
		name: i18n.baseText('auth.roles.default'),
		description: i18n.baseText('settings.personal.role.tooltip.default'),
	},
	[ROLE.Member]: {
		name: i18n.baseText('auth.roles.member'),
		description: i18n.baseText('settings.personal.role.tooltip.member'),
	},
	[ROLE.ChatUser]: {
		name: i18n.baseText('auth.roles.chatUser'),
		description: i18n.baseText('settings.personal.role.tooltip.chatUser'),
	},
	[ROLE.Admin]: {
		name: i18n.baseText('auth.roles.admin'),
		description: i18n.baseText('settings.personal.role.tooltip.admin'),
	},
	[ROLE.Owner]: {
		name: i18n.baseText('auth.roles.owner'),
		description: i18n.baseText('settings.personal.role.tooltip.owner', {
			interpolate: {
				cloudAccess: cloudPlanStore.hasCloudPlan
					? i18n.baseText('settings.personal.role.tooltip.cloud')
					: '',
			},
		}),
	},
}));

const currentUserRole = computed<RoleContent>(() => roles.value[usersStore.globalRoleName]);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.personal.personalSettings'));
	formInputs.value = [
		{
			name: 'firstName',
			initialValue: currentUser.value?.firstName,
			properties: {
				label: i18n.baseText('auth.firstName'),
				maxlength: 32,
				required: true,
				autocomplete: 'given-name',
				capitalize: true,
				disabled: isManagedByEnv.value || isExternalAuthEnabled.value,
			},
		},
		{
			name: 'lastName',
			initialValue: currentUser.value?.lastName,
			properties: {
				label: i18n.baseText('auth.lastName'),
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
				capitalize: true,
				disabled: isManagedByEnv.value || isExternalAuthEnabled.value,
			},
		},
		{
			name: 'email',
			initialValue: currentUser.value?.email,
			properties: {
				label: i18n.baseText('auth.email'),
				type: 'email',
				required: true,
				validationRules: [{ name: 'VALID_EMAIL' }],
				autocomplete: 'email',
				capitalize: true,
				disabled: isManagedByEnv.value || !isPersonalSecurityEnabled.value,
			},
		},
	];
});

function onInput() {
	hasAnyBasicInfoChanges.value = true;
}

function onReadyToSubmit(ready: boolean) {
	readyToSubmit.value = ready;
}

/** Saves users basic info and personalization settings */
async function saveUserSettings(params: UserBasicDetailsWithMfa) {
	try {
		// The MFA code might be invalid so we update the user's basic info first
		await updateUserBasicInfo(params);
		await updatePersonalisationSettings();

		showToast({
			title: i18n.baseText('settings.personal.personalSettingsUpdated'),
			message: '',
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.personalSettingsUpdatedError'));
	}
}

async function onSubmit(data: Record<string, string | number | boolean | null | undefined>) {
	const form = data as UserBasicDetailsForm;
	const emailChanged = usersStore.currentUser?.email !== form.email;

	if (usersStore.currentUser?.mfaEnabled && emailChanged) {
		const proof = await reverify();
		if (!proof) return;
		await saveUserSettings({ ...form, ...proof });
	} else if (emailChanged) {
		uiStore.openModal(CONFIRM_PASSWORD_MODAL_KEY);
		confirmPasswordEventBus.once('close', async (payload: ConfirmPasswordModalEvents['close']) => {
			if (!payload) {
				// User closed the modal without submitting the form
				return;
			}

			await saveUserSettings({
				...form,
				currentPassword: payload.currentPassword,
			});
			uiStore.closeModal(CONFIRM_PASSWORD_MODAL_KEY);
		});
	} else {
		await saveUserSettings(form);
	}
}

async function updateUserBasicInfo(userBasicInfo: UserBasicDetailsWithMfa) {
	if (!hasAnyBasicInfoChanges.value || !usersStore.currentUserId) {
		return;
	}

	await usersStore.updateUser({
		firstName: userBasicInfo.firstName,
		lastName: userBasicInfo.lastName,
		email: userBasicInfo.email,
		mfaCode: userBasicInfo.mfaCode,
		webauthnResponse: userBasicInfo.webauthnResponse,
		currentPassword: userBasicInfo.currentPassword,
	});
	hasAnyBasicInfoChanges.value = false;
}

async function updatePersonalisationSettings() {
	if (!hasAnyPersonalisationChanges.value) {
		return;
	}

	uiStore.setTheme(currentSelectedTheme.value);
}

function onSaveClick() {
	formBus.emit('submit');
}

function openPasswordModal() {
	uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
}

async function openMethodPicker(options: { excludeMethods?: TwoFactorMethod[] } = {}) {
	uiStore.openModalWithData({
		name: TWO_FACTOR_METHOD_PICKER_MODAL_KEY,
		data: { current: activeMfaMethod.value, excludeMethods: options.excludeMethods },
	});
}

async function canEnableMfaPreCheck(): Promise<boolean> {
	if (settingsStore.isCloudDeployment && usersStore.isInstanceOwner) {
		try {
			await usersStore.canEnableMFA();
		} catch (e) {
			showToast({
				title: i18n.baseText('settings.personal.mfa.toast.canEnableMfa.title'),
				message: e.message,
				type: 'error',
			});
			await usersStore.sendConfirmationEmail();
			return false;
		}
	}
	return true;
}

async function onSetupPasskeyClick() {
	if (!(await canEnableMfaPreCheck())) return;
	uiStore.openModalWithData({
		name: WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
		data: { method: 'passkey', replacing: activeMfaMethod.value, standalone: true },
	});
}

async function onRemovePasskeyClick() {
	await disableMfa('removedPasskey');
}

interface TwoFactorMethodOption {
	method: 'totp' | 'security_key';
	icon: 'shield' | 'key-round';
	tone: 'totp' | 'security_key';
	labelKey: string;
	descriptionKey: string;
}

function isMethodActive(method: 'totp' | 'security_key'): boolean {
	return twoFactorMethod.value === method;
}

const twoFactorMethods: TwoFactorMethodOption[] = [
	{
		method: 'totp',
		icon: 'shield',
		tone: 'totp',
		labelKey: 'settings.personal.twoFactor.picker.totp.label',
		descriptionKey: 'settings.personal.twoFactor.picker.totp.description',
	},
	{
		method: 'security_key',
		icon: 'key-round',
		tone: 'security_key',
		labelKey: 'settings.personal.twoFactor.picker.security_key.label',
		descriptionKey: 'settings.personal.twoFactor.picker.security_key.description',
	},
];

async function onTwoFactorMethodClick(method: 'totp' | 'security_key') {
	if (!(await canEnableMfaPreCheck())) return;
	if (method === 'totp') {
		uiStore.openModalWithData({
			name: TOTP_SETUP_WIZARD_MODAL_KEY,
			data: { replacing: activeMfaMethod.value },
		});
	} else {
		uiStore.openModalWithData({
			name: WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
			data: { method: 'security_key', replacing: activeMfaMethod.value, standalone: true },
		});
	}
}

async function onDisable2faClick() {
	await disableMfa('disabled2fa');
}

async function disableMfa(_intent: 'removedPasskey' | 'disabled2fa') {
	const proof = await reverify();
	if (!proof) return;
	try {
		await usersStore.disableMfa(proof);
		showToast({
			title: i18n.baseText('settings.personal.mfa.toast.disabledMfa.title'),
			message: i18n.baseText('settings.personal.mfa.toast.disabledMfa.message'),
			type: 'success',
			duration: 0,
		});
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.mfa.toast.disabledMfa.error.message'));
	}
}

const onPickerSelected = ({ method }: { method: TwoFactorMethod }) => {
	const replacing = activeMfaMethod.value;
	if (method === 'totp') {
		uiStore.openModalWithData({
			name: TOTP_SETUP_WIZARD_MODAL_KEY,
			data: { replacing },
		});
	} else {
		uiStore.openModalWithData({
			name: WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
			data: { method, replacing },
		});
	}
};

const onWizardBack = () => {
	void openMethodPicker();
};

twoFactorPickerBus.on('selected', onPickerSelected);
twoFactorWizardBus.on('back', onWizardBack);

onBeforeUnmount(() => {
	twoFactorPickerBus.off('selected', onPickerSelected);
	twoFactorWizardBus.off('back', onWizardBack);
});
</script>

<template>
	<div :class="$style.container" data-test-id="personal-settings-container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{
				i18n.baseText('settings.personal.personalSettings')
			}}</N8nHeading>
			<div v-if="currentUser" :class="$style.user">
				<span :class="$style.username" data-test-id="current-user-name">
					<N8nText color="text-base" bold>{{ currentUser.fullName }}</N8nText>
					<N8nTooltip placement="bottom">
						<template #content>{{ currentUserRole.description }}</template>
						<N8nText :class="$style.tooltip" color="text-light" data-test-id="current-user-role">{{
							currentUserRole.name
						}}</N8nText>
					</N8nTooltip>
				</span>
				<N8nAvatar
					:first-name="currentUser.firstName"
					:last-name="currentUser.lastName"
					size="large"
				/>
			</div>
		</div>
		<div>
			<div class="mb-s">
				<N8nHeading size="large">{{
					i18n.baseText('settings.personal.basicInformation')
				}}</N8nHeading>
			</div>
			<N8nNotice
				v-if="isManagedByEnv"
				:content="i18n.baseText('settings.personal.managedByEnv')"
				data-test-id="managed-by-env-notice"
			/>
			<div data-test-id="personal-data-form">
				<N8nFormInputs
					v-if="formInputs"
					:inputs="formInputs"
					:event-bus="formBus"
					@update="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
		</div>
		<div v-if="isPersonalSecurityEnabled && !isManagedByEnv">
			<div class="mb-s">
				<N8nHeading size="large">{{ i18n.baseText('settings.personal.security') }}</N8nHeading>
			</div>
			<div class="mb-s">
				<N8nInputLabel :label="i18n.baseText('auth.password')">
					<N8nLink data-test-id="change-password-link" @click="openPasswordModal">{{
						i18n.baseText('auth.changePassword')
					}}</N8nLink>
				</N8nInputLabel>
			</div>
			<div v-if="isMfaFeatureEnabled">
				<div class="mb-s" data-test-id="passkey-section">
					<div class="mb-xs">
						<N8nInputLabel :label="i18n.baseText('settings.personal.passkey.section.title')" />
						<N8nText :bold="false" :class="$style.infoText">
							{{ i18n.baseText('settings.personal.passkey.description') }}
						</N8nText>
					</div>
					<div
						:class="[$style.methodCard, !hasPasskey && $style.methodCardMuted]"
						:data-test-id="`passkey-card-${hasPasskey ? 'enabled' : 'disabled'}`"
					>
						<div :class="[$style.activeMethodIcon, $style.tone_passkey]">
							<N8nIcon icon="fingerprint" />
						</div>
						<div :class="$style.methodCardContent">
							<div :class="$style.methodCardLabel">
								<N8nText :bold="true">{{
									i18n.baseText('settings.personal.twoFactor.method.passkey.name')
								}}</N8nText>
								<N8nBadge v-if="hasPasskey" theme="success">{{
									i18n.baseText('settings.personal.mfa.status.enabled')
								}}</N8nBadge>
								<N8nBadge v-else theme="default">{{
									i18n.baseText('settings.personal.method.status.notSetUp')
								}}</N8nBadge>
							</div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('settings.personal.twoFactor.method.passkey.detail')
							}}</N8nText>
						</div>
						<N8nButton
							v-if="!hasPasskey"
							variant="subtle"
							size="small"
							:label="i18n.baseText('settings.personal.method.button.setUp')"
							data-test-id="enable-passkey-button"
							@click="onSetupPasskeyClick"
						/>
						<N8nButton
							v-else
							variant="destructive"
							size="small"
							:label="i18n.baseText('settings.personal.method.button.remove')"
							data-test-id="remove-passkey-button"
							@click="onRemovePasskeyClick"
						/>
					</div>
				</div>

				<div data-test-id="mfa-section">
					<div class="mb-xs">
						<N8nInputLabel :label="i18n.baseText('settings.personal.twoFactor.section.title')" />
						<N8nText :bold="false" :class="$style.infoText">
							{{ i18n.baseText('settings.personal.twoFactor.description') }}
							<N8nLink :to="MFA_DOCS_URL" size="small" :bold="true">
								{{ i18n.baseText('generic.learnMore') }}
							</N8nLink>
						</N8nText>
					</div>
					<N8nNotice
						v-if="!has2fa && mfaEnforced"
						:content="i18n.baseText('settings.personal.mfa.enforced')"
					/>
					<div :class="$style.methodCards">
						<div
							v-for="option in twoFactorMethods"
							:key="option.method"
							:class="[$style.methodCard, !isMethodActive(option.method) && $style.methodCardMuted]"
							:data-test-id="`mfa-method-${option.method}`"
						>
							<div :class="[$style.activeMethodIcon, $style[`tone_${option.tone}`]]">
								<N8nIcon :icon="option.icon" />
							</div>
							<div :class="$style.methodCardContent">
								<div :class="$style.methodCardLabel">
									<N8nText :bold="true">{{ i18n.baseText(option.labelKey as never) }}</N8nText>
									<N8nBadge v-if="isMethodActive(option.method)" theme="success">{{
										i18n.baseText('settings.personal.mfa.status.enabled')
									}}</N8nBadge>
									<N8nBadge v-else theme="default">{{
										i18n.baseText('settings.personal.method.status.notSetUp')
									}}</N8nBadge>
								</div>
								<N8nText size="small" color="text-light">{{
									i18n.baseText(option.descriptionKey as never)
								}}</N8nText>
							</div>
							<N8nButton
								v-if="isMethodActive(option.method)"
								variant="destructive"
								size="small"
								:label="i18n.baseText('settings.personal.method.button.disable')"
								:data-test-id="`mfa-method-${option.method}-disable`"
								@click="onDisable2faClick"
							/>
							<N8nButton
								v-else
								variant="subtle"
								size="small"
								:label="i18n.baseText('settings.personal.method.button.setUp')"
								:data-test-id="`mfa-method-${option.method}-setup`"
								@click="onTwoFactorMethodClick(option.method)"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div>
			<div class="mb-s">
				<N8nHeading size="large">{{
					i18n.baseText('settings.personal.personalisation')
				}}</N8nHeading>
			</div>
			<div>
				<N8nInputLabel :label="i18n.baseText('settings.personal.theme')">
					<N8nSelect
						v-model="currentSelectedTheme"
						:class="$style.themeSelect"
						data-test-id="theme-select"
						size="small"
						filterable
					>
						<N8nOption
							v-for="item in themeOptions"
							:key="item.name"
							:label="i18n.baseText(item.label)"
							:value="item.name"
						>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
			</div>
		</div>
		<div>
			<N8nButton
				float="right"
				:label="i18n.baseText('settings.personal.save')"
				size="large"
				:disabled="!hasAnyChanges || !readyToSubmit"
				data-test-id="save-settings-button"
				@click="onSaveClick"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: 100px;

	> * {
		margin-bottom: var(--spacing--2xl);
	}
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;
	*:first-child {
		flex-grow: 1;
	}
}

.user {
	display: flex;
	align-items: center;

	@media (max-width: $breakpoint-2xs) {
		display: none;
	}
}

.username {
	display: grid;
	grid-template-columns: 1fr;
	margin-right: var(--spacing--sm);

	@media (max-width: $breakpoint-sm) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.tooltip {
	justify-self: start;
}

.disableMfaButton {
	> span {
		font-weight: var(--font-weight--bold);
	}
}

.button {
	font-size: var(--spacing--xs);
	> span {
		font-weight: var(--font-weight--bold);
	}
}

.infoText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.themeSelect {
	max-width: 50%;
}

.activeMethodCard {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.methodCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

.methodCard {
	display: flex;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--md);
	align-items: center;
}

.methodCardMuted {
	opacity: 0.65;
}

.methodCardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.methodCardLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.activeMethodHeader {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.activeMethodIcon {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--xs);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: var(--font-size--md);
}

.activeMethodInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.activeMethodLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.activeMethodActions {
	display: flex;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
}

.tone_totp {
	background: var(--color--green-alpha-100);
	color: var(--color--green-500);
}

.tone_passkey {
	background: var(--background--info);
	color: var(--color--blue-500);
}

.tone_security_key {
	background: var(--color--orange-alpha-100);
	color: var(--color--orange-500);
}
</style>
