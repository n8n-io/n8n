<script setup lang="ts">
import AuthView from './AuthView.vue';
import type { IFormBoxConfig } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, ref } from 'vue';

const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const toast = useToast();
const locale = useI18n();

const loading = ref(false);

const formConfig = computed(() => {
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
				focusInitially: true,
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

const isFormWithEmail = (values: { [key: string]: string }): values is { email: string } => {
	return 'email' in values;
};

const onSubmit = async (values: { [key: string]: string }) => {
	if (!isFormWithEmail(values)) {
		return;
	}
	try {
		loading.value = true;
		await usersStore.sendForgotPasswordEmail(values);

		toast.showMessage({
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

			toast.showMessage({
				type: 'error',
				title: locale.baseText('forgotPassword.sendingEmailError'),
				message,
			});
		}
	}
	loading.value = false;
};
</script>

<template>
	<AuthView :form="formConfig" :form-loading="loading" @submit="onSubmit" />
</template>
