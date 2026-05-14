<script setup lang="ts">
import type { IFormInputs, InputAutocompletePropType } from '@/Interface';
import type { MfaMethod } from '@n8n/api-types';
import {
	N8nButton,
	N8nCard,
	N8nFormInputs,
	N8nHeading,
	N8nIcon,
	N8nLogo,
	N8nNotice,
	N8nText,
} from '@n8n/design-system';
import {
	MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_FORM,
} from '@/app/constants';
import { mfaEventBus } from '../auth.eventBus';
import { LAST_2FA_METHOD_KEY } from '../auth.constants';
import { isWebauthnUserCancellation } from '../utils/webauthn-error';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { toRefs } from '@vueuse/core';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

const props = defineProps<{
	reportError: boolean;
	email: string;
	availableMethods: MfaMethod[];
}>();

const readLastMethod = (): MfaMethod | null => {
	try {
		const v = localStorage.getItem(LAST_2FA_METHOD_KEY);
		if (v === 'totp' || v === 'security_key' || v === 'passkey') return v;
	} catch {
		// localStorage unavailable
	}
	return null;
};

// Pick the method the user used last on this device, falling back to a
// security key when registered (passkey/security_key share the same WebAuthn
// ceremony) and finally to TOTP.
const computeInitialMethod = (): MfaMethod => {
	const last = readLastMethod();
	if (last && props.availableMethods.includes(last)) return last;
	if (props.availableMethods.includes('security_key')) return 'security_key';
	if (props.availableMethods.includes('passkey')) return 'passkey';
	return 'totp';
};

const webauthnMethod = computed<'passkey' | 'security_key'>(() =>
	props.availableMethods.includes('security_key') ? 'security_key' : 'passkey',
);
const currentMethod = ref<MfaMethod>(computeInitialMethod());
const showSwitcher = computed(() => {
	const hasTotp = props.availableMethods.includes('totp');
	const hasWebauthn =
		props.availableMethods.includes('security_key') || props.availableMethods.includes('passkey');
	return hasTotp && hasWebauthn;
});
const switcherTarget = computed<MfaMethod>(() =>
	currentMethod.value === 'totp' ? webauthnMethod.value : 'totp',
);
const switcherLabelKey = computed<BaseTextKey>(() => {
	if (switcherTarget.value === 'totp') return 'mfa.login.switcher.useTotp';
	if (switcherTarget.value === 'passkey') return 'mfa.login.switcher.usePasskey';
	return 'mfa.login.switcher.useSecurityKey';
});
const switcherIcon = computed(() => (switcherTarget.value === 'totp' ? 'shield' : 'key-round'));
const onSwitcherClick = () => {
	currentMethod.value = switcherTarget.value;
};

const webauthnCopyKeys = computed(() => {
	const m = currentMethod.value;
	if (m === 'passkey') {
		return {
			title: 'mfa.login.passkey.title',
			waitingTitle: 'mfa.login.passkey.waiting.title',
			description: 'mfa.login.passkey.description',
			waitingDescription: 'mfa.login.passkey.waiting.description',
			button: 'mfa.login.passkey.button',
		} satisfies Record<string, BaseTextKey>;
	}
	return {
		title: 'mfa.login.security_key.title',
		waitingTitle: 'mfa.login.security_key.waiting.title',
		description: 'mfa.login.security_key.description',
		waitingDescription: 'mfa.login.security_key.waiting.description',
		button: 'mfa.login.security_key.button',
	} satisfies Record<string, BaseTextKey>;
});

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
	} catch (e) {
		webauthnError.value = isWebauthnUserCancellation(e)
			? i18.baseText('mfa.login.webauthn.error.cancelled')
			: i18.baseText('mfa.webauthn.error');
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
	if (currentMethod.value === 'totp') {
		formInputs.value = [mfaCodeFieldWithDefaults()];
		focusMfaCodeAfterPasswordManager();
	}
});

// When the user toggles between methods via the switcher, swap form inputs so
// the new method's primary input is auto-focused.
watch(currentMethod, (next) => {
	if (next === 'totp') {
		formInputs.value = [mfaCodeFieldWithDefaults()];
		focusMfaCodeAfterPasswordManager();
	} else {
		formInputs.value = null;
	}
});
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<N8nCard>
			<div :class="$style.headerContainer">
				<N8nHeading size="xlarge" color="text-dark">
					<template v-if="currentMethod === 'totp'">{{
						showRecoveryCodeForm
							? i18.baseText('mfa.recovery.modal.title')
							: i18.baseText('mfa.code.modal.title')
					}}</template>
					<template v-else>{{ i18.baseText('mfa.code.modal.title') }}</template>
				</N8nHeading>
			</div>

			<!-- TOTP flow -->
			<div v-if="currentMethod === 'totp'" data-test-id="mfa-totp-screen">
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
				<div
					v-if="showSwitcher && !showRecoveryCodeForm"
					:class="$style.switcher"
					data-test-id="mfa-switcher"
				>
					<button type="button" :class="$style.switcherLink" @click="onSwitcherClick">
						<N8nIcon :icon="switcherIcon" size="xsmall" />
						{{ i18.baseText(switcherLabelKey) }}
					</button>
				</div>
			</div>

			<!-- WebAuthn flow (passkey or security key) -->
			<div v-else data-test-id="mfa-webauthn-screen">
				<div :class="$style.webauthnPrompt" data-test-id="mfa-webauthn-prompt">
					<div
						:class="[
							$style.bigIcon,
							$style[`tone_${currentMethod}`],
							{ [$style.pulse]: webauthnWaiting },
						]"
					>
						<N8nIcon :icon="currentMethod === 'passkey' ? 'fingerprint' : 'key-round'" :size="36" />
					</div>
					<N8nHeading tag="h3" size="medium" color="text-dark" :class="$style.promptTitle">
						<template v-if="!webauthnWaiting">{{ i18.baseText(webauthnCopyKeys.title) }}</template>
						<template v-else>{{ i18.baseText(webauthnCopyKeys.waitingTitle) }}</template>
					</N8nHeading>
					<N8nText size="small" color="text-base" :class="$style.promptDescription">
						<template v-if="!webauthnWaiting">{{
							i18.baseText(webauthnCopyKeys.description)
						}}</template>
						<template v-else>{{ i18.baseText(webauthnCopyKeys.waitingDescription) }}</template>
					</N8nText>
				</div>
				<N8nNotice
					v-if="currentMethod === 'security_key' && !webauthnWaiting"
					theme="info"
					:content="i18.baseText('mfa.login.security_key.info')"
					:class="$style.infoNotice"
				/>
				<N8nText v-if="webauthnError" color="danger" size="small" :class="$style.errorText">
					{{ webauthnError }}
				</N8nText>
				<N8nButton
					v-if="!webauthnWaiting"
					:label="i18.baseText(webauthnCopyKeys.button)"
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
				<div
					v-if="showSwitcher && !webauthnWaiting"
					:class="$style.switcher"
					data-test-id="mfa-switcher"
				>
					<button type="button" :class="$style.switcherLink" @click="onSwitcherClick">
						<N8nIcon :icon="switcherIcon" size="xsmall" />
						{{ i18.baseText(switcherLabelKey) }}
					</button>
				</div>
			</div>
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
	background: var(--background--info);
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

.infoNotice {
	margin-bottom: var(--spacing--3xs);
	&:last-child {
		margin-bottom: var(--spacing--xs);
	}
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

.switcher {
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	text-align: center;
}

.switcherLink {
	color: var(--color--primary);
	font-size: var(--font-size--xs);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.switcherLink:hover {
	text-decoration: underline;
}
</style>
