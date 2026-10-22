<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { validate as validateUuid } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { PROMPT_MFA_CODE_MODAL_KEY, type PromptMfaCodeModalData } from '../auth.constants';
import { promptMfaCodeBus, type MfaModalClosedEventPayload } from '../auth.eventBus';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data?: PromptMfaCodeModalData;
}>();

type Rejection = 'wrongMfaCode' | 'wrongRecoveryCode' | 'tooManyAttempts';

const MFA_CODE_PATTERN = /^\d{6}$/;

const i18n = useI18n();
const uiStore = useUIStore();
const { showError } = useToast();

const code = ref('');
const codeInput = ref<InstanceType<typeof N8nInput> | null>(null);
const isSubmitting = ref(false);
const showFormatError = ref(false);
const rejection = ref<Rejection>();

const isChangingEmail = computed(() => props.data?.purpose === 'changeEmail');
const trimmedCode = computed(() => code.value.trim());

/** The code to send, once it has the shape of a 2FA code or (when allowed) a recovery code. */
const credentials = computed<MfaModalClosedEventPayload | undefined>(() => {
	const value = trimmedCode.value;
	if (MFA_CODE_PATTERN.test(value)) return { mfaCode: value };
	if (!isChangingEmail.value && validateUuid(value)) return { mfaRecoveryCode: value };
	return undefined;
});

const copy = computed(() =>
	isChangingEmail.value
		? {
				title: i18n.baseText('mfa.prompt.changeEmail.title'),
				description: i18n.baseText('mfa.prompt.changeEmail.description'),
				label: i18n.baseText('mfa.prompt.changeEmail.input.label'),
				placeholder: i18n.baseText('mfa.prompt.changeEmail.input.placeholder'),
				formatError: i18n.baseText('mfa.prompt.error.format.code'),
				confirm: i18n.baseText('mfa.prompt.changeEmail.button'),
				failure: i18n.baseText('settings.personal.personalSettingsUpdatedError'),
			}
		: {
				title: i18n.baseText('mfa.prompt.disable.title'),
				description: i18n.baseText('mfa.prompt.disable.description'),
				label: i18n.baseText('mfa.prompt.disable.input.label'),
				placeholder: i18n.baseText('mfa.prompt.disable.input.placeholder'),
				formatError: i18n.baseText('mfa.prompt.error.format.codeOrRecoveryCode'),
				confirm: i18n.baseText('mfa.prompt.disable.button'),
				failure: i18n.baseText('settings.personal.mfa.toast.disabledMfa.error.message'),
			},
);

const rejectionMessages = computed<Record<Rejection, string>>(() => ({
	wrongMfaCode: i18n.baseText('mfa.prompt.error.wrongCode'),
	wrongRecoveryCode: i18n.baseText('mfa.prompt.error.wrongRecoveryCode'),
	tooManyAttempts: i18n.baseText('mfa.prompt.error.tooManyAttempts'),
}));

// A format error waits until the user leaves the field or tries to confirm, so it doesn't interrupt typing.
const error = computed(() => {
	if (rejection.value) return rejectionMessages.value[rejection.value];
	if (showFormatError.value && trimmedCode.value && !credentials.value) {
		return copy.value.formatError;
	}
	return undefined;
});

// A rejected code stays rejected until the user changes it. The next code starts fresh, so its
// format isn't checked until the user leaves the field or confirms again.
watch(code, () => {
	if (!rejection.value) return;
	rejection.value = undefined;
	showFormatError.value = false;
});

// A request that's already on its way can't be taken back, so the dialog stays until it's answered.
const close = (payload?: MfaModalClosedEventPayload) => {
	if (isSubmitting.value) return;
	uiStore.closeModal(PROMPT_MFA_CODE_MODAL_KEY);
	promptMfaCodeBus.emit('closed', payload);
};

const onOpenChange = (open: boolean) => {
	if (!open) close();
};

// The code is the only thing to do here, so it gets the focus instead of the close button.
const onOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	codeInput.value?.focus();
};

// Both endpoints answer a code they don't accept with 403, and too many tries with 429.
function toRejection(e: unknown, sent: MfaModalClosedEventPayload): Rejection | undefined {
	if (!(e instanceof ResponseError)) return undefined;
	if (e.httpStatusCode === 429) return 'tooManyAttempts';
	if (e.httpStatusCode === 403) return sent.mfaRecoveryCode ? 'wrongRecoveryCode' : 'wrongMfaCode';
	return undefined;
}

const onConfirm = async () => {
	showFormatError.value = true;
	const sent = credentials.value;
	if (!sent || rejection.value || isSubmitting.value) return;

	isSubmitting.value = true;
	try {
		await props.data?.submit(sent);
	} catch (e) {
		rejection.value = toRejection(e, sent);
		if (rejection.value) {
			codeInput.value?.focus();
			codeInput.value?.select();
			return;
		}
		showError(e, copy.value.failure);
	} finally {
		isSubmitting.value = false;
	}
	close(sent);
};
</script>

<template>
	<N8nDialog
		:open="true"
		:header="copy.title"
		size="medium"
		@update:open="onOpenChange"
		@open-auto-focus="onOpenAutoFocus"
	>
		<N8nDialogBody>
			<N8nDialogDescription>{{ copy.description }}</N8nDialogDescription>
			<div :class="$style.body" data-test-id="prompt-mfa-code-modal">
				<N8nInputLabel input-name="mfa-prompt-code" :label="copy.label">
					<div :class="[$style.field, { [$style.fieldInvalid]: error }]">
						<N8nInput
							id="mfa-prompt-code"
							ref="codeInput"
							v-model="code"
							name="mfaCodeOrMfaRecoveryCode"
							size="medium"
							autocomplete="one-time-code"
							:maxlength="isChangingEmail ? MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH : undefined"
							:placeholder="copy.placeholder"
							:aria-invalid="Boolean(error)"
							:aria-describedby="error ? 'mfa-prompt-code-error' : undefined"
							data-test-id="mfa-code-or-recovery-code-input"
							@blur="showFormatError = true"
							@keydown.enter="onConfirm"
						/>
						<N8nText
							v-if="error"
							id="mfa-prompt-code-error"
							size="small"
							color="danger"
							role="alert"
							data-test-id="mfa-code-error"
						>
							{{ error }}
						</N8nText>
					</div>
				</N8nInputLabel>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="isSubmitting"
				data-test-id="mfa-code-cancel-button"
				@click="close()"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				:variant="isChangingEmail ? 'solid' : 'destructive'"
				:disabled="!credentials || Boolean(rejection)"
				:loading="isSubmitting"
				data-test-id="mfa-code-confirm-button"
				@click="onConfirm"
			>
				{{ copy.confirm }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	padding-top: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/* The input declares its own border variable, so set it on the input element itself. */
.fieldInvalid :global(.n8n-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}
</style>
