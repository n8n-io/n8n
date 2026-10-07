<script setup lang="ts">
import { computed, ref } from 'vue';
import { PROMPT_MFA_CODE_MODAL_KEY } from '../auth.constants';
import { useI18n } from '@n8n/i18n';
import { promptMfaCodeBus, type MfaModalClosedEventPayload } from '../auth.eventBus';
import { type IFormInput } from '@/Interface';
import { validate as validateUuid } from 'uuid';
import { useUIStore } from '@/app/stores/ui.store';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInputs,
	createFormEventBus,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });
const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[PROMPT_MFA_CODE_MODAL_KEY]?.open === true);

const formBus = createFormEventBus();
const readyToSubmit = ref(false);

function closeDialog(returnData?: MfaModalClosedEventPayload) {
	if (modalOpen.value !== true) return;
	uiStore.closeModal(PROMPT_MFA_CODE_MODAL_KEY);
	promptMfaCodeBus.emit('closed', returnData);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const formFields: IFormInput[] = [
	{
		name: 'mfaCodeOrMfaRecoveryCode',
		initialValue: '',
		properties: {
			label: i18n.baseText('mfa.code.recovery.input.label'),
			placeholder: i18n.baseText('mfa.code.recovery.input.placeholder'),
			focusInitially: true,
			capitalize: true,
			required: true,
		},
	},
] as const;

function onSubmit(values: object) {
	if (
		!('mfaCodeOrMfaRecoveryCode' in values && typeof values.mfaCodeOrMfaRecoveryCode === 'string')
	) {
		return;
	}
	if (validateUuid(values.mfaCodeOrMfaRecoveryCode)) {
		closeDialog({
			mfaRecoveryCode: values.mfaCodeOrMfaRecoveryCode,
		});
		return;
	}
	closeDialog({
		mfaCode: values.mfaCodeOrMfaRecoveryCode,
	});
}

function onClickSave() {
	formBus.emit('submit');
}

function onFormReady(isReady: boolean) {
	readyToSubmit.value = isReady;
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('mfa.prompt.code.modal.title')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nFormInputs
				data-test-id="mfa-code-or-recovery-code-input"
				:inputs="formFields"
				:event-bus="formBus"
				@submit="onSubmit"
				@ready="onFormReady"
			/>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div>
				<N8nButton
					float="right"
					:disabled="!readyToSubmit"
					:label="i18n.baseText('settings.personal.save')"
					size="large"
					data-test-id="mfa-save-button"
					@click="onClickSave"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>
