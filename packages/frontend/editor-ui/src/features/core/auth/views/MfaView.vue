<script setup lang="ts">
import type { IFormInputs, InputAutocompletePropType } from '@/Interface';
import type { MfaMethod } from '@n8n/api-types';
import { N8nLogo } from '@n8n/design-system';
import {
	MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_FORM,
} from '@/app/constants';
import { mfaEventBus } from '../auth.eventBus';
import { onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { toRefs } from '@vueuse/core';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

import {
	N8nButton,
	N8nCard,
	N8nFormInputs,
	N8nHeading,
	N8nIcon,
	N8nInfoTip,
	N8nText,
} from '@n8n/design-system';

const props = defineProps<{
	reportError: boolean;
	email: string;
	mfaMethod: MfaMethod;
}>();

const hasAnyChanges = ref(false);
const formBus = ref(mfaEventBus);
const formInputs = ref<null | IFormInputs>(null);
const showRecoveryCodeForm = ref(false);
const verifyingMfaCode = ref(false);
const formError = ref('');
const { reportError } = toRefs(props);
const mfaFormRef = ref<{ $el?: HTMLElement } | null>(null);

const i18 = useI18n();

const emit = defineEmits<{
	onFormChanged: [formField: string];
	onBackClick: [formField: string];
	submit: [{ mfaCode: string; mfaRecoveryCode: string }];
	webauthnSubmit: [webauthnResponse: unknown];
}>();

const formField = (
	name: string,
	label: string,
	placeholder: string,
	maxlength: number,
	focus = true,
	autocomplete: InputAutocompletePropType = 'off',
) => {
	return {
		name,
		initialValue: '',
		properties: {
			label,
			placeholder,
			maxlength,
			capitalize: true,
			validateOnBlur: false,
			focusInitially: focus,
			autocomplete,
		},
	};
};

const onRecoveryCodeClick = () => {
	formError.value = '';
	showRecoveryCodeForm.value = true;
	hasAnyChanges.value = false;
	formInputs.value = [mfaRecoveryCodeFieldWithDefaults()];
	emit('onFormChanged', MFA_FORM.MFA_RECOVERY_CODE);
};

const onBackClick = () => {
	if (!showRecoveryCodeForm.value) {
		emit('onBackClick', MFA_FORM.MFA_TOKEN);
		return;
	}

	showRecoveryCodeForm.value = false;
	hasAnyChanges.value = true;
	formInputs.value = [mfaCodeFieldWithDefaults()];
	emit('onBackClick', MFA_FORM.MFA_RECOVERY_CODE);
	focusMfaCodeAfterPasswordManager();
};

const onSubmit = (formData: unknown) => {
	const data = formData as { mfaCode: string; mfaRecoveryCode: string };

	formError.value = !showRecoveryCodeForm.value
		? i18.baseText('mfa.code.invalid')
		: i18.baseText('mfa.recovery.invalid');
	emit('submit', data);
};

const focusMfaCodeAfterPasswordManager = () => {
	setTimeout(() => {
		if (mfaFormRef.value) {
			const container = mfaFormRef.value.$el;
			if (!container) return;
			const inputElement = container.querySelector('input[name="mfaCode"]') as HTMLInputElement;
			if (inputElement) {
				inputElement.focus();
			}
		}
	}, 200);
};

const onInput = ({ target: { value, name } }: { target: { value: string; name: string } }) => {
	const isSubmittingMfaCode = name === 'mfaCode';
	const inputValidLength = isSubmittingMfaCode
		? MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH
		: MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH;

	if (value.length !== inputValidLength) {
		hasAnyChanges.value = false;
		return;
	}

	verifyingMfaCode.value = true;
	hasAnyChanges.value = true;

	const dataToSubmit = isSubmittingMfaCode
		? { mfaCode: value, mfaRecoveryCode: '' }
		: { mfaCode: '', mfaRecoveryCode: value };

	try {
		onSubmit(dataToSubmit);
	} catch (e) {
	} finally {
		verifyingMfaCode.value = false;
	}
};

const mfaRecoveryCodeFieldWithDefaults = () => {
	return formField(
		'mfaRecoveryCode',
		i18.baseText('mfa.recovery.input.label'),
		i18.baseText('mfa.recovery.input.placeholder'),
		MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH,
	);
};

const mfaCodeFieldWithDefaults = () => {
	return formField(
		'mfaCode',
		i18.baseText('mfa.code.input.label'),
		i18.baseText('mfa.code.input.placeholder'),
		MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
		false,
		'one-time-code',
	);
};

const onSaveClick = () => {
	formBus.value.emit('submit');
};

const webauthnWaiting = ref(false);
const webauthnError = ref('');

const onWebAuthnClick = async () => {
	webauthnError.value = '';
	webauthnWaiting.value = true;
	try {
		const usersStore = useUsersStore();
		const response = await usersStore.verifyWebAuthnAuthentication(props.email);
		emit('webauthnSubmit', response);
	} catch {
		webauthnError.value = i18.baseText('mfa.webauthn.error');
	} finally {
		webauthnWaiting.value = false;
	}
};

const onWebAuthnCancel = () => {
	webauthnWaiting.value = false;
	emit('onBackClick', MFA_FORM.MFA_TOKEN);
};

const {
	settings: { releaseChannel },
} = useSettingsStore();

onMounted(() => {
	if (props.mfaMethod === 'totp') {
		formInputs.value = [mfaCodeFieldWithDefaults()];
		focusMfaCodeAfterPasswordManager();
	}
});
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<N8nCard>
			<div :class="$style.headerContainer">
				<N8nHeading size="xlarge" color="text-dark">
					<template v-if="mfaMethod === 'totp'">{{
						showRecoveryCodeForm
							? i18.baseText('mfa.recovery.modal.title')
							: i18.baseText('mfa.code.modal.title')
					}}</template>
					<template v-else>{{ i18.baseText('mfa.code.modal.title') }}</template>
				</N8nHeading>
			</div>

			<!-- TOTP flow -->
			<template v-if="mfaMethod === 'totp'">
				<div :class="[$style.formContainer, reportError ? $style.formError : '']">
					<N8nFormInputs
						v-if="formInputs"
						ref="mfaFormRef"
						data-test-id="mfa-login-form"
						:inputs="formInputs"
						:event-bus="formBus"
						@input="onInput"
						@submit="onSubmit"
					/>
					<div :class="$style.infoBox">
						<N8nText
							v-if="!showRecoveryCodeForm && !reportError"
							size="small"
							color="text-base"
							:bold="false"
							>{{ i18.baseText('mfa.code.input.info') }}
							<a data-test-id="mfa-enter-recovery-code-button" @click="onRecoveryCodeClick">{{
								i18.baseText('mfa.code.input.info.action')
							}}</a></N8nText
						>
						<N8nText v-if="reportError" color="danger" size="small"
							>{{ formError }}
							<a
								v-if="!showRecoveryCodeForm"
								:class="$style.recoveryCodeLink"
								@click="onRecoveryCodeClick"
							>
								{{ i18.baseText('mfa.recovery.input.info.action') }}</a
							>
						</N8nText>
					</div>
				</div>
				<div :class="$style.footer">
					<N8nButton
						variant="subtle"
						float="left"
						:label="i18.baseText('mfa.button.back')"
						size="large"
						@click="onBackClick"
					/>
					<N8nButton
						float="right"
						:loading="verifyingMfaCode"
						:label="
							showRecoveryCodeForm
								? i18.baseText('mfa.recovery.button.verify')
								: i18.baseText('mfa.code.button.continue')
						"
						size="large"
						:disabled="!hasAnyChanges"
						@click="onSaveClick"
					/>
				</div>
			</template>

			<!-- WebAuthn flow (passkey or security key) -->
			<template v-else>
				<div :class="$style.webauthnPrompt" data-test-id="mfa-webauthn-prompt">
					<div
						:class="[
							$style.bigIcon,
							$style[`tone_${mfaMethod}`],
							{ [$style.pulse]: webauthnWaiting },
						]"
					>
						<N8nIcon :icon="mfaMethod === 'passkey' ? 'fingerprint' : 'key-round'" :size="36" />
					</div>
					<N8nHeading tag="h3" size="medium" color="text-dark" :class="$style.promptTitle">
						<template v-if="!webauthnWaiting">{{
							i18.baseText(`mfa.login.${mfaMethod}.title` as never)
						}}</template>
						<template v-else>{{
							i18.baseText(`mfa.login.${mfaMethod}.waiting.title` as never)
						}}</template>
					</N8nHeading>
					<N8nText size="small" color="text-base" :class="$style.promptDescription">
						<template v-if="!webauthnWaiting">{{
							i18.baseText(`mfa.login.${mfaMethod}.description` as never)
						}}</template>
						<template v-else>{{
							i18.baseText(`mfa.login.${mfaMethod}.waiting.description` as never)
						}}</template>
					</N8nText>
				</div>
				<N8nInfoTip
					v-if="mfaMethod === 'security_key' && !webauthnWaiting"
					theme="info"
					:class="$style.infoTip"
				>
					{{ i18.baseText('mfa.login.security_key.info') }}
				</N8nInfoTip>
				<N8nText v-if="webauthnError" color="danger" size="small" :class="$style.errorText">
					{{ webauthnError }}
				</N8nText>
				<N8nButton
					v-if="!webauthnWaiting"
					:label="i18.baseText(`mfa.login.${mfaMethod}.button` as never)"
					size="large"
					:class="$style.fullWidthButton"
					data-test-id="mfa-webauthn-button"
					@click="onWebAuthnClick"
				/>
				<div :class="$style.webauthnFooter">
					<N8nButton
						variant="subtle"
						:label="
							webauthnWaiting ? i18.baseText('mfa.login.cancel') : i18.baseText('mfa.button.back')
						"
						size="large"
						@click="onWebAuthnCancel"
					/>
				</div>
			</template>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color--background--light-2);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);

	> * {
		width: 352px;
	}
}

.formContainer {
	padding-bottom: var(--spacing--xl);
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.headerContainer {
	text-align: center;
	margin-bottom: var(--spacing--xl);
}

.formError input {
	border-color: var(--color--danger);
}

.recoveryCodeLink {
	text-decoration: underline;
}

.infoBox {
	padding-top: var(--spacing--4xs);
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

.tone_passkey {
	background: var(--color--blue-alpha-100);
	color: var(--color--blue-500);
}

.tone_security_key {
	background: var(--color--orange-alpha-100);
	color: var(--color--orange-500);
}

.pulse::before {
	content: '';
	position: absolute;
	inset: calc(-1 * var(--spacing--3xs));
	border-radius: 50%;
	border: var(--spacing--5xs) solid currentColor;
	opacity: 0.4;
	animation: mfaPulse 1.6s ease-in-out infinite;
}

@keyframes mfaPulse {
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
	margin-bottom: var(--spacing--3xs);
}

.webauthnFooter {
	display: flex;
	justify-content: flex-start;
	margin-top: var(--spacing--3xs);
}
</style>
