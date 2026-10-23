<script lang="ts" setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { ROLE, type Role, type ChangeEmailRequestDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { ThemeOption } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { MFA_DOCS_URL, VALID_EMAIL_REGEX } from '@/app/constants';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
	type ConfirmPasswordModalData,
	type PromptMfaCodeModalData,
} from '../auth.constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import type {
	ConfirmPasswordModalEvents,
	MfaModalClosedEventPayload,
	MfaModalEvents,
} from '../auth.eventBus';
import { confirmPasswordEventBus, promptMfaCodeBus } from '../auth.eventBus';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import {
	N8nAvatar,
	N8nButton,
	N8nExternalLink,
	N8nInput,
	N8nNotice,
	N8nSelect2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

type ProfileField = 'firstName' | 'lastName' | 'email';

type RoleContent = {
	name: string;
	description: string;
};

const i18n = useI18n();
const { showMessage, showToast, showError } = useToast();
const documentTitle = useDocumentTitle();

const uiStore = useUIStore();
const usersStore = useUsersStore();
const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();
const cloudPlanStore = useCloudPlanStore();

const currentUser = computed((): IUser | null => usersStore.currentUser);

// Who manages this account decides which fields are editable here.
const isManagedByEnv = computed((): boolean => currentUser.value?.isManagedByEnv ?? false);

const isLdapCurrentAuthMethod = computed((): boolean => {
	return ssoStore.isEnterpriseLdapEnabled && currentUser.value?.signInType === 'ldap';
});

const isExternalAuthEnabled = computed((): boolean => {
	const isSamlEnabled = ssoStore.isSamlLoginEnabled && ssoStore.isDefaultAuthenticationSaml;
	const isOidcEnabled =
		ssoStore.isEnterpriseOidcEnabled &&
		ssoStore.isOidcLoginEnabled &&
		currentUser.value?.signInType === 'oidc';
	return isLdapCurrentAuthMethod.value || isSamlEnabled || isOidcEnabled;
});

// The owner keeps email and password control under external auth so they can't be locked out.
const isPersonalSecurityEnabled = computed((): boolean => {
	return usersStore.isInstanceOwner || !isExternalAuthEnabled.value;
});

const canEditName = computed((): boolean => !isManagedByEnv.value && !isExternalAuthEnabled.value);
const canEditEmail = computed(
	(): boolean => !isManagedByEnv.value && isPersonalSecurityEnabled.value,
);

// Why a field is read-only, shown as that row's description. Accounts managed via environment
// variables are explained once by the notice above the section, so their rows stay quiet.
const lockedFieldDescription = computed((): string | undefined =>
	isManagedByEnv.value ? undefined : i18n.baseText('settings.personal.managedBy.identityProvider'),
);

const mfaDisabled = computed((): boolean => !usersStore.mfaEnabled);
const mfaEnforced = computed((): boolean => settingsStore.isMFAEnforced);
const isMfaFeatureEnabled = computed((): boolean => settingsStore.isMfaFeatureEnabled);

// Unlike SAML/OIDC, LDAP has no native 2FA, so n8n's own 2FA must stay
// configurable for LDAP users even though password management is external.
const canConfigureMfa = computed((): boolean => {
	return (
		isMfaFeatureEnabled.value && (isPersonalSecurityEnabled.value || isLdapCurrentAuthMethod.value)
	);
});

const isSecuritySectionVisible = computed((): boolean => {
	return !isManagedByEnv.value && (isPersonalSecurityEnabled.value || canConfigureMfa.value);
});

const currentUserRole = computed<RoleContent>(() => {
	const knownRoles: Partial<Record<Role, RoleContent>> = {
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
	};

	const globalRoleName = usersStore.globalRoleName;
	const knownRole = knownRoles[globalRoleName as Role];
	if (knownRole) return knownRole;

	// Custom instance role: show its display name, without a preset tooltip.
	const customRole = rolesStore.processedInstanceRoles.find((r) => r.slug === globalRoleName);
	return {
		name: customRole?.displayName ?? globalRoleName,
		description: customRole?.description ?? '',
	};
});

/**
 * Each field saves when it loses focus (or on Enter). `draft` holds what is being typed until then;
 * Escape puts the saved value back.
 */
const draft = reactive<Record<ProfileField, string>>({
	firstName: '',
	lastName: '',
	email: '',
});

// Validation messages wait for the first blur so a field isn't flagged while it is being typed.
const touched = reactive<Record<ProfileField, boolean>>({
	firstName: false,
	lastName: false,
	email: false,
});

const savedValues = computed(
	(): Record<ProfileField, string> => ({
		firstName: currentUser.value?.firstName ?? '',
		lastName: currentUser.value?.lastName ?? '',
		email: currentUser.value?.email ?? '',
	}),
);

function resetField(field: ProfileField) {
	draft[field] = savedValues.value[field];
	touched[field] = false;
}

const profileFields = computed(() => [
	{
		name: 'firstName' as const,
		title: i18n.baseText('settings.personal.firstName'),
		type: 'text' as const,
		autocomplete: 'given-name' as const,
		maxlength: 32,
		editable: canEditName.value,
	},
	{
		name: 'lastName' as const,
		title: i18n.baseText('settings.personal.lastName'),
		type: 'text' as const,
		autocomplete: 'family-name' as const,
		maxlength: 32,
		editable: canEditName.value,
	},
	{
		name: 'email' as const,
		title: i18n.baseText('auth.email'),
		type: 'email' as const,
		autocomplete: 'email' as const,
		maxlength: undefined,
		editable: canEditEmail.value,
	},
]);

const fieldErrors = computed((): Partial<Record<ProfileField, string>> => {
	const errors: Partial<Record<ProfileField, string>> = {};
	const required = i18n.baseText('settings.personal.validation.fieldRequired');

	if (canEditName.value) {
		if (!draft.firstName.trim()) errors.firstName = required;
		if (!draft.lastName.trim()) errors.lastName = required;
	}
	if (canEditEmail.value) {
		if (!draft.email.trim()) {
			errors.email = required;
		} else if (!VALID_EMAIL_REGEX.test(draft.email.trim().toLowerCase())) {
			errors.email = i18n.baseText('settings.personal.validation.validEmailRequired');
		}
	}

	return errors;
});

function visibleError(field: ProfileField): string | undefined {
	return touched[field] ? fieldErrors.value[field] : undefined;
}

const themeItems = computed(
	(): Array<SelectOptionBase<ThemeOption>> => [
		{
			value: 'system',
			label: i18n.baseText('settings.personal.theme.systemDefault'),
			icon: 'monitor',
		},
		{ value: 'light', label: i18n.baseText('settings.personal.theme.light'), icon: 'sun' },
		{ value: 'dark', label: i18n.baseText('settings.personal.theme.dark'), icon: 'moon' },
	],
);

function onThemeChange(value: SelectValue | undefined) {
	const item = themeItems.value.find((option) => option.value === value);
	if (item && item.value !== uiStore.theme) uiStore.setTheme(item.value);
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.personal.personalSettings'));
	Object.assign(draft, savedValues.value);
});

// Quick successive saves replace the previous confirmation instead of stacking toasts.
// It closes itself after the default notification duration, so it has no close button.
let savedToast: ReturnType<typeof showMessage> | undefined;

function confirmSaved(content?: { title: string; message: string }) {
	savedToast?.close();
	savedToast = showMessage({
		title: i18n.baseText('settings.personal.personalSettingsUpdated'),
		...content,
		type: 'success',
		showClose: false,
	});
}

function onFieldBlur(field: ProfileField) {
	touched[field] = true;
	if (field === 'email') {
		commitEmail();
	} else {
		void commitName(field);
	}
}

function onFieldEnter(event: KeyboardEvent) {
	(event.target as HTMLElement).blur();
}

// Saves run one at a time, so a slow response can't overwrite a newer name.
let nameSaveQueue: Promise<void> = Promise.resolve();

async function commitName(field: 'firstName' | 'lastName') {
	nameSaveQueue = nameSaveQueue.then(async () => await saveName(field));
	await nameSaveQueue;
}

async function saveName(field: 'firstName' | 'lastName') {
	const value = draft[field].trim();
	if (!canEditName.value || fieldErrors.value[field]) return;
	if (value === savedValues.value[field]) {
		draft[field] = savedValues.value[field];
		return;
	}

	try {
		// Send the saved value for the other name field, so an edit that is not valid stays unsaved.
		const { firstName, lastName } = savedValues.value;
		await usersStore.updateUserName({ firstName, lastName, [field]: value });
		if (draft[field].trim() === value) draft[field] = savedValues.value[field];
		confirmSaved();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.personalSettingsUpdatedError'));
	}
}

/** The new address while its confirmation (password or 2FA code) is pending. */
const pendingEmail = ref<string | null>(null);

function commitEmail() {
	const value = draft.email.trim();
	if (!canEditEmail.value || pendingEmail.value !== null || fieldErrors.value.email) return;
	if (value === savedValues.value.email) {
		draft.email = savedValues.value.email;
		return;
	}

	pendingEmail.value = value;
	if (usersStore.currentUser?.mfaEnabled) {
		promptMfaCodeBus.on('closed', onEmailConfirmClosed);
		openPromptMfaCodeModal({
			purpose: 'changeEmail',
			submit: async ({ mfaCode }) => await requestEmailChange(value, { mfaCode }),
		});
	} else {
		confirmPasswordEventBus.on('closed', onEmailConfirmClosed);
		openConfirmPasswordModal({
			submit: async ({ currentPassword }) => await requestEmailChange(value, { currentPassword }),
		});
	}
}

/** Both dialogs send the request themselves, so closing one only ends the pending change. */
function onEmailConfirmClosed(
	payload: MfaModalEvents['closed'] | ConfirmPasswordModalEvents['closed'],
) {
	promptMfaCodeBus.off('closed', onEmailConfirmClosed);
	confirmPasswordEventBus.off('closed', onEmailConfirmClosed);
	pendingEmail.value = null;
	// Closing the dialog without confirming leaves the email as it was.
	if (!payload) resetField('email');
}

async function requestEmailChange(
	email: string,
	credentials: Omit<ChangeEmailRequestDto, 'email'>,
) {
	const result = await usersStore.requestEmailChange({ email, ...credentials });
	// 'confirmation-sent': nothing changes until the link is clicked, so show the current email.
	// 'changed': no email delivery is set up, so the store already holds the new address.
	draft.email = savedValues.value.email;

	if (result.status === 'confirmation-sent') {
		confirmSaved({
			title: i18n.baseText('settings.personal.emailChange.confirmationSent.title'),
			message: i18n.baseText('settings.personal.emailChange.confirmationSent.message'),
		});
	} else {
		confirmSaved();
	}
}

function openPasswordModal() {
	uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
}

async function onMfaEnableClick() {
	if (!settingsStore.isCloudDeployment || !usersStore.isInstanceOwner) {
		uiStore.openModal(MFA_SETUP_MODAL_KEY);
		return;
	}

	try {
		await usersStore.canEnableMFA();
		uiStore.openModal(MFA_SETUP_MODAL_KEY);
	} catch (e) {
		showToast({
			title: i18n.baseText('settings.personal.mfa.toast.canEnableMfa.title'),
			message: e.message,
			type: 'error',
		});
		await usersStore.sendConfirmationEmail();
	}
}

async function disableMfa(credentials: MfaModalClosedEventPayload) {
	await usersStore.disableMfa(credentials);

	showToast({
		title: i18n.baseText('settings.personal.mfa.toast.disabledMfa.title'),
		message: i18n.baseText('settings.personal.mfa.toast.disabledMfa.message'),
		type: 'success',
		duration: 0,
	});
}

function openPromptMfaCodeModal(data: PromptMfaCodeModalData) {
	uiStore.openModalWithData({ name: PROMPT_MFA_CODE_MODAL_KEY, data });
}

function openConfirmPasswordModal(data: ConfirmPasswordModalData) {
	uiStore.openModalWithData({ name: CONFIRM_PASSWORD_MODAL_KEY, data });
}

function onMfaDisableClick() {
	openPromptMfaCodeModal({ purpose: 'disableMfa', submit: disableMfa });
}

onBeforeUnmount(() => {
	promptMfaCodeBus.off('closed', onEmailConfirmClosed);
	confirmPasswordEventBus.off('closed', onEmailConfirmClosed);
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" data-test-id="personal-settings-container">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.personal.personalSettings')"
			:description="i18n.baseText('settings.personal.description')"
			:show-docs-link="false"
		/>

		<N8nNotice
			v-if="isManagedByEnv"
			:content="i18n.baseText('settings.personal.managedByEnv')"
			data-test-id="managed-by-env-notice"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.personal.basicInformation')"
			data-test-id="personal-data-form"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="currentUser"
					:title="i18n.baseText('settings.personal.profilePicture')"
					data-test-id="personal-profile-picture-row"
				>
					<template #action>
						<N8nAvatar
							:first-name="currentUser.firstName"
							:last-name="currentUser.lastName"
							size="medium"
							data-test-id="current-user-avatar"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					v-for="field in profileFields"
					:key="field.name"
					:title="field.title"
					:description="field.editable ? undefined : lockedFieldDescription"
					action-fill
					:data-test-id="`personal-${field.name}-row`"
				>
					<template #action>
						<div
							v-if="field.editable"
							:class="[$style.field, { [$style.fieldInvalid]: visibleError(field.name) }]"
						>
							<N8nInput
								v-model="draft[field.name]"
								size="medium"
								:name="field.name"
								:type="field.type"
								:autocomplete="field.autocomplete"
								:maxlength="field.maxlength"
								:aria-label="field.title"
								:aria-invalid="Boolean(visibleError(field.name))"
								:aria-describedby="
									visibleError(field.name) ? `personal-${field.name}-error` : undefined
								"
								@blur="onFieldBlur(field.name)"
								@keydown.enter="onFieldEnter"
								@keydown.esc="resetField(field.name)"
							/>
							<N8nText
								v-if="visibleError(field.name)"
								:id="`personal-${field.name}-error`"
								size="small"
								color="danger"
								role="alert"
							>
								{{ visibleError(field.name) }}
							</N8nText>
						</div>
						<N8nText
							v-else
							:class="$style.value"
							size="medium"
							color="text-base"
							:title="savedValues[field.name]"
							:data-test-id="`personal-${field.name}-value`"
						>
							{{ savedValues[field.name] }}
						</N8nText>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					v-if="currentUser"
					:title="i18n.baseText('auth.role')"
					data-test-id="personal-role-row"
				>
					<template #action>
						<N8nTooltip placement="bottom" :disabled="!currentUserRole.description">
							<template #content>{{ currentUserRole.description }}</template>
							<N8nText color="text-base" data-test-id="current-user-role">
								{{ currentUserRole.name }}
							</N8nText>
						</N8nTooltip>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-if="isSecuritySectionVisible"
			:title="i18n.baseText('settings.personal.security')"
		>
			<N8nNotice
				v-if="canConfigureMfa && mfaDisabled && mfaEnforced"
				:content="i18n.baseText('settings.personal.mfa.enforced')"
				data-test-id="mfa-enforced-notice"
			/>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="isPersonalSecurityEnabled"
					:title="i18n.baseText('auth.password')"
					:description="i18n.baseText('settings.personal.password.description')"
				>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							:label="i18n.baseText('auth.changePassword')"
							data-test-id="change-password-link"
							@click="openPasswordModal"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow v-if="canConfigureMfa" data-test-id="mfa-section">
					<template #info>
						<N8nText bold size="medium" color="text-dark">
							{{ i18n.baseText('settings.personal.mfa.section.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								mfaDisabled
									? i18n.baseText('settings.personal.mfa.description.disabled')
									: i18n.baseText('settings.personal.mfa.description.enabled')
							}}
							<N8nExternalLink
								:href="MFA_DOCS_URL"
								size="small"
								:class="$style.docsLink"
								data-test-id="mfa-docs-link"
							>
								{{ i18n.baseText('generic.learnMore') }}
							</N8nExternalLink>
						</N8nText>
					</template>
					<template #action>
						<N8nButton
							v-if="mfaDisabled"
							variant="outline"
							size="medium"
							:label="i18n.baseText('settings.personal.mfa.button.enabled')"
							data-test-id="enable-mfa-button"
							@click="onMfaEnableClick"
						/>
						<N8nButton
							v-else
							variant="outline"
							size="medium"
							:label="i18n.baseText('settings.personal.mfa.button.disabled')"
							data-test-id="disable-mfa-button"
							@click="onMfaDisableClick"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection :title="i18n.baseText('settings.personal.personalisation')">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.personal.theme')"
					:description="i18n.baseText('settings.personal.theme.description')"
				>
					<template #action>
						<N8nSelect2
							:model-value="uiStore.theme"
							:items="themeItems"
							size="medium"
							:aria-label="i18n.baseText('settings.personal.theme')"
							data-test-id="theme-select"
							@update:model-value="onThemeChange"
						>
							<!-- Every label shares one grid cell, so the trigger is as wide as the widest theme whichever one is chosen. -->
							<template #default="{ modelValue }">
								<span :class="$style.themeValue">
									<span
										v-for="item in themeItems"
										:key="item.value"
										:class="[
											$style.themeLabel,
											{ [$style.themeLabelHidden]: item.value !== modelValue },
										]"
										:aria-hidden="item.value !== modelValue || undefined"
									>
										{{ item.label }}
									</span>
								</span>
							</template>
						</N8nSelect2>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}

/* Read-only value of a locked field; long emails truncate instead of pushing the row wider. */
.value {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Input plus its validation message, filling the row's action width. */
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
}

/*
 * The input declares its own border variable, so an ancestor value is shadowed; target the
 * input element itself with a more specific selector to turn the border red.
 */
.fieldInvalid :global(.n8n-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}

/* Keep the link's hover padding without making the description line taller than its neighbours. */
.docsLink {
	margin-block: calc(-1 * var(--spacing--4xs));
}

/* The theme labels are stacked in one cell: the cell takes the widest, the hidden ones only reserve width. */
.themeValue {
	display: inline-grid;
}

.themeLabel {
	grid-area: 1 / 1;
	white-space: nowrap;
}

.themeLabelHidden {
	visibility: hidden;
}
</style>
