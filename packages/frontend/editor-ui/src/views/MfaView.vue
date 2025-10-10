<script setup lang="ts">
import type { IFormInputs, InputAutocompletePropType } from '@/Interface';
import { N8nLogo } from '@n8n/design-system';
import {
	MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_FORM,
} from '@/constants';
import { mfaEventBus } from '@/event-bus';
import { onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { toRefs } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings.store';

import { N8nButton, N8nCard, N8nFormInputs, N8nHeading, N8nText } from '@n8n/design-system';
// ---------------------------------------------------------------------------
// #region Props
// ---------------------------------------------------------------------------

const props = defineProps<{
	reportError: boolean;
}>();

// #endregion

// ---------------------------------------------------------------------------
// #region Reactive properties
// ---------------------------------------------------------------------------

const hasAnyChanges = ref(false);
const formBus = ref(mfaEventBus);
const formInputs = ref<null | IFormInputs>(null);
const showRecoveryCodeForm = ref(false);
const verifyingMfaCode = ref(false);
const formError = ref('');
const { reportError } = toRefs(props);
const mfaFormRef = ref<{ $el?: HTMLElement } | null>(null);

// ---------------------------------------------------------------------------
// #region Composable
// ---------------------------------------------------------------------------

const i18 = useI18n();

// #endregion

// ---------------------------------------------------------------------------
// #region Emit
// ---------------------------------------------------------------------------

const emit = defineEmits<{
	onFormChanged: [formField: string];
	onBackClick: [formField: string];
	submit: [{ mfaCode: string; mfaRecoveryCode: string }];
}>();

// #endregion

// ---------------------------------------------------------------------------
// #region Methods
// ---------------------------------------------------------------------------

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

// #endregion

const {
	settings: { releaseChannel },
} = useSettingsStore();

// ---------------------------------------------------------------------------
// #region Lifecycle hooks
// ---------------------------------------------------------------------------

onMounted(() => {
	formInputs.value = [mfaCodeFieldWithDefaults()];

	focusMfaCodeAfterPasswordManager();
});

// #endregion
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<N8nCard>
			<div :class="$style.headerContainer">
				<N8nHeading size="xlarge" color="text-dark">{{
					showRecoveryCodeForm
						? i18.baseText('mfa.recovery.modal.title')
						: i18.baseText('mfa.code.modal.title')
				}}</N8nHeading>
			</div>
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
			<div>
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
				<N8nButton
					float="left"
					:label="i18.baseText('mfa.button.back')"
					size="large"
					type="tertiary"
					@click="onBackClick"
				/>
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
</style>
