<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nButton } from '@n8n/design-system';

import AuthView from './AuthView.vue';
import MfaView from './MfaView.vue';

import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS, MFA_FORM } from '@/app/constants';
import type { LoginRequestDto, MfaMethod } from '@n8n/api-types';

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
const mfaMethod = ref<MfaMethod>('totp');
const emailOrLdapLoginId = ref('');
const password = ref('');
const reportError = ref(false);

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
				autocomplete: 'username webauthn',
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

const onWebAuthnSubmitted = async (webauthnResponse: unknown) => {
	await login({
		emailOrLdapLoginId: emailOrLdapLoginId.value,
		password: password.value,
		webauthnResponse,
	});
};

const onEmailPasswordSubmitted = async (form: EmailOrLdapLoginIdAndPassword) => {
	await login(form);
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
	try {
		loading.value = true;
		await usersStore.loginWithCreds({
			emailOrLdapLoginId: form.emailOrLdapLoginId,
			password: form.password,
			mfaCode: form.mfaCode,
			mfaRecoveryCode: form.mfaRecoveryCode,
			webauthnResponse: form.webauthnResponse,
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
			const methodFromError = (error.meta as { mfaMethod?: MfaMethod } | undefined)?.mfaMethod;
			mfaMethod.value = methodFromError ?? 'totp';
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
const cacheCredentials = (form: EmailOrLdapLoginIdAndPassword) => {
	emailOrLdapLoginId.value = form.emailOrLdapLoginId;
	password.value = form.password;
};

// Shown when at least one user on the instance has a registered passkey
// (signal comes from `frontendSettings.mfa.passkeysAvailable`). The Web
// platform doesn't expose per-device passkey presence, so the per-instance
// flag is the most reliable surface: if nobody has a passkey, the button is
// useless; if someone does, the user might be them and we should offer it.
const showPasskeyButton = computed(() => settingsStore.isPasskeyAvailable);
const passkeyLoading = ref(false);

const onSigninWithPasskeyComplete = async () => {
	await settingsStore.getSettings();
	toast.clearAllStickyNotifications();
	telemetry.track('User attempted to login', { result: 'passkey_success' });

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
};

// `@simplewebauthn/browser` wraps the underlying DOMException in a custom
// `WebAuthnError` that carries a stable `code`, so checking `instanceof
// DOMException` doesn't match. We treat user-dismissed and aborted ceremonies
// (e.g. autofill cancelled by the explicit button) as benign — silent.
// Anything else is a real server rejection: the credentialId isn't on file.
const isBenignPasskeyError = (e: unknown): boolean => {
	if (!e || typeof e !== 'object') return false;
	const candidate = e as { name?: string; code?: string; cause?: { name?: string } };
	if (candidate.name === 'NotAllowedError' || candidate.name === 'AbortError') return true;
	if (candidate.code === 'ERROR_CEREMONY_ABORTED') return true;
	if (candidate.code === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') return true;
	const causeName = candidate.cause?.name;
	return causeName === 'NotAllowedError' || causeName === 'AbortError';
};

const handlePasskeySignInError = (e: unknown) => {
	if (isBenignPasskeyError(e)) return;
	toast.showError(e, locale.baseText('auth.signin.passkey.error'));
};

const onSigninWithPasskeyClick = async () => {
	passkeyLoading.value = true;
	try {
		const signedIn = await usersStore.signinWithPasskey();
		if (!signedIn) return;
		await onSigninWithPasskeyComplete();
	} catch (e) {
		handlePasskeySignInError(e);
	} finally {
		passkeyLoading.value = false;
	}
};

// Conditional UI: while the signin page is mounted, ask the browser to surface
// any saved discoverable passkey for this origin via its native autofill UI.
// Tapping the suggestion runs the WebAuthn ceremony and posts the assertion to
// the passwordless verify endpoint.
onMounted(async () => {
	try {
		const { browserSupportsWebAuthnAutofill } = await import('@simplewebauthn/browser');
		if (!(await browserSupportsWebAuthnAutofill())) return;

		const signedIn = await usersStore.signinWithPasskey({ useBrowserAutofill: true });
		if (!signedIn) return;
		await onSigninWithPasskeyComplete();
	} catch (e) {
		handlePasskeySignInError(e);
	}
});
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
		>
			<template v-if="showPasskeyButton" #header>
				<div :class="$style.passkeyHeader">
					<N8nButton
						variant="outline"
						size="large"
						icon="user-round"
						:label="locale.baseText('auth.signin.passkey.button')"
						:loading="passkeyLoading"
						:class="$style.passkeyButton"
						data-test-id="signin-with-passkey-button"
						@click="onSigninWithPasskeyClick"
					/>
					<div :class="$style.passkeyDivider">
						<span>{{ locale.baseText('auth.signin.passkey.divider') }}</span>
					</div>
				</div>
			</template>
		</AuthView>
		<MfaView
			v-if="showMfaView"
			:report-error="reportError"
			:email="emailOrLdapLoginId"
			:mfa-method="mfaMethod"
			@submit="onMFASubmitted"
			@webauthn-submit="onWebAuthnSubmitted"
			@on-back-click="onBackClick"
			@on-form-changed="onFormChanged"
		/>
	</div>
</template>

<style lang="scss" module>
.passkeyHeader {
	margin-bottom: var(--spacing--xl);
}

.passkeyButton {
	width: 100%;
}

.passkeyDivider {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--lg);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.04em;

	&::before,
	&::after {
		content: '';
		flex: 1;
		height: 1px;
		background-color: var(--color--background--shade-1);
	}
}
</style>
