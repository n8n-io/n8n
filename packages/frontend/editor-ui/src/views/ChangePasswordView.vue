<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import AuthView from '@/views/AuthView.vue';

import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useUsersStore } from '@/stores/users.store';

import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH, VIEWS } from '@/constants';

const usersStore = useUsersStore();

const locale = useI18n();
const toast = useToast();
const router = useRouter();

const password = ref('');
const loading = ref(false);
const config = ref<IFormBoxConfig | null>(null);

const passwordsMatch = (value: string | number | boolean | null | undefined) => {
	if (typeof value !== 'string') {
		return false;
	}

	if (value !== password.value) {
		return {
			messageKey: 'auth.changePassword.passwordsMustMatchError',
		};
	}

	return false;
};

const getResetToken = () => {
	return !router.currentRoute.value.query.token ||
		typeof router.currentRoute.value.query.token !== 'string'
		? null
		: router.currentRoute.value.query.token;
};

const getMfaEnabled = () => {
	if (!router.currentRoute.value.query.mfaEnabled) return null;
	return router.currentRoute.value.query.mfaEnabled === 'true' ? true : false;
};

const onSubmit = async (values: { [key: string]: string }) => {
	try {
		loading.value = true;
		const token = getResetToken();

		if (token) {
			const changePasswordParameters = {
				token,
				password: password.value,
				...(values.mfaCode && { mfaCode: values.mfaCode }),
			};

			await usersStore.changePassword(changePasswordParameters);

			toast.showMessage({
				type: 'success',
				title: locale.baseText('auth.changePassword.passwordUpdated'),
				message: locale.baseText('auth.changePassword.passwordUpdatedMessage'),
			});

			await router.push({ name: VIEWS.SIGNIN });
		} else {
			toast.showError(
				new Error(locale.baseText('auth.validation.missingParameters')),
				locale.baseText('auth.changePassword.error'),
			);
		}
	} catch (error) {
		toast.showError(error, locale.baseText('auth.changePassword.error'));
	}
	loading.value = false;
};

const onInput = (e: FormFieldValueUpdate) => {
	if (e.name === 'password' && typeof e.value === 'string') {
		password.value = e.value;
	}
};

onMounted(async () => {
	const form: IFormBoxConfig = {
		title: locale.baseText('auth.changePassword'),
		buttonText: locale.baseText('auth.changePassword'),
		redirectText: locale.baseText('auth.signin'),
		redirectLink: '/signin',
		inputs: [
			{
				name: 'password',
				properties: {
					label: locale.baseText('auth.newPassword'),
					type: 'password',
					required: true,
					validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
					infoText: locale.baseText('auth.defaultPasswordRequirements'),
					autocomplete: 'new-password',
					capitalize: true,
				},
			},
			{
				name: 'password2',
				properties: {
					label: locale.baseText('auth.changePassword.reenterNewPassword'),
					type: 'password',
					required: true,
					validators: {
						TWO_PASSWORDS_MATCH: {
							validate: passwordsMatch,
						},
					},
					validationRules: [{ name: 'TWO_PASSWORDS_MATCH' }],
					autocomplete: 'new-password',
					capitalize: true,
				},
			},
		],
	};

	const token = getResetToken();
	const mfaEnabled = getMfaEnabled();

	if (mfaEnabled) {
		form.inputs.push({
			name: 'mfaCode',
			initialValue: '',
			properties: {
				required: true,
				label: locale.baseText('mfa.code.input.label'),
				placeholder: locale.baseText('mfa.code.input.placeholder'),
				maxlength: MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
				capitalize: true,
				validateOnBlur: true,
			},
		});
	}

	config.value = form;

	try {
		if (!token) {
			throw new Error(locale.baseText('auth.changePassword.missingTokenError'));
		}

		await usersStore.validatePasswordToken({ token });
	} catch (e) {
		toast.showError(e, locale.baseText('auth.changePassword.tokenValidationError'));
		void router.replace({ name: VIEWS.SIGNIN });
	}
});
</script>

<template>
	<AuthView
		v-if="config"
		:form="config"
		:form-loading="loading"
		@submit="onSubmit"
		@update="onInput"
	/>
</template>
