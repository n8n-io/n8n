<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../Modal.vue';
import { PROMPT_MFA_CODE_MODAL_KEY } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { promptMfaCodeBus } from '@/event-bus';
import { type IFormInput } from '@/Interface';
import { createFormEventBus } from '@n8n/design-system/utils';
import { validate as validateUuid } from 'uuid';

import { N8nButton, N8nFormInputs } from '@n8n/design-system';
const i18n = useI18n();

const formBus = createFormEventBus();
const readyToSubmit = ref(false);

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
		promptMfaCodeBus.emit('close', {
			mfaRecoveryCode: values.mfaCodeOrMfaRecoveryCode,
		});
		return;
	}
	promptMfaCodeBus.emit('close', {
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
	<Modal
		width="500px"
		height="300px"
		max-height="640px"
		:title="i18n.baseText('mfa.prompt.code.modal.title')"
		:event-bus="promptMfaCodeBus"
		:name="PROMPT_MFA_CODE_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="[$style.formContainer]">
				<N8nFormInputs
					data-test-id="mfa-code-or-recovery-code-input"
					:inputs="formFields"
					:event-bus="formBus"
					@submit="onSubmit"
					@ready="onFormReady"
				/>
			</div>
		</template>
		<template #footer>
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
		</template>
	</Modal>
</template>

<style lang="scss" module>
.formContainer {
	padding-bottom: var(--spacing--xl);
}
</style>
