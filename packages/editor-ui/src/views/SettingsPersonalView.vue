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
		</div>
		<div v-if="!signInWithLdap && !signInWithSaml">
			<div :class="$style.sectionHeader">
				<n8n-heading size="large">{{ $locale.baseText('settings.personal.security') }}</n8n-heading>
			</div>
			<div>
				<n8n-input-label :label="$locale.baseText('auth.password')">
					<n8n-link @click="openPasswordModal" data-test-id="change-password-link">{{
						$locale.baseText('auth.changePassword')
					}}</n8n-link>
				</n8n-input-label>
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
import { useToast } from '@/composables';
import { CHANGE_PASSWORD_MODAL_KEY } from '@/constants';
import type { IFormInputs, IUser } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'SettingsPersonalView',
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: createEventBus(),
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
					disabled: (this.isLDAPFeatureEnabled && this.signInWithLdap) || this.signInWithSaml,
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
		signInWithSaml(): boolean {
			return (
				this.settingsStore.isSamlLoginEnabled && this.settingsStore.isDefaultAuthenticationSaml
			);
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
				this.showToast({
					title: this.$locale.baseText('settings.personal.personalSettingsUpdated'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			} catch (e) {
				this.showError(e, this.$locale.baseText('settings.personal.personalSettingsUpdatedError'));
			}
		},
		onSaveClick() {
			this.formBus.emit('submit');
		},
		openPasswordModal() {
			this.uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
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

.sectionHeader {
	margin-bottom: var(--spacing-s);
}
</style>
