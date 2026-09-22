<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AuthView from './AuthView.vue';
import MfaView from './MfaView.vue';
import SsoSigninCard from '../components/SsoSigninCard.vue';

import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useNotificationsStore } from '@n8n/stores/notifications.store';

import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { IFormBoxConfig } from '@/Interface';
import {
	INTERNAL_AUTH_QUERY_PARAM,
	MFA_AUTHENTICATION_REQUIRED_ERROR_CODE,
	VIEWS,
	MFA_FORM,
} from '@/app/constants';
import type { LoginRequestDto } from '@n8n/api-types';
import {
	SSO_ERROR_ACCESS_DENIED,
	SSO_ERROR_LOGIN_FAILED,
	SSO_ERROR_QUERY_PARAM,
	SSO_LOGIN_REQUIRED_ERROR_CODE,
} from '@n8n/api-types';

export type EmailOrLdapLoginIdAndPassword = Pick<
	LoginRequestDto,
	'emailOrLdapLoginId' | 'password'
>;

export type MfaCodeOrMfaRecoveryCode = Pick<LoginRequestDto, 'mfaCode' | 'mfaRecoveryCode'>;

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();

const route = useRoute();
const router = useRouter();

const toast = useToast();
const locale = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);
const showMfaView = ref(false);
const emailOrLdapLoginId = ref('');
const password = ref('');
const reportError = ref(false);

// SSO (SAML or OIDC) is the active login method: lead with it and keep the
// password form behind a disclosure. `?internalAuth=true` reveals the form up
// front so an admin can still sign in when the identity provider is down.
const isSsoLogin = computed(() => ssoStore.showSsoLoginButton);
const isInternalAuthRequested = computed(() => route.query[INTERNAL_AUTH_QUERY_PARAM] === 'true');
const ssoLoading = ref(false);
const ssoRequired = ref(false);

const notificationsStore = useNotificationsStore();

// Notifications are suppressed on the auth views, so lift the suppression just
// for this message.
const showAuthViewMessage = (messageData: Parameters<typeof toast.showMessage>[0]) => {
	notificationsStore.setNotificationsSuppressed(false);
	toast.showMessage(messageData);
	notificationsStore.setNotificationsSuppressed(true);
};

onMounted(() => {
	// An SSO login denied by role mapping ("Block access"): the user authenticated
	// fine at the IdP, they are simply not allowed in, so say exactly that.
	if (route.query[SSO_ERROR_QUERY_PARAM] === SSO_ERROR_ACCESS_DENIED) {
		showAuthViewMessage({
			title: locale.baseText('auth.signin.accessDenied.title'),
			message: locale.baseText('auth.signin.accessDenied'),
			type: 'error',
			duration: 0,
		});
		return;
	}

	// The SSO callback failed to sign the user in (bad IdP response, invalid
	// state/nonce, token failure). The provider's own message is untrusted and
	// never shown, so give a generic retry message.
	if (route.query[SSO_ERROR_QUERY_PARAM] === SSO_ERROR_LOGIN_FAILED) {
		showAuthViewMessage({
			title: locale.baseText('auth.signin.ssoLoginFailed.title'),
			message: locale.baseText('auth.signin.ssoLoginFailed'),
			type: 'error',
			duration: 0,
		});
		return;
	}

	if (route.query.sessionExpired !== 'true') {
		return;
	}

	showAuthViewMessage({
		title: locale.baseText('auth.signin.sessionExpired.title'),
		message: locale.baseText('auth.signin.sessionExpired'),
		type: 'info',
	});
});

// Covers leaving via e.g. "Forgot password", which login() below never sees.
onUnmounted(() => {
	notificationsStore.setNotificationsSuppressed(false);
});

const ldapLoginLabel = computed(() => ssoStore.ldapLoginLabel);
const isLdapLoginEnabled = computed(() => ssoStore.isLdapLoginEnabled);
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
			name: 'emailOrLdapLoginId',
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

const onMFASubmitted = async (form: MfaCodeOrMfaRecoveryCode) => {
	await login({
		emailOrLdapLoginId: emailOrLdapLoginId.value,
		password: password.value,
		mfaCode: form.mfaCode,
		mfaRecoveryCode: form.mfaRecoveryCode,
	});
};

const onEmailPasswordSubmitted = async (form: EmailOrLdapLoginIdAndPassword) => {
	await login(form);
};

const onSsoLogin = async () => {
	ssoLoading.value = true;
	try {
		const redirectUrl = ssoStore.isDefaultAuthenticationSaml
			? await ssoStore.getSSORedirectUrl(
					typeof route.query?.redirect === 'string' ? route.query.redirect : '',
				)
			: ssoStore.oidc.loginUrl;
		window.location.href = redirectUrl ?? '';
	} catch (error) {
		ssoLoading.value = false;
		toast.showError(error, locale.baseText('auth.signin.error'));
	}
};

const isRedirectSafe = () => {
	const redirect = getRedirectQueryParameter();

	// Allow local redirects
	if (redirect.startsWith('/')) {
		return true;
	}

	try {
		// Only allow origin domain redirects
		const url = new URL(redirect);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
};

const getRedirectQueryParameter = () => {
	let redirect = '';
	if (typeof route.query?.redirect === 'string') {
		redirect = decodeURIComponent(route.query?.redirect);
	}
	return redirect;
};

const login = async (form: LoginRequestDto) => {
	notificationsStore.setNotificationsSuppressed(false);
	ssoRequired.value = false;
	try {
		loading.value = true;
		await usersStore.loginWithCreds({
			emailOrLdapLoginId: form.emailOrLdapLoginId,
			password: form.password,
			mfaCode: form.mfaCode,
			mfaRecoveryCode: form.mfaRecoveryCode,
		});
		loading.value = false;
		await settingsStore.getSettings();

		toast.clearAllStickyNotifications();

		if (settingsStore.isMFAEnforced && !usersStore.currentUser?.mfaAuthenticated) {
			await router.push({ name: VIEWS.PERSONAL_SETTINGS });
			return;
		}

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

		// The account has to sign in through SSO: explain that inline, next to the
		// SSO button, instead of surfacing it as a generic login failure.
		if (
			error.errorCode === SSO_LOGIN_REQUIRED_ERROR_CODE &&
			isSsoLogin.value &&
			!showMfaView.value
		) {
			ssoRequired.value = true;
			loading.value = false;
			return;
		}

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
const cacheCredentials = (form: EmailOrLdapLoginIdAndPassword) => {
	emailOrLdapLoginId.value = form.emailOrLdapLoginId;
	password.value = form.password;
};
</script>

<template>
	<div>
		<template v-if="!showMfaView">
			<AuthView v-if="isSsoLogin" data-test-id="signin-form">
				<SsoSigninCard
					:form="formConfig"
					:form-loading="loading"
					:sso-loading="ssoLoading"
					:sso-required="ssoRequired"
					:default-expanded="isInternalAuthRequested"
					@submit="onEmailPasswordSubmitted"
					@sso-login="onSsoLogin"
				/>
			</AuthView>
			<AuthView
				v-else
				:form="formConfig"
				:form-loading="loading"
				data-test-id="signin-form"
				@submit="onEmailPasswordSubmitted"
			/>
		</template>
		<MfaView
			v-if="showMfaView"
			:report-error="reportError"
			@submit="onMFASubmitted"
			@on-back-click="onBackClick"
			@on-form-changed="onFormChanged"
		/>
	</div>
</template>
