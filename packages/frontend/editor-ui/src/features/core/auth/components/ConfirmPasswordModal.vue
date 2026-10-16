<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { CONFIRM_PASSWORD_MODAL_KEY, type ConfirmPasswordModalData } from '../auth.constants';
import { confirmPasswordEventBus, type ConfirmPasswordClosedEventPayload } from '../auth.eventBus';

import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data?: ConfirmPasswordModalData;
}>();

type Rejection = 'wrongPassword' | 'tooManyAttempts';

// The server sends other 400s too (for example, an email that's already in use), so only this
// message means the password itself was wrong.
const WRONG_PASSWORD_MESSAGE =
	'Unable to update profile. Please check your credentials and try again.';

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const { showError } = useToast();

const password = ref('');
const passwordInput = ref<InstanceType<typeof N8nInput> | null>(null);
const isSubmitting = ref(false);
const rejection = ref<Rejection>();

const canConfirm = computed(() => password.value.length > 0 && !rejection.value);

const rejectionMessages = computed<Record<Rejection, string>>(() => ({
	wrongPassword: i18n.baseText('auth.password.wrong'),
	tooManyAttempts: i18n.baseText('mfa.prompt.error.tooManyAttempts'),
}));

const error = computed(() => rejection.value && rejectionMessages.value[rejection.value]);

// A rejected password stays rejected until the user changes it.
watch(password, () => {
	rejection.value = undefined;
});

// A request that's already on its way can't be taken back, so the dialog stays until it's answered.
const close = (payload?: ConfirmPasswordClosedEventPayload) => {
	if (isSubmitting.value) return;
	uiStore.closeModal(CONFIRM_PASSWORD_MODAL_KEY);
	confirmPasswordEventBus.emit('closed', payload);
};

const onOpenChange = (open: boolean) => {
	if (!open) close();
};

// The password is the only thing to do here, so it gets the focus instead of the close button.
const onOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	passwordInput.value?.focus();
};

function toRejection(e: unknown): Rejection | undefined {
	if (!(e instanceof ResponseError)) return undefined;
	if (e.httpStatusCode === 429) return 'tooManyAttempts';
	if (e.httpStatusCode === 400 && e.message === WRONG_PASSWORD_MESSAGE) return 'wrongPassword';
	return undefined;
}

const onSubmit = async () => {
	if (!canConfirm.value || isSubmitting.value) return;

	const sent = { currentPassword: password.value };
	isSubmitting.value = true;
	try {
		await props.data?.submit(sent);
	} catch (e) {
		rejection.value = toRejection(e);
		if (rejection.value) {
			passwordInput.value?.focus();
			passwordInput.value?.select();
			return;
		}
		showError(e, i18n.baseText('settings.personal.personalSettingsUpdatedError'));
	} finally {
		isSubmitting.value = false;
	}
	close(sent);
};
</script>

<template>
	<N8nDialog
		:open="true"
		:header="i18n.baseText('auth.confirmPassword.changeEmail.title')"
		:description="i18n.baseText('auth.confirmPassword.changeEmail.description')"
		size="medium"
		@update:open="onOpenChange"
		@open-auto-focus="onOpenAutoFocus"
	>
		<form novalidate data-test-id="confirm-password-modal" @submit.prevent="onSubmit">
			<!-- Tells password managers which account the password belongs to. -->
			<input
				type="email"
				name="username"
				autocomplete="username"
				:value="usersStore.currentUser?.email"
				hidden
				readonly
			/>

			<div :class="[$style.field, { [$style.fieldInvalid]: error }]">
				<N8nInputLabel
					input-name="confirm-password"
					:label="i18n.baseText('auth.confirmPassword.changeEmail.input.label')"
				>
					<N8nInput
						id="confirm-password"
						ref="passwordInput"
						v-model="password"
						type="password"
						name="current-password"
						autocomplete="current-password"
						size="medium"
						:aria-invalid="Boolean(error)"
						:aria-describedby="error ? 'confirm-password-error' : undefined"
						data-test-id="confirm-password-input"
					/>
				</N8nInputLabel>
				<N8nText
					v-if="error"
					id="confirm-password-error"
					size="small"
					color="danger"
					role="alert"
					data-test-id="confirm-password-error"
				>
					{{ error }}
				</N8nText>
			</div>

			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="confirm-password-cancel-button"
					@click="close()"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					:disabled="!canConfirm"
					:loading="isSubmitting"
					data-test-id="confirm-password-button"
				>
					{{ i18n.baseText('auth.confirmPassword.changeEmail.button') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-top: var(--spacing--sm);
}

/* The input declares its own border variable, so set it on the input element itself. */
.fieldInvalid :global(.n8n-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}
</style>
