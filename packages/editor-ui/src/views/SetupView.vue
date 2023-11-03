<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		data-test-id="setup-form"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { defineComponent } from 'vue';

import { useToast } from '@/composables';
import type { IFormBoxConfig, IValidator } from '@/Interface';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { isValidName } from 'n8n-workflow';

export default defineComponent({
	name: 'SetupView',
	components: {
		AuthView,
	},
	setup() {
		return useToast();
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('auth.setup.setupOwner'),
			buttonText: this.$locale.baseText('auth.setup.next'),
			inputs: [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('auth.email'),
						type: 'email',
						required: true,
						validationRules: [{ name: 'VALID_EMAIL' }],
						autocomplete: 'email',
						capitalize: true,
					},
				},
				{
					name: 'firstName',
					properties: {
						label: this.$locale.baseText('auth.firstName'),
						maxlength: 32,
						required: true,
						autocomplete: 'given-name',
						capitalize: true,
						validators: {
							IS_VALID_FIRST_NAME: {
								validate: this.isValidFirstName as IValidator['validate'],
							},
						},
						validationRules: [{ name: 'IS_VALID_FIRST_NAME' }],
					},
				},
				{
					name: 'lastName',
					properties: {
						label: this.$locale.baseText('auth.lastName'),
						maxlength: 32,
						required: true,
						autocomplete: 'family-name',
						capitalize: true,
						validators: {
							IS_VALID_LAST_NAME: {
								validate: this.isValidLastName as IValidator['validate'],
							},
						},
						validationRules: [{ name: 'IS_VALID_LAST_NAME' }],
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('auth.password'),
						type: 'password',
						required: true,
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
						infoText: this.$locale.baseText('auth.defaultPasswordRequirements'),
						autocomplete: 'new-password',
						capitalize: true,
					},
				},
				{
					name: 'agree',
					properties: {
						label: this.$locale.baseText('auth.agreement.label'),
						type: 'checkbox',
					},
				},
			],
		};

		return {
			FORM_CONFIG,
			loading: false,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore),
	},
	methods: {
		async onSubmit(values: { [key: string]: string | boolean }) {
			try {
				const forceRedirectedHere = this.settingsStore.showSetupPage;
				this.loading = true;
				await this.usersStore.createOwner(
					values as { firstName: string; lastName: string; email: string; password: string },
				);

				if (values.agree === true) {
					try {
						await this.uiStore.submitContactEmail(values.email.toString(), values.agree);
					} catch {}
				}

				if (forceRedirectedHere) {
					await this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				} else {
					await this.$router.push({ name: VIEWS.USERS_SETTINGS });
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('auth.setup.settingUpOwnerError'));
			}
			this.loading = false;
		},
		isValidFirstName(value: string | number | boolean | null | undefined) {
			if (!isValidName(String(value))) {
				return {
					messageKey: 'settings.personal.invalid.field',
					options: { interpolate: { fieldName: this.$locale.baseText('auth.firstName') } },
				};
			}
			return false;
		},
		isValidLastName(value: string | number | boolean | null | undefined) {
			if (!isValidName(String(value))) {
				return {
					messageKey: 'settings.personal.invalid.field',
					options: { interpolate: { fieldName: this.$locale.baseText('auth.lastName') } },
				};
			}
			return false;
		},
	},
});
</script>
