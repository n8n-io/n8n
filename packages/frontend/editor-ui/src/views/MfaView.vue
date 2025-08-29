<script setup lang="ts">
import type { IFormInputs, InputAutocompletePropType } from '@/Interface';
import Logo from '@/components/Logo/Logo.vue';
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
		<Logo location="authView" :release-channel="releaseChannel" />
		<n8n-card>
			<div :class="$style.headerContainer">
				<n8n-heading size="xlarge" color="text-dark">{{
					showRecoveryCodeForm
						? i18.baseText('mfa.recovery.modal.title')
						: i18.baseText('mfa.code.modal.title')
				}}</n8n-heading>
			</div>
			<div :class="[$style.formContainer, reportError ? $style.formError : '']">
				<n8n-form-inputs
					v-if="formInputs"
					data-test-id="mfa-login-form"
					:inputs="formInputs"
					:event-bus="formBus"
					ref="mfaFormRef"
					@input="onInput"
					@submit="onSubmit"
				/>
				<div :class="$style.infoBox">
					<n8n-text
						v-if="!showRecoveryCodeForm && !reportError"
						size="small"
						color="text-base"
						:bold="false"
						>{{ i18.baseText('mfa.code.input.info') }}
						<a data-test-id="mfa-enter-recovery-code-button" @click="onRecoveryCodeClick">{{
							i18.baseText('mfa.code.input.info.action')
						}}</a></n8n-text
					>
					<n8n-text v-if="reportError" color="danger" size="small"
						>{{ formError }}
						<a
							v-if="!showRecoveryCodeForm"
							:class="$style.recoveryCodeLink"
							@click="onRecoveryCodeClick"
						>
							{{ i18.baseText('mfa.recovery.input.info.action') }}</a
						>
					</n8n-text>
				</div>
			</div>
			<div>
				<n8n-button
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
				<n8n-button
					float="left"
					:label="i18.baseText('mfa.button.back')"
					size="large"
					type="tertiary"
					@click="onBackClick"
				/>
			</div>
		</n8n-card>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color-background-light);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing-2xl);

	> * {
		width: 352px;
	}
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}

.headerContainer {
	text-align: center;
	margin-bottom: var(--spacing-xl);
}

.formError input {
	border-color: var(--color-danger);
}

.recoveryCodeLink {
	text-decoration: underline;
}

.infoBox {
	padding-top: var(--spacing-4xs);
}
</style>
