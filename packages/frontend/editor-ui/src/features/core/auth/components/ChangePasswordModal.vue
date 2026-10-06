<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { CollapsibleRoot } from 'reka-ui';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { CHANGE_PASSWORD_MODAL_KEY } from '../auth.constants';

import {
	N8nAnimatedCollapsibleContent,
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nText,
	N8nVisuallyHidden,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });

type Step = 'newPassword' | 'verify';
type Rejection = 'wrongPassword' | 'wrongMfaCode' | 'tooManyAttempts';

const PASSWORD_MAX_LENGTH = 64;
const MFA_CODE_PATTERN = new RegExp(`^\\d{${MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH}}$`);
// The server sends other 400s too, but after the checks here only this one means the user can fix it.
const WRONG_PASSWORD_MESSAGE = 'Provided current password is incorrect.';

const i18n = useI18n();
const { showMessage, showError } = useToast();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const minLength = settingsStore.userManagement.passwordMinLength ?? 8;
const isMfaEnabled = usersStore.currentUser?.mfaEnabled ?? false;

const step = ref<Step>('newPassword');
const newPassword = ref('');
const confirmPassword = ref('');
const currentPassword = ref('');
const mfaCode = ref('');
const isConfirmRevealed = ref(false);
const isConfirmTouched = ref(false);
const isMfaCodeTouched = ref(false);
const rejection = ref<Rejection>();
const isSubmitting = ref(false);

const newPasswordInput = ref<InstanceType<typeof N8nInput> | null>(null);
const confirmPasswordInput = ref<InstanceType<typeof N8nInput> | null>(null);
const currentPasswordInput = ref<InstanceType<typeof N8nInput> | null>(null);
const mfaCodeInput = ref<InstanceType<typeof N8nInput> | null>(null);

const requirements = computed(() => [
	{
		key: 'length',
		label: i18n.baseText('auth.changePassword.requirements.length', {
			interpolate: { minimum: minLength },
		}),
		met: newPassword.value.length >= minLength,
	},
	{
		key: 'number',
		label: i18n.baseText('auth.changePassword.requirements.number'),
		met: /\d/.test(newPassword.value),
	},
	{
		key: 'uppercase',
		label: i18n.baseText('auth.changePassword.requirements.uppercase'),
		met: /[A-Z]/.test(newPassword.value),
	},
]);

const isTooLong = computed(() => newPassword.value.length > PASSWORD_MAX_LENGTH);
const isNewPasswordValid = computed(
	() => requirements.value.every((requirement) => requirement.met) && !isTooLong.value,
);
const passwordsMatch = computed(
	() => confirmPassword.value !== '' && confirmPassword.value === newPassword.value,
);
// While the confirmation is still the start of the new password, the user may not have finished it.
const showMismatch = computed(
	() =>
		confirmPassword.value !== '' &&
		!passwordsMatch.value &&
		(isConfirmTouched.value || !newPassword.value.startsWith(confirmPassword.value)),
);
const canContinue = computed(() => isNewPasswordValid.value && passwordsMatch.value);

const isMfaCodeComplete = computed(() => MFA_CODE_PATTERN.test(mfaCode.value));
const canChangePassword = computed(
	() =>
		currentPassword.value !== '' && (!isMfaEnabled || isMfaCodeComplete.value) && !rejection.value,
);

const rejectionMessages = computed<Record<Rejection, string>>(() => ({
	wrongPassword: i18n.baseText('auth.password.wrong'),
	wrongMfaCode: i18n.baseText('mfa.prompt.error.wrongCode'),
	tooManyAttempts: i18n.baseText('mfa.prompt.error.tooManyAttempts'),
}));

// Too many attempts isn't about one field, so it shows under the last one.
const currentPasswordError = computed(() => {
	if (rejection.value === 'wrongPassword') return rejectionMessages.value.wrongPassword;
	if (rejection.value === 'tooManyAttempts' && !isMfaEnabled) {
		return rejectionMessages.value.tooManyAttempts;
	}
	return undefined;
});

const mfaCodeError = computed(() => {
	if (rejection.value === 'wrongMfaCode' || rejection.value === 'tooManyAttempts') {
		return rejectionMessages.value[rejection.value];
	}
	if (isMfaCodeTouched.value && mfaCode.value && !isMfaCodeComplete.value) {
		return i18n.baseText('mfa.prompt.error.format.code');
	}
	return undefined;
});

const copy = computed(() =>
	step.value === 'newPassword'
		? {
				title: i18n.baseText('auth.changePassword'),
				description: i18n.baseText('auth.changePassword.description'),
			}
		: {
				title: i18n.baseText('auth.changePassword.verify.title'),
				description: isMfaEnabled
					? i18n.baseText('auth.changePassword.verify.descriptionWithMfa')
					: i18n.baseText('auth.changePassword.verify.description'),
			},
);

// The confirmation field stays once it appears, so the dialog doesn't jump while the user edits.
watch(isNewPasswordValid, (isValid) => {
	if (isValid) isConfirmRevealed.value = true;
});

// A rejected value stays rejected until the user changes it.
watch(currentPassword, () => {
	if (rejection.value === 'wrongPassword' || rejection.value === 'tooManyAttempts') {
		rejection.value = undefined;
	}
});

watch(mfaCode, () => {
	if (rejection.value === 'wrongMfaCode' || rejection.value === 'tooManyAttempts') {
		rejection.value = undefined;
		isMfaCodeTouched.value = false;
	}
});

const close = () => {
	uiStore.closeModal(CHANGE_PASSWORD_MODAL_KEY);
};

const onOpenChange = (open: boolean) => {
	if (!open) close();
};

const onOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	newPasswordInput.value?.focus();
};

const onNewPasswordEnter = async (event: KeyboardEvent) => {
	if (canContinue.value || !isConfirmRevealed.value) return;
	event.preventDefault();
	await nextTick();
	confirmPasswordInput.value?.focus();
};

const onCurrentPasswordEnter = (event: KeyboardEvent) => {
	if (!isMfaEnabled || isMfaCodeComplete.value) return;
	event.preventDefault();
	mfaCodeInput.value?.focus();
};

const goToVerify = async () => {
	isConfirmTouched.value = true;
	if (!canContinue.value) return;

	step.value = 'verify';
	await nextTick();
	currentPasswordInput.value?.focus();
};

const goBack = async () => {
	step.value = 'newPassword';
	await nextTick();
	newPasswordInput.value?.focus();
};

// Both a wrong 2FA code and a locked account answer 403, so a 403 is only the code when 2FA is on.
function toRejection(e: unknown): Rejection | undefined {
	if (!(e instanceof ResponseError)) return undefined;
	if (e.httpStatusCode === 429) return 'tooManyAttempts';
	if (e.httpStatusCode === 403 && isMfaEnabled) return 'wrongMfaCode';
	if (e.httpStatusCode === 400 && e.message === WRONG_PASSWORD_MESSAGE) return 'wrongPassword';
	return undefined;
}

const focusRejectedField = () => {
	const input =
		rejection.value === 'wrongPassword' || !isMfaEnabled
			? currentPasswordInput.value
			: mfaCodeInput.value;
	input?.focus();
	input?.select();
};

const changePassword = async () => {
	isMfaCodeTouched.value = true;
	if (!canChangePassword.value || isSubmitting.value) return;

	isSubmitting.value = true;
	try {
		await usersStore.updateCurrentUserPassword({
			currentPassword: currentPassword.value,
			newPassword: newPassword.value,
			mfaCode: isMfaEnabled ? mfaCode.value : undefined,
		});
	} catch (e) {
		rejection.value = toRejection(e);
		if (rejection.value) {
			focusRejectedField();
		} else {
			// The dialog stays open so the user can try again without typing the new password twice more.
			showError(e, i18n.baseText('auth.changePassword.error'));
		}
		return;
	} finally {
		isSubmitting.value = false;
	}

	close();
	showMessage({ type: 'success', title: i18n.baseText('auth.changePassword.success') });
};

const onSubmit = async () => {
	if (step.value === 'newPassword') {
		await goToVerify();
	} else {
		await changePassword();
	}
};
</script>

<template>
	<N8nDialog
		:open="true"
		:header="copy.title"
		:description="copy.description"
		size="medium"
		@update:open="onOpenChange"
		@open-auto-focus="onOpenAutoFocus"
	>
		<form novalidate data-test-id="change-password-modal" @submit.prevent="onSubmit">
			<!-- Lets password managers match the change to the saved sign-in. -->
			<input
				type="email"
				name="username"
				autocomplete="username"
				:value="usersStore.currentUser?.email"
				hidden
				readonly
			/>

			<!-- Hidden rather than removed, so password managers still see the new password on submit. -->
			<div v-show="step === 'newPassword'" :class="$style.body">
				<div :class="[$style.field, { [$style.fieldInvalid]: isTooLong }]">
					<N8nInputLabel
						input-name="change-password-new"
						:label="i18n.baseText('auth.newPassword')"
					>
						<N8nInput
							id="change-password-new"
							ref="newPasswordInput"
							v-model="newPassword"
							type="password"
							name="new-password"
							autocomplete="new-password"
							size="medium"
							:aria-invalid="isTooLong"
							:aria-describedby="
								isTooLong
									? 'change-password-requirements change-password-too-long'
									: 'change-password-requirements'
							"
							data-test-id="change-password-new-input"
							@keydown.enter="onNewPasswordEnter"
						/>
					</N8nInputLabel>
					<ul id="change-password-requirements" :class="$style.checklist">
						<li
							v-for="requirement in requirements"
							:key="requirement.key"
							:class="[$style.check, { [$style.checkMet]: requirement.met }]"
							:data-test-id="`change-password-requirement-${requirement.key}`"
							:data-met="requirement.met"
						>
							<Transition
								:enter-active-class="$style.checkIconEnter"
								:leave-active-class="$style.checkIconLeave"
							>
								<span v-if="requirement.met" :class="$style.checkIcon" aria-hidden="true">
									<N8nIcon icon="circle-check" size="small" />
								</span>
							</Transition>
							<span :class="$style.checkLabel">{{ requirement.label }}</span>
							<N8nVisuallyHidden v-if="requirement.met">
								{{ i18n.baseText('auth.changePassword.requirements.met') }}
							</N8nVisuallyHidden>
						</li>
					</ul>
					<N8nText
						v-if="isTooLong"
						id="change-password-too-long"
						size="small"
						color="danger"
						role="alert"
					>
						{{
							i18n.baseText('auth.changePassword.error.tooLong', {
								interpolate: { maximum: PASSWORD_MAX_LENGTH },
							})
						}}
					</N8nText>
				</div>

				<CollapsibleRoot :open="isConfirmRevealed">
					<N8nAnimatedCollapsibleContent :class="$style.reveal" blur>
						<div :class="[$style.field, $style.confirm, { [$style.fieldInvalid]: showMismatch }]">
							<N8nInputLabel
								input-name="change-password-confirm"
								:label="i18n.baseText('auth.changePassword.confirmNewPassword')"
							>
								<N8nInput
									id="change-password-confirm"
									ref="confirmPasswordInput"
									v-model="confirmPassword"
									type="password"
									name="confirm-password"
									autocomplete="new-password"
									size="medium"
									:aria-invalid="showMismatch"
									aria-describedby="change-password-match"
									data-test-id="change-password-confirm-input"
									@blur="isConfirmTouched = true"
								/>
							</N8nInputLabel>
							<N8nText
								v-if="showMismatch"
								id="change-password-match"
								size="small"
								color="danger"
								role="alert"
								data-test-id="change-password-match"
							>
								{{ i18n.baseText('auth.changePassword.error.mismatch') }}
							</N8nText>
							<p
								v-else
								id="change-password-match"
								:class="[$style.check, { [$style.checkMet]: passwordsMatch }]"
								data-test-id="change-password-match"
							>
								<Transition
									:enter-active-class="$style.checkIconEnter"
									:leave-active-class="$style.checkIconLeave"
								>
									<span v-if="passwordsMatch" :class="$style.checkIcon" aria-hidden="true">
										<N8nIcon icon="circle-check" size="small" />
									</span>
								</Transition>
								{{
									passwordsMatch
										? i18n.baseText('auth.changePassword.passwordsMatch')
										: i18n.baseText('auth.changePassword.passwordsMustMatch')
								}}
							</p>
						</div>
					</N8nAnimatedCollapsibleContent>
				</CollapsibleRoot>
			</div>

			<div v-if="step === 'verify'" :class="$style.body">
				<div :class="[$style.field, { [$style.fieldInvalid]: currentPasswordError }]">
					<N8nInputLabel
						input-name="change-password-current"
						:label="i18n.baseText('auth.changePassword.currentPassword')"
					>
						<N8nInput
							id="change-password-current"
							ref="currentPasswordInput"
							v-model="currentPassword"
							type="password"
							name="current-password"
							autocomplete="current-password"
							size="medium"
							:aria-invalid="Boolean(currentPasswordError)"
							:aria-describedby="currentPasswordError ? 'change-password-current-error' : undefined"
							data-test-id="change-password-current-input"
							@keydown.enter="onCurrentPasswordEnter"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="currentPasswordError"
						id="change-password-current-error"
						size="small"
						color="danger"
						role="alert"
						data-test-id="change-password-current-error"
					>
						{{ currentPasswordError }}
					</N8nText>
				</div>

				<div v-if="isMfaEnabled" :class="[$style.field, { [$style.fieldInvalid]: mfaCodeError }]">
					<N8nInputLabel
						input-name="change-password-mfa-code"
						:label="i18n.baseText('auth.changePassword.mfaCode')"
					>
						<N8nInput
							id="change-password-mfa-code"
							ref="mfaCodeInput"
							v-model="mfaCode"
							name="mfa-code"
							inputmode="numeric"
							autocomplete="one-time-code"
							size="medium"
							:maxlength="MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH"
							:placeholder="i18n.baseText('auth.changePassword.mfaCode.placeholder')"
							:aria-invalid="Boolean(mfaCodeError)"
							:aria-describedby="mfaCodeError ? 'change-password-mfa-code-error' : undefined"
							data-test-id="change-password-mfa-code-input"
							@blur="isMfaCodeTouched = true"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="mfaCodeError"
						id="change-password-mfa-code-error"
						size="small"
						color="danger"
						role="alert"
						data-test-id="change-password-mfa-code-error"
					>
						{{ mfaCodeError }}
					</N8nText>
				</div>
			</div>

			<N8nDialogFooter>
				<template v-if="step === 'newPassword'">
					<N8nButton variant="outline" data-test-id="change-password-cancel-button" @click="close">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:disabled="!canContinue"
						data-test-id="change-password-continue-button"
					>
						{{ i18n.baseText('auth.changePassword.continue') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nButton variant="outline" data-test-id="change-password-back-button" @click="goBack">
						{{ i18n.baseText('generic.back') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:disabled="!canChangePassword"
						:loading="isSubmitting"
						data-test-id="change-password-button"
					>
						{{ i18n.baseText('auth.changePassword') }}
					</N8nButton>
				</template>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.body {
	display: flex;
	flex-direction: column;
	padding-top: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);

	& + & {
		margin-top: var(--spacing--sm);
	}
}

/* The input declares its own border variable, so set it on the input element itself. */
.fieldInvalid :global(.n8n-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}

/* The reveal clips its content, so give the input's focus ring room on both sides. */
.reveal {
	margin: 0 calc(-1 * var(--spacing--3xs));
	padding: 0 var(--spacing--3xs);
}

.confirm {
	padding-top: var(--spacing--sm);
}

.checklist {
	display: flex;
	flex-wrap: wrap;
	column-gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.check {
	display: inline-flex;
	align-items: center;
	margin: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	transition: color var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

/* The success token is too light for 12px text on a light surface. */
.checkMet {
	color: light-dark(var(--color--green-700), var(--color--green-500));
}

.checklist .check:not(:last-child) .checkLabel::after {
	content: ',';
}

/* The check only appears once a requirement is met. Its slot includes the gap to the label, so the
   label slides over as the slot opens instead of jumping. */
.checkIcon {
	--check-icon--size: 12px; // N8nIcon size="small"

	display: inline-flex;
	flex-shrink: 0;
	width: calc(var(--check-icon--size) + var(--spacing--4xs));
	overflow: hidden;

	> * {
		flex-shrink: 0;
		transform-origin: left center;
	}
}

.checkIconEnter {
	animation: checkSlotOpen var(--duration--snappy) var(--easing--ease-out);

	> * {
		animation: checkPopIn var(--duration--snappy) var(--easing--ease-out);
	}

	&,
	> * {
		@include motion.reduced-motion;
	}
}

.checkIconLeave {
	animation: checkSlotClose var(--duration--snappy) var(--easing--ease-out) forwards;

	> * {
		animation: checkPopOut var(--duration--snappy) var(--easing--ease-out) forwards;
	}

	&,
	> * {
		@include motion.reduced-motion;
	}
}

@keyframes checkSlotOpen {
	from {
		width: 0;
	}
}

@keyframes checkSlotClose {
	to {
		width: 0;
	}
}

@keyframes checkPopIn {
	from {
		opacity: 0;
		transform: scale(0.25);
		filter: blur(4px);
	}
}

@keyframes checkPopOut {
	to {
		opacity: 0;
		transform: scale(0.25);
		filter: blur(4px);
	}
}
</style>
