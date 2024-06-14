<template>
	<AuthView :form="formConfig" :form-loading="loading" @submit="onSubmit" />
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { IFormBoxConfig } from '@/Interface';
import AuthView from './AuthView.vue';
import { useI18n } from '@/composables/useI18n';

const loading = ref(false);

const locale = useI18n();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const { showMessage } = useToast();

const formConfig = computed<IFormBoxConfig>(() => {
	const EMAIL_INPUTS: IFormBoxConfig['inputs'] = [
		{
			name: 'email',
			properties: {
				label: locale.baseText('auth.email'),
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
				label: locale.baseText('forgotPassword.noSMTPToSendEmailWarning'),
				type: 'info',
			},
		},
	];

	const DEFAULT_FORM_CONFIG = {
		title: locale.baseText('forgotPassword.recoverPassword'),
		redirectText: locale.baseText('forgotPassword.returnToSignIn'),
		redirectLink: '/signin',
	};

	if (settingsStore.isSmtpSetup) {
		return {
			...DEFAULT_FORM_CONFIG,
			buttonText: locale.baseText('forgotPassword.getRecoveryLink'),
			inputs: EMAIL_INPUTS,
		};
	}
	return {
		...DEFAULT_FORM_CONFIG,
		inputs: NO_SMTP_INPUTS,
	};
});

async function onSubmit(values: { email: string }) {
	try {
		loading.value = true;
		await usersStore.sendForgotPasswordEmail(values);

		showMessage({
			type: 'success',
			title: locale.baseText('forgotPassword.recoveryEmailSent'),
			message: locale.baseText('forgotPassword.emailSentIfExists', {
				interpolate: { email: values.email },
			}),
		});
	} catch (error) {
		let message = locale.baseText('forgotPassword.smtpErrorContactAdministrator');
		if (error.httpStatusCode) {
			const { httpStatusCode: status } = error;
			if (status === 429) {
				message = locale.baseText('forgotPassword.tooManyRequests');
			} else if (error.httpStatusCode === 422) {
				message = locale.baseText(error.message);
			}

			showMessage({
				type: 'error',
				title: locale.baseText('forgotPassword.sendingEmailError'),
				message,
			});
		}
	}
	loading.value = false;
}
</script>
