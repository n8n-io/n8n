<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../Modal.vue';
import { PROMPT_MFA_CODE_MODAL_KEY } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { promptMfaCodeBus } from '@/event-bus';
import type { IFormInputs } from '@/Interface';
import { createFormEventBus } from 'n8n-design-system';

const i18n = useI18n();

const formBus = createFormEventBus();
const readyToSubmit = ref(false);

const formFields: IFormInputs = [
	{
		name: 'mfaCode',
		initialValue: '',
		properties: {
			label: i18n.baseText('mfa.code.input.label'),
			placeholder: i18n.baseText('mfa.code.input.placeholder'),
			focusInitially: true,
			capitalize: true,
			required: true,
		},
	},
];

function onSubmit(values: { mfaCode: string }) {
	promptMfaCodeBus.emit('close', {
		mfaCode: values.mfaCode,
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
		width="460px"
		height="300px"
		max-height="640px"
		:title="i18n.baseText('mfa.prompt.code.modal.title')"
		:event-bus="promptMfaCodeBus"
		:name="PROMPT_MFA_CODE_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="[$style.formContainer]">
				<n8n-form-inputs
					data-test-id="mfa-code-form"
					:inputs="formFields"
					:event-bus="formBus"
					@submit="onSubmit"
					@ready="onFormReady"
				/>
			</div>
		</template>
		<template #footer>
			<div>
				<n8n-button
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
	padding-bottom: var(--spacing-xl);
}
</style>
