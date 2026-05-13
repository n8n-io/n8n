<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import AuthView from './AuthView.vue';

import { useI18n } from '@n8n/i18n';
import {
	createPasswordRules,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInfoTip,
	N8nLogo,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH, VIEWS } from '@/app/constants';
import type { MfaMethod } from '@n8n/api-types';

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const locale = useI18n();
const toast = useToast();
const router = useRouter();
const passwordMinLength = settingsStore.userManagement.passwordMinLength ?? 8;

const password = ref('');
const loading = ref(false);
const config = ref<IFormBoxConfig | null>(null);
const mfaMethod = ref<MfaMethod | null>(null);
const webauthnPassword = ref('');
const webauthnPasswordConfirm = ref('');
const webauthnPasswordError = ref('');
const webauthnVerifying = ref(false);
const webauthnError = ref('');

const isWebauthnFlow = computed(
	() => mfaMethod.value === 'passkey' || mfaMethod.value === 'security_key',
);

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
	return router.currentRoute.value.query.mfaEnabled === 'true';
};

const getMfaMethod = (): MfaMethod | null => {
	const param = router.currentRoute.value.query.mfaMethods;
	if (typeof param !== 'string') return null;
	const methods = param
		.split(',')
		.filter((m): m is MfaMethod => m === 'totp' || m === 'passkey' || m === 'security_key');
	if (methods.includes('passkey')) return 'passkey';
	if (methods.includes('security_key')) return 'security_key';
	if (methods.includes('totp')) return 'totp';
	return null;
};

const submitChangePassword = async (
	params: { mfaCode?: string; webauthnResponse?: unknown },
	onSuccess?: () => void,
) => {
	const token = getResetToken();
	if (!token) {
		toast.showError(
			new Error(locale.baseText('auth.validation.missingParameters')),
			locale.baseText('auth.changePassword.error'),
		);
		return;
	}

	try {
		loading.value = true;
		await usersStore.changePassword({
			token,
			password: password.value,
			...params,
		});

		toast.showMessage({
			type: 'success',
			title: locale.baseText('auth.changePassword.passwordUpdated'),
			message: locale.baseText('auth.changePassword.passwordUpdatedMessage'),
		});

		if (onSuccess) onSuccess();
		await router.push({ name: VIEWS.SIGNIN });
	} catch (error) {
		toast.showError(error, locale.baseText('auth.changePassword.error'));
	} finally {
		loading.value = false;
	}
};

const onSubmit = async (values: { [key: string]: string }) => {
	const params: { mfaCode?: string } = {};
	if (values.mfaCode) params.mfaCode = values.mfaCode;
	await submitChangePassword(params);
};

const onInput = (e: FormFieldValueUpdate) => {
	if (e.name === 'password' && typeof e.value === 'string') {
		password.value = e.value;
	}
};

const validateWebauthnPasswords = () => {
	webauthnPasswordError.value = '';
	if (webauthnPassword.value.length < passwordMinLength) {
		webauthnPasswordError.value = locale.baseText('auth.defaultPasswordRequirements', {
			interpolate: { minimum: passwordMinLength },
		});
		return false;
	}
	if (webauthnPassword.value !== webauthnPasswordConfirm.value) {
		webauthnPasswordError.value = locale.baseText('auth.changePassword.passwordsMustMatchError');
		return false;
	}
	return true;
};

const onWebauthnVerify = async () => {
	if (!validateWebauthnPasswords()) return;

	const token = getResetToken();
	if (!token) return;

	webauthnError.value = '';
	webauthnVerifying.value = true;
	try {
		const webauthnResponse = await usersStore.getPasswordResetWebAuthnAssertion(token);
		password.value = webauthnPassword.value;
		await submitChangePassword({ webauthnResponse });
	} catch (e) {
		const isCancelledOrFocusLoss = e instanceof DOMException && e.name === 'NotAllowedError';
		webauthnError.value = isCancelledOrFocusLoss
			? locale.baseText('mfa.login.webauthn.error.cancelled')
			: locale.baseText('auth.changePassword.webauthn.error');
	} finally {
		webauthnVerifying.value = false;
	}
};

onMounted(async () => {
	mfaMethod.value = getMfaMethod();

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
					validationRules: [createPasswordRules(passwordMinLength)],
					infoText: locale.baseText('auth.defaultPasswordRequirements', {
						interpolate: { minimum: passwordMinLength },
					}),
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

	// TOTP path keeps the inline mfaCode field (matches the existing flow).
	if (mfaEnabled && !isWebauthnFlow.value) {
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

const releaseChannel = computed(() => settingsStore.settings.releaseChannel);
const tone = computed(() => (mfaMethod.value === 'passkey' ? 'passkey' : 'security_key'));
</script>

<template>
	<!-- WebAuthn (passkey / security key) flow -->
	<div v-if="isWebauthnFlow" :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<N8nCard>
			<div :class="$style.headerContainer">
				<N8nHeading size="xlarge" color="text-dark">
					{{ locale.baseText('auth.changePassword') }}
				</N8nHeading>
			</div>

			<div :class="$style.passwordsBlock">
				<label :class="$style.fieldLabel" for="webauthn-new-password">
					{{ locale.baseText('auth.newPassword') }}
				</label>
				<input
					id="webauthn-new-password"
					v-model="webauthnPassword"
					type="password"
					autocomplete="new-password"
					:class="$style.input"
					:disabled="webauthnVerifying || loading"
				/>
				<label :class="$style.fieldLabel" for="webauthn-confirm-password">
					{{ locale.baseText('auth.changePassword.reenterNewPassword') }}
				</label>
				<input
					id="webauthn-confirm-password"
					v-model="webauthnPasswordConfirm"
					type="password"
					autocomplete="new-password"
					:class="$style.input"
					:disabled="webauthnVerifying || loading"
				/>
				<N8nText v-if="webauthnPasswordError" color="danger" size="small">
					{{ webauthnPasswordError }}
				</N8nText>
			</div>

			<div :class="$style.webauthnPrompt">
				<div
					:class="[$style.bigIcon, $style[`tone_${tone}`], { [$style.pulse]: webauthnVerifying }]"
				>
					<N8nIcon :icon="mfaMethod === 'passkey' ? 'fingerprint' : 'key-round'" :size="36" />
				</div>
				<N8nHeading tag="h3" size="medium" color="text-dark" :class="$style.promptTitle">
					{{ locale.baseText(`auth.changePassword.${mfaMethod ?? 'passkey'}.title` as never) }}
				</N8nHeading>
				<N8nText size="small" color="text-base" :class="$style.promptDescription">
					{{
						locale.baseText(`auth.changePassword.${mfaMethod ?? 'passkey'}.description` as never)
					}}
				</N8nText>
			</div>

			<N8nInfoTip v-if="mfaMethod === 'security_key'" theme="info" :class="$style.infoTip">
				{{ locale.baseText('mfa.login.security_key.info') }}
			</N8nInfoTip>

			<N8nText v-if="webauthnError" color="danger" size="small" :class="$style.errorText">
				{{ webauthnError }}
			</N8nText>

			<N8nButton
				:label="locale.baseText(`auth.changePassword.${mfaMethod ?? 'passkey'}.button` as never)"
				size="large"
				:loading="webauthnVerifying || loading"
				:disabled="!webauthnPassword || !webauthnPasswordConfirm"
				:class="$style.fullWidthButton"
				data-test-id="change-password-webauthn-button"
				@click="onWebauthnVerify"
			/>
		</N8nCard>
	</div>

	<!-- TOTP flow (or no MFA) — existing form-based view -->
	<AuthView
		v-else-if="config"
		:form="config"
		:form-loading="loading"
		@submit="onSubmit"
		@update="onInput"
	/>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);

	> * {
		width: 352px;
	}
}

.headerContainer {
	text-align: center;
	margin-bottom: var(--spacing--xl);
}

.passwordsBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--md);
}

.fieldLabel {
	font-size: var(--font-size--xs);
	color: var(--color--text);
}

.input {
	width: 100%;
	background: var(--color--background);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	outline: none;
	margin-bottom: var(--spacing--3xs);

	&:focus {
		border-color: var(--color--primary);
	}
}

.webauthnPrompt {
	text-align: center;
	padding: var(--spacing--3xs) 0 var(--spacing--md);
}

.bigIcon {
	width: calc(var(--spacing--3xl) + var(--spacing--2xs));
	height: calc(var(--spacing--3xl) + var(--spacing--2xs));
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto var(--spacing--sm);
	font-size: var(--font-size--2xl);
	position: relative;
}

.pulse::before {
	content: '';
	position: absolute;
	inset: calc(-1 * var(--spacing--3xs));
	border-radius: 50%;
	border: var(--spacing--5xs) solid currentColor;
	opacity: 0.4;
	animation: changePasswordPulse 1.6s ease-in-out infinite;
}

@keyframes changePasswordPulse {
	0%,
	100% {
		transform: scale(1);
		opacity: 0.4;
	}
	50% {
		transform: scale(1.15);
		opacity: 0.1;
	}
}

.tone_passkey {
	background: var(--background--info);
	color: var(--color--blue-500);
}

.tone_security_key {
	background: var(--color--orange-alpha-100);
	color: var(--color--orange-500);
}

.promptTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
}

.promptDescription {
	display: block;
	line-height: 1.55;
}

.infoTip {
	margin-bottom: var(--spacing--xs);
}

.errorText {
	display: block;
	margin-bottom: var(--spacing--xs);
}

.fullWidthButton {
	width: 100%;
}
</style>
