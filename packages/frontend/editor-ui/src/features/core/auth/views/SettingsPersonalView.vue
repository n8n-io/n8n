<script lang="ts" setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { ROLE, type Role, type ChangeEmailRequestDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
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
} from '../auth.constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import type { ConfirmPasswordModalEvents, MfaModalEvents } from '../auth.eventBus';
import { confirmPasswordEventBus, promptMfaCodeBus } from '../auth.eventBus';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { IconName } from '@n8n/design-system';
import {
	N8nAvatar,
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nLink,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
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
const { showToast, showError } = useToast();
const documentTitle = useDocumentTitle();

const uiStore = useUIStore();
const usersStore = useUsersStore();
const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();
const cloudPlanStore = useCloudPlanStore();

const isActive = ref(true);
const saving = ref(false);

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
 * Draft/saved pattern: edits land in `draft` and the save bar appears while the draft differs
 * from what the stores hold. Saving commits the draft; discarding resets it.
 */
const draft = reactive<Record<ProfileField, string> & { theme: ThemeOption }>({
	firstName: '',
	lastName: '',
	email: '',
	theme: uiStore.theme,
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

function resetDraft() {
	Object.assign(draft, savedValues.value, { theme: uiStore.theme });
	touched.firstName = false;
	touched.lastName = false;
	touched.email = false;
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

const isFormValid = computed((): boolean => Object.keys(fieldErrors.value).length === 0);

function visibleError(field: ProfileField): string | undefined {
	return touched[field] ? fieldErrors.value[field] : undefined;
}

const hasNameChanges = computed(
	(): boolean =>
		canEditName.value &&
		(draft.firstName !== savedValues.value.firstName ||
			draft.lastName !== savedValues.value.lastName),
);
const hasEmailChanges = computed(
	(): boolean => canEditEmail.value && draft.email !== savedValues.value.email,
);
const hasThemeChanges = computed((): boolean => draft.theme !== uiStore.theme);

const hasAnyChanges = computed(
	(): boolean => hasNameChanges.value || hasEmailChanges.value || hasThemeChanges.value,
);

const themeOptions: Array<{ value: ThemeOption; label: BaseTextKey; icon: IconName }> = [
	{ value: 'system', label: 'settings.personal.theme.systemDefault', icon: 'monitor' },
	{ value: 'light', label: 'settings.personal.theme.light', icon: 'sun' },
	{ value: 'dark', label: 'settings.personal.theme.dark', icon: 'moon' },
];

const selectedThemeIcon = computed(
	(): IconName => themeOptions.find((option) => option.value === draft.theme)?.icon ?? 'monitor',
);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.personal.personalSettings'));
	resetDraft();
});

async function onSave() {
	if (!hasAnyChanges.value || !isFormValid.value || saving.value) return;

	const newEmail = hasEmailChanges.value ? draft.email.trim() : null;

	saving.value = true;
	try {
		// Name and theme save immediately - they need no re-authentication.
		await saveNameAndPersonalisation();
	} finally {
		saving.value = false;
	}

	// Email changes go through the confirmation flow, gated by password or MFA.
	// Skip if the view unmounted during the awaited save, so the modal never
	// opens on a departed page.
	if (newEmail && isActive.value) {
		startEmailChange(newEmail);
	}
}

function onDiscard() {
	resetDraft();
}

/** Saves name and personalization settings, only when they changed. */
async function saveNameAndPersonalisation() {
	if (!hasNameChanges.value && !hasThemeChanges.value) {
		return;
	}

	try {
		if (hasNameChanges.value && usersStore.currentUserId) {
			await usersStore.updateUserName({ firstName: draft.firstName, lastName: draft.lastName });
			// Adopt what the server stored, so the draft and the saved state agree again.
			draft.firstName = savedValues.value.firstName;
			draft.lastName = savedValues.value.lastName;
		}
		if (hasThemeChanges.value) {
			uiStore.setTheme(draft.theme);
		}

		showToast({
			title: i18n.baseText('settings.personal.personalSettingsUpdated'),
			message: '',
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.personalSettingsUpdatedError'));
	}
}

function startEmailChange(newEmail: string) {
	if (usersStore.currentUser?.mfaEnabled) {
		uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);

		promptMfaCodeBus.once('closed', async (payload: MfaModalEvents['closed']) => {
			if (!payload) {
				// User closed the modal without submitting the form
				return;
			}

			await submitEmailChange({ email: newEmail, mfaCode: payload.mfaCode });
		});
	} else {
		uiStore.openModal(CONFIRM_PASSWORD_MODAL_KEY);

		confirmPasswordEventBus.once('close', async (payload: ConfirmPasswordModalEvents['close']) => {
			if (!payload) {
				// User closed the modal without submitting the form
				return;
			}

			await submitEmailChange({ email: newEmail, currentPassword: payload.currentPassword });
			uiStore.closeModal(CONFIRM_PASSWORD_MODAL_KEY);
		});
	}
}

async function submitEmailChange(params: ChangeEmailRequestDto) {
	try {
		const result = await usersStore.requestEmailChange(params);

		if (result.status === 'confirmation-sent') {
			// The change is not applied yet, so put the field back to the current email.
			draft.email = savedValues.value.email;
			showToast({
				title: i18n.baseText('settings.personal.emailChange.confirmationSent.title'),
				message: i18n.baseText('settings.personal.emailChange.confirmationSent.message'),
				type: 'success',
			});
		} else {
			// status 'changed': no email delivery is configured, so it applied at once.
			showToast({
				title: i18n.baseText('settings.personal.personalSettingsUpdated'),
				message: '',
				type: 'success',
			});
		}
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.personalSettingsUpdatedError'));
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

async function disableMfa(payload: MfaModalEvents['closed']) {
	if (!payload) {
		// User closed the modal without submitting the form
		return;
	}

	try {
		await usersStore.disableMfa(payload);

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

async function onMfaDisableClick() {
	uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);

	promptMfaCodeBus.once('closed', disableMfa);
}

onBeforeUnmount(() => {
	isActive.value = false;
	promptMfaCodeBus.off('closed', disableMfa);
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" data-test-id="personal-settings-container">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.personal.personalSettings')"
			:description="i18n.baseText('settings.personal.description')"
			:show-docs-link="false"
		>
			<template #titleTrailing>
				<div v-if="currentUser" :class="$style.user">
					<span :class="$style.username" data-test-id="current-user-name">
						<N8nText color="text-base" bold>{{ currentUser.fullName }}</N8nText>
						<N8nTooltip placement="bottom" :disabled="!currentUserRole.description">
							<template #content>{{ currentUserRole.description }}</template>
							<N8nText :class="$style.role" color="text-light" data-test-id="current-user-role">{{
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
			</template>
		</N8nSettingsPageHeader>

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
								@blur="touched[field.name] = true"
								@keydown.enter="onSave"
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
							<N8nLink :to="MFA_DOCS_URL" size="small" new-window>
								{{ i18n.baseText('generic.learnMore') }}
							</N8nLink>
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
					action-fill
					action-max-width="12.5rem"
				>
					<template #action>
						<N8nSelect v-model="draft.theme" size="medium" data-test-id="theme-select">
							<template #prefix>
								<N8nIcon :icon="selectedThemeIcon" size="small" :class="$style.themeIcon" />
							</template>
							<N8nOption
								v-for="option in themeOptions"
								:key="option.value"
								:value="option.value"
								:label="i18n.baseText(option.label)"
							>
								<span :class="$style.themeOption">
									<N8nIcon :icon="option.icon" size="small" :class="$style.themeIcon" />
									<span>{{ i18n.baseText(option.label) }}</span>
								</span>
							</N8nOption>
						</N8nSelect>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSaveBar
			floating
			:visible="hasAnyChanges"
			:saving="saving"
			:save-disabled="!isFormValid"
			:message="i18n.baseText('settings.personal.saveBar.unsavedChanges')"
			:save-label="i18n.baseText('settings.personal.saveBar.save')"
			:discard-label="i18n.baseText('settings.personal.saveBar.discard')"
			@save="onSave"
			@discard="onDiscard"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}

/* The signed-in identity sits beside the title, so the page reads as "Personal settings — you". */
.user {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-inline-start: var(--spacing--2xs);

	@media (max-width: $breakpoint-2xs) {
		display: none;
	}
}

.username {
	display: grid;
	grid-template-columns: 1fr;
	min-width: 0;

	@media (max-width: $breakpoint-sm) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.role {
	justify-self: start;
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
}

.themeOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

/* The select's own prefix color is near-invisible; use the standard icon tone instead. */
.themeIcon {
	color: var(--icon-color);
}
</style>
