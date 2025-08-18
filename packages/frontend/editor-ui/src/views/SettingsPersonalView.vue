<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ROLE, type Role } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import type { IFormInputs, ThemeOption } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	MFA_DOCS_URL,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import type { MfaModalEvents } from '@/event-bus/mfa';
import { promptMfaCodeBus } from '@/event-bus/mfa';
import type { BaseTextKey } from '@n8n/i18n';
import { useSSOStore } from '@/stores/sso.store';

type UserBasicDetailsForm = {
	firstName: string;
	lastName: string;
	email: string;
};

type UserBasicDetailsWithMfa = UserBasicDetailsForm & {
	mfaCode?: string;
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

const isExternalAuthEnabled = computed((): boolean => {
	const isLdapEnabled =
		ssoStore.isEnterpriseLdapEnabled && currentUser.value?.signInType === 'ldap';
	const isSamlEnabled = ssoStore.isSamlLoginEnabled && ssoStore.isDefaultAuthenticationSaml;
	const isOidcEnabled =
		ssoStore.isEnterpriseOidcEnabled && currentUser.value?.signInType === 'oidc';
	return isLdapEnabled || isSamlEnabled || isOidcEnabled;
});

const isPersonalSecurityEnabled = computed((): boolean => {
	return usersStore.isInstanceOwner || !isExternalAuthEnabled.value;
});

const mfaDisabled = computed((): boolean => {
	return !usersStore.mfaEnabled;
});
const mfaEnforced = computed((): boolean => {
	return settingsStore.isMFAEnforced;
});
const isMfaFeatureEnabled = computed((): boolean => {
	return settingsStore.isMfaFeatureEnabled;
});

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

onMounted(() => {
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
				disabled: isExternalAuthEnabled.value,
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
				disabled: isExternalAuthEnabled.value,
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
				disabled: !isPersonalSecurityEnabled.value,
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
		uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);

		promptMfaCodeBus.once('closed', async (payload: MfaModalEvents['closed']) => {
			if (!payload) {
				// User closed the modal without submitting the form
				return;
			}

			await saveUserSettings({
				...form,
				mfaCode: payload.mfaCode,
			});
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
	promptMfaCodeBus.off('closed', disableMfa);
});
</script>

<template>
	<div :class="$style.container" data-test-id="personal-settings-container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{
				i18n.baseText('settings.personal.personalSettings')
			}}</n8n-heading>
			<div v-if="currentUser" :class="$style.user">
				<span :class="$style.username" data-test-id="current-user-name">
					<n8n-text color="text-base" bold>{{ currentUser.fullName }}</n8n-text>
					<N8nTooltip placement="bottom">
						<template #content>{{ currentUserRole.description }}</template>
						<n8n-text :class="$style.tooltip" color="text-light" data-test-id="current-user-role">{{
							currentUserRole.name
						}}</n8n-text>
					</N8nTooltip>
				</span>
				<n8n-avatar
					:first-name="currentUser.firstName"
					:last-name="currentUser.lastName"
					size="large"
				/>
			</div>
		</div>
		<div>
			<div class="mb-s">
				<n8n-heading size="large">{{
					i18n.baseText('settings.personal.basicInformation')
				}}</n8n-heading>
			</div>
			<div data-test-id="personal-data-form">
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:event-bus="formBus"
					@update="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
		</div>
		<div v-if="isPersonalSecurityEnabled">
			<div class="mb-s">
				<n8n-heading size="large">{{ i18n.baseText('settings.personal.security') }}</n8n-heading>
			</div>
			<div class="mb-s">
				<n8n-input-label :label="i18n.baseText('auth.password')">
					<n8n-link data-test-id="change-password-link" @click="openPasswordModal">{{
						i18n.baseText('auth.changePassword')
					}}</n8n-link>
				</n8n-input-label>
			</div>
			<div v-if="isMfaFeatureEnabled" data-test-id="mfa-section">
				<div class="mb-xs">
					<n8n-input-label :label="i18n.baseText('settings.personal.mfa.section.title')" />
					<n8n-text :bold="false" :class="$style.infoText">
						{{
							mfaDisabled
								? i18n.baseText('settings.personal.mfa.button.disabled.infobox')
								: i18n.baseText('settings.personal.mfa.button.enabled.infobox')
						}}
						<n8n-link :to="MFA_DOCS_URL" size="small" :bold="true">
							{{ i18n.baseText('generic.learnMore') }}
						</n8n-link>
					</n8n-text>
				</div>
				<n8n-notice
					v-if="mfaDisabled && mfaEnforced"
					:content="i18n.baseText('settings.personal.mfa.enforced')"
				/>

				<n8n-button
					v-if="mfaDisabled"
					:class="$style.button"
					type="tertiary"
					:label="i18n.baseText('settings.personal.mfa.button.enabled')"
					data-test-id="enable-mfa-button"
					@click="onMfaEnableClick"
				/>
				<n8n-button
					v-else
					:class="$style.disableMfaButton"
					type="tertiary"
					:label="i18n.baseText('settings.personal.mfa.button.disabled')"
					data-test-id="disable-mfa-button"
					@click="onMfaDisableClick"
				/>
			</div>
		</div>
		<div>
			<div class="mb-s">
				<n8n-heading size="large">{{
					i18n.baseText('settings.personal.personalisation')
				}}</n8n-heading>
			</div>
			<div>
				<n8n-input-label :label="i18n.baseText('settings.personal.theme')">
					<n8n-select
						v-model="currentSelectedTheme"
						:class="$style.themeSelect"
						data-test-id="theme-select"
						size="small"
						filterable
					>
						<n8n-option
							v-for="item in themeOptions"
							:key="item.name"
							:label="i18n.baseText(item.label)"
							:value="item.name"
						>
						</n8n-option>
					</n8n-select>
				</n8n-input-label>
			</div>
		</div>
		<div>
			<n8n-button
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
		margin-bottom: var(--spacing-2xl);
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
	margin-right: var(--spacing-s);

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
	--button-color: var(--color-danger);
	> span {
		font-weight: var(--font-weight-bold);
	}
}

.button {
	font-size: var(--spacing-xs);
	> span {
		font-weight: var(--font-weight-bold);
	}
}

.infoText {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.themeSelect {
	max-width: 50%;
}
</style>
