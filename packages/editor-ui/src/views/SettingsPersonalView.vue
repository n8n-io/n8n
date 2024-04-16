<template>
	<div :class="$style.container" data-test-id="personal-settings-container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{
				i18n.baseText('settings.personal.personalSettings')
			}}</n8n-heading>
			<div :class="$style.user">
				<span :class="$style.username" data-test-id="current-user-name">
					<n8n-text color="text-light">{{ currentUser.fullName }}</n8n-text>
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
		<div v-if="!signInWithLdap && !signInWithSaml">
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

			<div v-if="isMfaFeatureEnabled">
				<n8n-input-label :label="$locale.baseText('settings.personal.mfa.section.title')" />

				<div :class="$style.mfa">
					<n8n-card>
						<template #prepend><n8n-icon icon="mobile" size="large" /></template>
						<template #header>
							<div :class="$style.headerpapa">
								<n8n-text bold="true">Authenticator app</n8n-text>
								<n8n-badge theme="primary">configured</n8n-badge>
							</div>
						</template>
						<n8n-text color="text-light" size="xsmall" class="mt-2xs mb-2xs">
							Use an authentication app or browser extension to get two-factor authentication codes
							when prompted.
						</n8n-text>
						<template #append>
							<n8n-action-toggle
								:actions="{
									0: { label: 'Disable', value: 'disable' },
									1: { label: 'Configure', value: 'configure' },
									2: { label: 'Set as default', value: 'default' },
									3: { label: 'Enabled', value: 'enable' },
								}"
								@action="(action: string) => onActionDropdownClick('totp', action)"
						/></template>
					</n8n-card>
					<n8n-card>
						<template #prepend><n8n-icon icon="user-shield" size="large" /></template>
						<template #header>
							<div :class="$style.headerpapa">
								<n8n-text bold="true">Security keys</n8n-text>
								<n8n-badge v-if="securityKeys.length > 0" theme="primary">configured</n8n-badge>
								<n8n-badge v-if="securityKeys.length > 0" theme="secondary"
									>{{ securityKeys.length }} keys</n8n-badge
								>
							</div>
						</template>
						<n8n-text color="text-light" size="xsmall" class="mt-2xs mb-2xs">
							Security keys are hardware devices that can be used as your second factor of
							authentication.
						</n8n-text>
						<template #append>
							<n8n-action-toggle
								:actions="{
									0: { label: 'Edit', value: 'edit' },
									1: { label: 'Set as default', value: 'default' },
									2: { label: 'Register security key', value: 'register' },
								}"
								@action="(action: string) => onActionDropdownClick('securityKeys', action)"
						/></template>
					</n8n-card>
				</div>
				<!-- <div :class="$style.list">
					<div :class="$style.listItem">
						<n8n-icon icon="mobile" size="xsmall" class="mr-5xs" />
						<div :class="$style.listItemDescription">
							<n8n-text bold="true">Authenticator app</n8n-text>
							<p>
								Use an authentication app or browser extension to get two-factor authentication
								codes when prompted.
							</p>
						</div>
					</div>
					<div :class="$style.listItem">
						<div>Security keys</div>
					</div>
				</div> -->

				<!-- <n8n-button
					v-if="mfaDisabled"
					:class="$style.button"
					type="tertiary"
					:label="$locale.baseText('settings.personal.mfa.button.enabled')"
					data-test-id="enable-mfa-button"
					@click="onMfaEnableClick"
				/>
				<n8n-button
					v-else
					:class="$style.disableMfaButton"
					type="tertiary"
					:label="$locale.baseText('settings.personal.mfa.button.disabled')"
					data-test-id="disable-mfa-button"
					@click="onMfaDisableClick"
				/> -->
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
						:class="$style.themeSelect"
						data-test-id="theme-select"
						size="small"
						:model-value="currentTheme"
						filterable
						@update:model-value="selectTheme"
					>
						<n8n-option
							v-for="item in themeOptions"
							:key="item.name"
							:label="$t(item.label)"
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

<script lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import type { IFormInputs, IUser, ThemeOption } from '@/Interface';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	MFA_DOCS_URL,
	MFA_SETUP_MODAL_KEY,
	SECURITY_KEYS_MODAL_KEY,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'SettingsPersonalView',
	setup() {
		const i18n = useI18n();

		return {
			i18n,
			...useToast(),
		};
	},
	data() {
		return {
			securityKeys: [] as Array<{ id: string; label: string }>,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: createEventBus(),
			readyToSubmit: false,
			mfaDocsUrl: MFA_DOCS_URL,
			themeOptions: [
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
			] as Array<{ name: ThemeOption; label: string }>,
		};
	},
	async mounted() {
		this.formInputs = [
			{
				name: 'firstName',
				initialValue: this.currentUser?.firstName,
				properties: {
					label: this.i18n.baseText('auth.firstName'),
					maxlength: 32,
					required: true,
					autocomplete: 'given-name',
					capitalize: true,
					disabled: this.isLDAPFeatureEnabled && this.signInWithLdap,
				},
			},
			{
				name: 'lastName',
				initialValue: this.currentUser?.lastName,
				properties: {
					label: this.i18n.baseText('auth.lastName'),
					maxlength: 32,
					required: true,
					autocomplete: 'family-name',
					capitalize: true,
					disabled: this.isLDAPFeatureEnabled && this.signInWithLdap,
				},
			},
			{
				name: 'email',
				initialValue: this.currentUser?.email,
				properties: {
					label: this.i18n.baseText('auth.email'),
					type: 'email',
					required: true,
					validationRules: [{ name: 'VALID_EMAIL' }],
					autocomplete: 'email',
					capitalize: true,
					disabled: (this.isLDAPFeatureEnabled && this.signInWithLdap) || this.signInWithSaml,
				},
			},
		];

		this.securityKeys = await this.usersStore.getSecurityKeys();
	},
	computed: {
		...mapStores(useUIStore, useUsersStore, useSettingsStore),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		signInWithLdap(): boolean {
			return this.currentUser?.signInType === 'ldap';
		},
		isLDAPFeatureEnabled(): boolean {
			return this.settingsStore.settings.enterprise.ldap;
		},
		signInWithSaml(): boolean {
			return (
				this.settingsStore.isSamlLoginEnabled && this.settingsStore.isDefaultAuthenticationSaml
			);
		},
		mfaDisabled(): boolean {
			return !this.usersStore.mfaEnabled;
		},
		isMfaFeatureEnabled(): boolean {
			return this.settingsStore.isMfaFeatureEnabled;
		},
		currentTheme(): ThemeOption {
			return this.uiStore.theme;
		},
	},
	methods: {
		selectTheme(theme: ThemeOption) {
			this.uiStore.setTheme(theme);
		},
		async onActionDropdownClick(method: string, action: string) {
			console.log(method, action);
			if (method === 'totp') {
				if (action === 'disable') {
					this.onMfaDisableClick();
				} else if (action === 'enable') {
					this.onMfaEnableClick();
				}
			} else if (method === 'securityKeys') {
				switch (action) {
					// case 'register':
					// 	const registrationOptions = await this.usersStore.getChallenge();
					// 	const registration = await startRegistration(registrationOptions);
					// 	await this.usersStore.registerDevice(registration);
					// 	break;
					case 'edit':
						this.uiStore.openModal(SECURITY_KEYS_MODAL_KEY);
						break;
					case 'default':
						this.uiStore.openModal(SECURITY_KEYS_MODAL_KEY);
						break;
				}
			}
		},
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: { firstName: string; lastName: string; email: string }) {
			if (!this.hasAnyChanges || !this.usersStore.currentUserId) {
				return;
			}
			try {
				await this.usersStore.updateUser({
					id: this.usersStore.currentUserId,
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email,
				});
				this.showToast({
					title: this.i18n.baseText('settings.personal.personalSettingsUpdated'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			} catch (e) {
				this.showError(e, this.i18n.baseText('settings.personal.personalSettingsUpdatedError'));
			}
		},
		onSaveClick() {
			this.formBus.emit('submit');
		},
		openPasswordModal() {
			this.uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
		},
		onMfaEnableClick() {
			this.uiStore.openModal(MFA_SETUP_MODAL_KEY);
		},
		async onMfaDisableClick() {
			try {
				await this.usersStore.disabledMfa();
				this.showToast({
					title: this.$locale.baseText('settings.personal.mfa.toast.disabledMfa.title'),
					message: this.$locale.baseText('settings.personal.mfa.toast.disabledMfa.message'),
					type: 'success',
					duration: 0,
				});
			} catch (e) {
				this.showError(
					e,
					this.$locale.baseText('settings.personal.mfa.toast.disabledMfa.error.message'),
				);
			}
		},
	},
});
</script>

<style lang="scss" module>
.headerpapa {
	display: flex;
	gap: 5px;
}

.list {
	display: flex;
	flex-direction: column;
}

.listItem {
	display: flex;
	flex-direction: row;
	// background-color: white;
}

.mfa {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.listItemDescription {
	display: flex;
	flex-direction: column;
}

.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
	padding-bottom: 100px;
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
	margin-right: var(--spacing-s);
	text-align: right;

	@media (max-width: $breakpoint-sm) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
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
