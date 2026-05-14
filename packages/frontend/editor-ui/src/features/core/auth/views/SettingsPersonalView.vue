<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ROLE, type Role, type WebAuthnCredentialResponse } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { IFormInputs, ThemeOption } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_DOCS_URL,
	TOTP_SETUP_WIZARD_MODAL_KEY,
	WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import {
	twoFactorWizardBus,
	confirmPasswordEventBus,
	type ConfirmPasswordModalEvents,
} from '../auth.eventBus';
import { useMfaReverify } from '../composables/useMfaReverify';
import { useSSOStore } from '@/features/settings/sso/sso.store';
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

// `availableMfaMethods` (server-derived) is the source of truth for TOTP;
// `webauthnCredentials` (full list with metadata) is the source of truth for
// passkey/security_key counts and rendering. Keeping these split avoids the
// dual-signal drift where the badge ("2 registered") and the activation check
// can disagree.
const hasTotp = computed(
	() =>
		currentUser.value?.mfaEnabled === true &&
		(currentUser.value.availableMfaMethods ?? []).includes('totp'),
);
const webauthnCredentials = ref<WebAuthnCredentialResponse[]>([]);

const isPlatformCredential = (c: WebAuthnCredentialResponse) =>
	(c.transports ?? []).includes('internal') || c.deviceType === 'multiDevice';

const passkeyCredentials = computed<WebAuthnCredentialResponse[]>(() =>
	webauthnCredentials.value.filter(isPlatformCredential),
);
const securityKeyCredentials = computed<WebAuthnCredentialResponse[]>(() =>
	webauthnCredentials.value.filter((c) => !isPlatformCredential(c)),
);

const has2fa = computed(
	() =>
		hasTotp.value || passkeyCredentials.value.length > 0 || securityKeyCredentials.value.length > 0,
);

const formatSetupDate = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const formatRelativeTime = (iso: string | null) => {
	if (!iso) return null;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
	const abs = Math.abs(diffSec);
	if (abs < 60) return relativeTimeFormatter.format(Math.round(diffSec), 'second');
	if (abs < 3600) return relativeTimeFormatter.format(Math.round(diffSec / 60), 'minute');
	if (abs < 86400) return relativeTimeFormatter.format(Math.round(diffSec / 3600), 'hour');
	if (abs < 86400 * 30) return relativeTimeFormatter.format(Math.round(diffSec / 86400), 'day');
	if (abs < 86400 * 365)
		return relativeTimeFormatter.format(Math.round(diffSec / (86400 * 30)), 'month');
	return relativeTimeFormatter.format(Math.round(diffSec / (86400 * 365)), 'year');
};

const formatCredentialMeta = (c: WebAuthnCredentialResponse) => {
	const parts: string[] = [];
	const setupDate = formatSetupDate(c.createdAt);
	if (setupDate) {
		parts.push(
			i18n.baseText('settings.personal.method.detail.addedOn', {
				interpolate: { date: setupDate },
			}),
		);
	}
	const lastUsed = formatRelativeTime(c.lastUsedAt);
	parts.push(
		lastUsed
			? i18n.baseText('settings.personal.method.detail.lastUsed', {
					interpolate: { when: lastUsed },
				})
			: i18n.baseText('settings.personal.method.detail.neverUsed'),
	);
	return parts.join(' · ');
};

async function refreshWebauthnCredentials() {
	try {
		webauthnCredentials.value = await usersStore.fetchWebAuthnCredentials();
	} catch {
		webauthnCredentials.value = [];
	}
}

async function removeWebAuthnCredential(credential: WebAuthnCredentialResponse) {
	// Re-verify with the same kind of authenticator the user is removing:
	// `reverify` filters `allowCredentials` server-side so the OS picker can
	// only satisfy the ceremony with a matching credential. Falls back to
	// TOTP / recovery-code when the device is unavailable.
	const kind = isPlatformCredential(credential) ? 'passkey' : 'security_key';
	const proof = await reverify(kind);
	if (!proof) return;
	try {
		await usersStore.deleteWebAuthnCredential(credential.id, proof);
		showToast({
			title: i18n.baseText('settings.personal.mfa.toast.disabledMfa.title'),
			message: i18n.baseText('settings.personal.mfa.toast.disabledMfa.message'),
			type: 'success',
			duration: 0,
		});
		await refreshWebauthnCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.mfa.toast.disabledMfa.error.message'));
	}
}
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
	void refreshWebauthnCredentials();
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
		data: { method: 'passkey' },
	});
}

function isMethodActive(method: 'totp' | 'security_key'): boolean {
	if (method === 'totp') return hasTotp.value;
	if (method === 'security_key') return securityKeyCredentials.value.length > 0;
	return false;
}

async function onTwoFactorMethodClick(method: 'totp' | 'security_key') {
	if (!(await canEnableMfaPreCheck())) return;
	if (method === 'totp') {
		uiStore.openModal(TOTP_SETUP_WIZARD_MODAL_KEY);
	} else {
		uiStore.openModalWithData({
			name: WEBAUTHN_SETUP_WIZARD_MODAL_KEY,
			data: { method: 'security_key' },
		});
	}
}

async function onDisable2faClick() {
	await disableMfa();
}

async function disableMfa() {
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
		await refreshWebauthnCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.mfa.toast.disabledMfa.error.message'));
	}
}

const onWizardCompleted = () => {
	void refreshWebauthnCredentials();
};

twoFactorWizardBus.on('completed', onWizardCompleted);

onBeforeUnmount(() => {
	twoFactorWizardBus.off('completed', onWizardCompleted);
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
					<div :class="$style.methodCard" data-test-id="passkey-card">
						<div :class="$style.methodCardHeader">
							<div :class="[$style.activeMethodIcon, $style.tone_passkey]">
								<N8nIcon icon="fingerprint" />
							</div>
							<div :class="$style.methodCardContent">
								<div :class="$style.methodCardLabel">
									<N8nText :bold="true">{{
										i18n.baseText('settings.personal.twoFactor.method.passkey.name')
									}}</N8nText>
									<N8nBadge v-if="passkeyCredentials.length > 0" theme="success">{{
										passkeyCredentials.length === 1
											? i18n.baseText('settings.personal.method.badge.registeredOne')
											: i18n.baseText('settings.personal.method.badge.registeredMany', {
													interpolate: { count: String(passkeyCredentials.length) },
												})
									}}</N8nBadge>
								</div>
								<span :class="$style.methodDetail">{{
									i18n.baseText('settings.personal.twoFactor.method.passkey.detail')
								}}</span>
							</div>
							<N8nButton
								v-if="passkeyCredentials.length === 0"
								variant="subtle"
								size="small"
								:label="i18n.baseText('settings.personal.method.button.setUp')"
								data-test-id="enable-passkey-button"
								@click="onSetupPasskeyClick"
							/>
						</div>
						<div v-if="passkeyCredentials.length > 0" :class="$style.credList">
							<div
								v-for="cred in passkeyCredentials"
								:key="cred.id"
								:class="$style.credItem"
								:data-test-id="`passkey-cred-${cred.id}`"
							>
								<div :class="$style.credIconSm">
									<N8nIcon icon="fingerprint" size="xsmall" />
								</div>
								<div :class="$style.credMeta">
									<div :class="$style.credName">{{ cred.label }}</div>
									<div :class="$style.credSub">{{ formatCredentialMeta(cred) }}</div>
								</div>
								<button
									type="button"
									:class="$style.credTrash"
									:aria-label="i18n.baseText('settings.personal.method.button.remove')"
									:data-test-id="`remove-passkey-${cred.id}`"
									@click="removeWebAuthnCredential(cred)"
								>
									<N8nIcon icon="trash-2" size="small" />
								</button>
							</div>
							<N8nButton
								variant="ghost"
								size="small"
								icon="plus"
								:class="$style.addAnotherBtn"
								:label="i18n.baseText('settings.personal.method.button.addAnother.passkey')"
								data-test-id="add-passkey-button"
								@click="onSetupPasskeyClick"
							/>
						</div>
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
						<!-- TOTP card -->
						<div :class="$style.methodCard" data-test-id="mfa-method-totp">
							<div :class="$style.methodCardHeader">
								<div :class="[$style.activeMethodIcon, $style.tone_totp]">
									<N8nIcon icon="shield" />
								</div>
								<div :class="$style.methodCardContent">
									<div :class="$style.methodCardLabel">
										<N8nText :bold="true">{{
											i18n.baseText('settings.personal.twoFactor.method.totp.name')
										}}</N8nText>
										<N8nBadge v-if="isMethodActive('totp')" theme="success">{{
											i18n.baseText('settings.personal.mfa.status.enabled')
										}}</N8nBadge>
									</div>
									<span :class="$style.methodDetail">{{
										i18n.baseText('settings.personal.twoFactor.picker.totp.description')
									}}</span>
								</div>
								<N8nButton
									v-if="isMethodActive('totp')"
									variant="destructive"
									size="small"
									:label="i18n.baseText('settings.personal.method.button.disable')"
									data-test-id="mfa-method-totp-disable"
									@click="onDisable2faClick"
								/>
								<N8nButton
									v-else
									variant="subtle"
									size="small"
									:label="i18n.baseText('settings.personal.method.button.setUp')"
									data-test-id="mfa-method-totp-setup"
									@click="onTwoFactorMethodClick('totp')"
								/>
							</div>
						</div>

						<!-- Security key card with optional credential list -->
						<div :class="$style.methodCard" data-test-id="mfa-method-security_key">
							<div :class="$style.methodCardHeader">
								<div :class="[$style.activeMethodIcon, $style.tone_security_key]">
									<N8nIcon icon="key-round" />
								</div>
								<div :class="$style.methodCardContent">
									<div :class="$style.methodCardLabel">
										<N8nText :bold="true">{{
											i18n.baseText('settings.personal.twoFactor.method.security_key.name')
										}}</N8nText>
										<N8nBadge v-if="securityKeyCredentials.length > 0" theme="success">{{
											securityKeyCredentials.length === 1
												? i18n.baseText('settings.personal.method.badge.registeredOne')
												: i18n.baseText('settings.personal.method.badge.registeredMany', {
														interpolate: { count: String(securityKeyCredentials.length) },
													})
										}}</N8nBadge>
									</div>
									<span :class="$style.methodDetail">{{
										i18n.baseText('settings.personal.twoFactor.picker.security_key.description')
									}}</span>
								</div>
								<N8nButton
									v-if="securityKeyCredentials.length === 0"
									variant="subtle"
									size="small"
									:label="i18n.baseText('settings.personal.method.button.setUp')"
									data-test-id="mfa-method-security_key-setup"
									@click="onTwoFactorMethodClick('security_key')"
								/>
							</div>
							<div v-if="securityKeyCredentials.length > 0" :class="$style.credList">
								<div
									v-for="cred in securityKeyCredentials"
									:key="cred.id"
									:class="$style.credItem"
									:data-test-id="`security-key-cred-${cred.id}`"
								>
									<div :class="$style.credIconSm">
										<N8nIcon icon="key-round" size="xsmall" />
									</div>
									<div :class="$style.credMeta">
										<div :class="$style.credName">{{ cred.label }}</div>
										<div :class="$style.credSub">{{ formatCredentialMeta(cred) }}</div>
									</div>
									<button
										type="button"
										:class="$style.credTrash"
										:aria-label="i18n.baseText('settings.personal.method.button.remove')"
										:data-test-id="`remove-security-key-${cred.id}`"
										@click="removeWebAuthnCredential(cred)"
									>
										<N8nIcon icon="trash-2" size="small" />
									</button>
								</div>
								<N8nButton
									variant="ghost"
									size="small"
									icon="plus"
									:class="$style.addAnotherBtn"
									:label="i18n.baseText('settings.personal.method.button.addAnother.security_key')"
									data-test-id="add-security-key-button"
									@click="onTwoFactorMethodClick('security_key')"
								/>
							</div>
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

.infoText {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}

.methodDetail {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
	line-height: var(--line-height--md);
}

.themeSelect {
	max-width: 50%;
}

.methodCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

.methodCard {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
}

.methodCardHeader {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
}

.credList {
	margin-top: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	display: flex;
	flex-direction: column;
}

.credItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;
}

.credItem + .credItem {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.credIconSm {
	width: var(--spacing--m);
	height: var(--spacing--m);
	border-radius: var(--radius--xs);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	color: var(--text-color--subtle);
	background: var(--color--background--light-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
}

.credMeta {
	flex: 1;
	min-width: 0;
}

.credName {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	margin-bottom: var(--spacing--5xs);
}

.credSub {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.credTrash {
	flex-shrink: 0;
	background: transparent;
	border: none;
	color: var(--text-color--subtle);
	cursor: pointer;
	padding: var(--spacing--3xs);
	border-radius: var(--radius--xs);
}

.credTrash:hover {
	color: var(--color--danger);
	background: var(--color--background--light-2);
}

.addAnotherBtn {
	align-self: center;
	margin-top: var(--spacing--2xs);
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
