<template>
	<AuthView :form="formConfig" :formLoading="loading" @submit="onSubmit" />
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { useToast } from '@/composables';

import { defineComponent } from 'vue';
import type { IFormBoxConfig } from '@/Interface';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';

export default defineComponent({
	name: 'ForgotMyPasswordView',
	components: {
		AuthView,
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			loading: false,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUsersStore),
		formConfig(): IFormBoxConfig {
			const EMAIL_INPUTS: IFormBoxConfig['inputs'] = [
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
			];

			const NO_SMTP_INPUTS: IFormBoxConfig['inputs'] = [
				{
					name: 'no-smtp-warning',
					properties: {
						label: this.$locale.baseText('forgotPassword.noSMTPToSendEmailWarning'),
						type: 'info',
					},
				},
			];

			const DEFAULT_FORM_CONFIG = {
				title: this.$locale.baseText('forgotPassword.recoverPassword'),
				redirectText: this.$locale.baseText('forgotPassword.returnToSignIn'),
				redirectLink: '/signin',
			};

			if (this.settingsStore.isSmtpSetup) {
				return {
					...DEFAULT_FORM_CONFIG,
					buttonText: this.$locale.baseText('forgotPassword.getRecoveryLink'),
					inputs: EMAIL_INPUTS,
				};
			}
			return {
				...DEFAULT_FORM_CONFIG,
				inputs: NO_SMTP_INPUTS,
			};
		},
	},
	methods: {
		async onSubmit(values: { email: string }) {
			try {
				this.loading = true;
				await this.usersStore.sendForgotPasswordEmail(values);

				this.showMessage({
					type: 'success',
					title: this.$locale.baseText('forgotPassword.recoveryEmailSent'),
					message: this.$locale.baseText('forgotPassword.emailSentIfExists', {
						interpolate: { email: values.email },
					}),
				});
			} catch (error) {
				let message = this.$locale.baseText('forgotPassword.smtpErrorContactAdministrator');
				if (error.httpStatusCode === 422) {
					message = this.$locale.baseText(error.message);
				}
				this.showMessage({
					type: 'error',
					title: this.$locale.baseText('forgotPassword.sendingEmailError'),
					message,
				});
			}
			this.loading = false;
		},
	},
});
</script>
