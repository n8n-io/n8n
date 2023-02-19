<template>
	<div :class="$style.container" data-test-id="personal-settings-container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{
				$locale.baseText('settings.personal.personalSettings')
			}}</n8n-heading>
			<div class="ph-no-capture" :class="$style.user">
				<span :class="$style.username" data-test-id="current-user-name">
					<n8n-text color="text-light">{{ currentUser.fullName }}</n8n-text>
				</span>
				<n8n-avatar
					:firstName="currentUser.firstName"
					:lastName="currentUser.lastName"
					size="large"
				/>
			</div>
		</div>
		<div>
			<div :class="$style.sectionHeader">
				<n8n-heading size="large">{{
					$locale.baseText('settings.personal.basicInformation')
				}}</n8n-heading>
			</div>
			<div data-test-id="personal-data-form">
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div v-if="!signInWithLdap">
				<div :class="$style.sectionHeader">
					<n8n-heading size="large">{{
						$locale.baseText('settings.personal.security')
					}}</n8n-heading>
				</div>
				<div>
					<n8n-input-label :label="$locale.baseText('auth.password')"> </n8n-input-label>
					<n8n-button
						:class="$style.button"
						@click="openPasswordModal"
						type="tertiary"
						data-test-id="change-password-link"
						:label="$locale.baseText('auth.changePassword')"
					></n8n-button>
				</div>
			</div>
			<div>
				<div :class="$style.mfaSection">
					<n8n-input-label :label="$locale.baseText('settings.personal.mfa.section.title')">
					</n8n-input-label>
					<n8n-info-tip :bold="false" :class="$style['edit-mode-footer-infotip']">
						{{
							mfaDisabled
								? $locale.baseText('settings.personal.mfa.button.disabled.infobox')
								: $locale.baseText('settings.personal.mfa.infobox.enabled.infobox')
						}}
						<n8n-link :to="MfaDocsUrl" size="small" bold="true">
							{{ $locale.baseText('generic.learnMore') }}
						</n8n-link>
					</n8n-info-tip>
				</div>
				<div :class="$style.mfaButtonContainer" v-if="mfaDisabled">
					<n8n-button
						:class="$style.button"
						float="left"
						type="tertiary"
						:label="$locale.baseText('settings.personal.mfa.button.enabled')"
						@click="onMfaEnableClick"
					/>
				</div>
				<div v-else>
					<n8n-button
						:class="$style.disableMfaButton"
						float="left"
						type="tertiary"
						:label="$locale.baseText('settings.personal.mfa.button.disabled')"
						@click="onMfaDisableClick"
					/>
				</div>
			</div>
		</div>
		<div>
			<n8n-button
				float="right"
				:label="$locale.baseText('settings.personal.save')"
				size="large"
				:disabled="!hasAnyChanges || !readyToSubmit"
				data-test-id="save-settings-button"
				@click="onSaveClick"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import { CHANGE_PASSWORD_MODAL_KEY, MFA_DOCS_URL, MFA_SETUP_MODAL_KEY } from '@/constants';
import { IFormInputs, IUser } from '@/Interface';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';
import { mapStores } from 'pinia';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

export default mixins(showMessage).extend({
	name: 'SettingsPersonalView',
	data() {
		return {
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
		};
	},
	mounted() {
		this.formInputs = [
			{
				name: 'firstName',
				initialValue: this.currentUser?.firstName,
				properties: {
					label: this.$locale.baseText('auth.firstName'),
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
					label: this.$locale.baseText('auth.lastName'),
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
					label: this.$locale.baseText('auth.email'),
					type: 'email',
					required: true,
					validationRules: [{ name: 'VALID_EMAIL' }],
					autocomplete: 'email',
					capitalize: true,
					disabled: this.isLDAPFeatureEnabled && this.signInWithLdap,
				},
			},
		];
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
			return this.settingsStore.settings.enterprise.ldap === true;
		},
		mfaDisabled(): boolean {
			return !this.usersStore.mfaEnabled;
		},
		MfaDocsUrl(): string {
			return MFA_DOCS_URL;
		},
	},
	methods: {
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
				this.$showToast({
					title: this.$locale.baseText('settings.personal.personalSettingsUpdated'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			} catch (e) {
				this.$showError(e, this.$locale.baseText('settings.personal.personalSettingsUpdatedError'));
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		openPasswordModal() {
			this.uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
		},
		onMfaEnableClick() {
			this.uiStore.openModal(MFA_SETUP_MODAL_KEY);
		},
		async onMfaDisableClick() {
			const settingStore = useSettingsStore();
			await settingStore.disabledMfa();
			this.$showToast({
				title: this.$locale.baseText('settings.personal.mfa.toast.disabledMfa.title'),
				message: this.$locale.baseText('settings.personal.mfa.toast.disabledMfa.message'),
				type: 'success',
				duration: 0,
			});
		},
	},
});
</script>

<style lang="scss" module>
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
	--button-color: #f45959;
	font-weight: var(--font-weight-bold) !important;
	margin-top: 8px;
}

.button {
	font-size: 12px;
	font-weight: var(--font-weight-bold) !important;
}

.mfaSection {
	margin-top: var(--spacing-s);
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
	margin-top: var(--spacing-s);
}

.mfaButtonContainer {
	margin-top: var(--spacing-2xs);
}
</style>
