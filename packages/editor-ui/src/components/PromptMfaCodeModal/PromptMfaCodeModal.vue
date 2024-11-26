<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../Modal.vue';
import { PROMPT_MFA_CODE_MODAL_KEY } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { promptMfaCodeBus } from '@/event-bus';
import { validate as uuidValidate } from 'uuid';

const MFA_CODE_INPUT_NAME = 'mfaCodeInput';

const MFA_CODE_VALIDATORS = {
	mfaCode: {
		validate: (value: string) => {
			if (value === '') {
				return { message: ' ' };
			}

			if (value.length < 6) {
				return {
					message: 'Code must be 6 digits',
				};
			}

			if (!/^\d+$/.test(value)) {
				return {
					message: 'Only digits are allow',
				};
			}

			return false;
		},
	},
};

const RECOVERY_CODE_VALIDATORS = {
	recoveryCode: {
		validate: (value: string) => {
			if (value === '') {
				return { message: ' ' };
			}

			if (!uuidValidate(value)) {
				return {
					message: 'Must be an UUID',
				};
			}

			return false;
		},
	},
};

const i18n = useI18n();

const mfaCode = ref('');
const recoveryCode = ref('');

const isMfaCodeValid = ref(false);
const isRecoveryCodeValid = ref(false);

const anyFieldValid = computed(() => isMfaCodeValid.value || isRecoveryCodeValid.value);

function onClickSave() {
	if (!anyFieldValid.value) {
		return;
	}

	promptMfaCodeBus.emit('close', {
		mfaCode: mfaCode.value,
		recoveryCode: recoveryCode.value,
	});
}

function onValidate(name: string, value: boolean) {
	if (name === MFA_CODE_INPUT_NAME) {
		isMfaCodeValid.value = value;
	} else {
		isRecoveryCodeValid.value = value;
	}
}
</script>

<template>
	<Modal
		width="500px"
		height="400px"
		max-height="640px"
		:title="i18n.baseText('mfa.prompt.code.modal.title')"
		:event-bus="promptMfaCodeBus"
		:name="PROMPT_MFA_CODE_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="[$style.formContainer]">
				<n8n-form-input
					v-model="mfaCode"
					name="mfaCode"
					data-test-id="mfa-code-input"
					:label="i18n.baseText('mfa.code.input.label')"
					:placeholder="i18n.baseText('mfa.code.input.placeholder')"
					:validators="MFA_CODE_VALIDATORS"
					:validation-rules="[{ name: 'MAX_LENGTH', config: { maximum: 6 } }, { name: 'mfaCode' }]"
					@validate="(value: boolean) => onValidate(MFA_CODE_INPUT_NAME, value)"
				/>
				<span> {{ i18n.baseText('mfa.prompt.code.modal.divider') }} </span>

				<n8n-form-input
					v-model="recoveryCode"
					name="recoveryCode"
					data-test-id="recovery-code-input"
					:label="i18n.baseText('mfa.recoveryCode.input.label')"
					:placeholder="i18n.baseText('mfa.recovery.input.placeholder')"
					:validators="RECOVERY_CODE_VALIDATORS"
					:validation-rules="[{ name: 'recoveryCode' }]"
					@validate="(value: boolean) => onValidate('recoveryCodeInput', value)"
				/>
			</div>
		</template>
		<template #footer>
			<div>
				<n8n-button
					float="right"
					:label="i18n.baseText('settings.personal.save')"
					size="large"
					:disabled="!anyFieldValid"
					data-test-id="mfa-save-button"
					@click="onClickSave"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.formContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);

	span {
		font-weight: 600;
	}
}
</style>
