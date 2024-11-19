<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AuthView from './AuthView.vue';
import MfaView from './MfaView.vue';

import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';

import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';

import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS, MFA_FORM } from '@/constants';

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const cloudPlanStore = useCloudPlanStore();

const route = useRoute();
const router = useRouter();

const toast = useToast();
const locale = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);
const showMfaView = ref(false);
const email = ref('');
const password = ref('');
const reportError = ref(false);

const ldapLoginLabel = computed(() => settingsStore.ldapLoginLabel);
const isLdapLoginEnabled = computed(() => settingsStore.isLdapLoginEnabled);
const emailLabel = computed(() => {
	let label = locale.baseText('auth.email');
	if (isLdapLoginEnabled.value && ldapLoginLabel.value) {
		label = ldapLoginLabel.value;
	}
	return label;
});

const formConfig: IFormBoxConfig = reactive({
	title: locale.baseText('auth.signin'),
	buttonText: locale.baseText('auth.signin'),
	redirectText: locale.baseText('forgotPassword'),
	redirectLink: '/forgot-password',
	inputs: [
		{
			name: 'email',
			properties: {
				label: emailLabel.value,
				type: 'email',
				required: true,
				...(!isLdapLoginEnabled.value && { validationRules: [{ name: 'VALID_EMAIL' }] }),
				showRequiredAsterisk: false,
				validateOnBlur: false,
				autocomplete: 'email',
				capitalize: true,
				focusInitially: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: locale.baseText('auth.password'),
				type: 'password',
				required: true,
				showRequiredAsterisk: false,
				validateOnBlur: false,
				autocomplete: 'current-password',
				capitalize: true,
			},
		},
	],
});

const onMFASubmitted = async (form: { token?: string; recoveryCode?: string }) => {
	await login({
		email: email.value,
		password: password.value,
		token: form.token,
		recoveryCode: form.recoveryCode,
	});
};

const isFormWithEmailAndPassword = (values: {
	[key: string]: string;
}): values is { email: string; password: string } => {
	return 'email' in values && 'password' in values;
};

const onEmailPasswordSubmitted = async (form: { [key: string]: string }) => {
	if (!isFormWithEmailAndPassword(form)) return;
	await login(form);
};

const isRedirectSafe = () => {
	const redirect = getRedirectQueryParameter();
	return redirect.startsWith('/') || redirect.startsWith(window.location.origin);
};

const getRedirectQueryParameter = () => {
	let redirect = '';
	if (typeof route.query?.redirect === 'string') {
		redirect = decodeURIComponent(route.query?.redirect);
	}
	return redirect;
};

const login = async (form: {
	email: string;
	password: string;
	token?: string;
	recoveryCode?: string;
}) => {
	try {
		loading.value = true;
		await usersStore.loginWithCreds({
			email: form.email,
			password: form.password,
			mfaToken: form.token,
			mfaRecoveryCode: form.recoveryCode,
		});
		loading.value = false;
		if (settingsStore.isCloudDeployment) {
			try {
				await cloudPlanStore.checkForCloudPlanData();
			} catch (error) {
				console.warn('Failed to check for cloud plan data', error);
			}
		}
		await settingsStore.getSettings();
		toast.clearAllStickyNotifications();

		telemetry.track('User attempted to login', {
			result: showMfaView.value ? 'mfa_success' : 'success',
		});

		if (isRedirectSafe()) {
			const redirect = getRedirectQueryParameter();
			if (redirect.startsWith('http')) {
				window.location.href = redirect;
				return;
			}

			void router.push(redirect);
			return;
		}

		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		if (error.errorCode === MFA_AUTHENTICATION_REQUIRED_ERROR_CODE) {
			showMfaView.value = true;
			cacheCredentials(form);
			return;
		}

		telemetry.track('User attempted to login', {
			result: showMfaView.value ? 'mfa_token_rejected' : 'credentials_error',
		});

		if (!showMfaView.value) {
			toast.showError(error, locale.baseText('auth.signin.error'));
			loading.value = false;
			return;
		}

		reportError.value = true;
	}
};

const onBackClick = (fromForm: string) => {
	reportError.value = false;
	if (fromForm === MFA_FORM.MFA_TOKEN) {
		showMfaView.value = false;
		loading.value = false;
	}
};
const onFormChanged = (toForm: string) => {
	if (toForm === MFA_FORM.MFA_RECOVERY_CODE) {
		reportError.value = false;
	}
};
const cacheCredentials = (form: { email: string; password: string }) => {
	email.value = form.email;
	password.value = form.password;
};
</script>

<template>
	<div>
		<AuthView
			v-if="!showMfaView"
			:form="formConfig"
			:form-loading="loading"
			:with-sso="true"
			data-test-id="signin-form"
			@submit="onEmailPasswordSubmitted"
		/>
		<MfaView
			v-if="showMfaView"
			:report-error="reportError"
			@submit="onMFASubmitted"
			@on-back-click="onBackClick"
			@on-form-changed="onFormChanged"
		/>
	</div>
</template>
