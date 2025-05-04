<script setup lang="ts">
import { ref } from 'vue';
import Modal from './Modal.vue';
import { PROMPT_MFA_CODE_MODAL_KEY, SCHEMA_CREATE_OR_EDIT_MODAL_KEY } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { promptMfaCodeBus } from '@/event-bus';
import type { IFormInputs } from '@/Interface';
import { createFormEventBus } from '@n8n/design-system/utils';
import { validate as validateUuid } from 'uuid';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import { jsonParse, NodeParameterValueType } from 'n8n-workflow';
import { useDebounce } from '@/composables/useDebounce';
import Ajv from 'ajv/dist/2020';

const i18n = useI18n();
const { debounce } = useDebounce();

const formBus = createFormEventBus();
const readyToSubmit = ref(false);

const ajv = new Ajv();

const formFields: IFormInputs = [
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
];

function onSubmit(values: { mfaCodeOrMfaRecoveryCode: string }) {
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

async function valueChanged(value: NodeParameterValueType | {} | Date, type: string) {
	if (type === 'definition') {
		modelJsonSchema.value = value?.toString() || '';
		try {
			//@ts-ignore
			await ajv.validateSchema(jsonParse(value), true);
		} catch (e) {
			console.log(e.message);
		}
	} else if (type === 'input') {
		modelTestJson.value = value?.toString() || '';
	}
}

function onInput(value: string) {
	schemaName.value = value;
}

const modelJsonSchema = ref<string>('');
const modelTestJson = ref<string>('');
const editorRows = ref<number>(50);
const schemaName = ref<string>('');
const valueChangedDebounced = debounce(valueChanged, { debounceTime: 100 });
</script>

<template>
	<Modal
		width="1200px"
		height="640px"
		max-height="640px"
		title="Create Schema"
		:event-bus="promptMfaCodeBus"
		:name="SCHEMA_CREATE_OR_EDIT_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<N8nInputLabel label="Name" color="text-dark">
				<N8nInput
					ref="inputRef"
					required
					:model-value="schemaName"
					size="large"
					type="text"
					placeholder="e.g Invoice"
					:maxlength="50"
					@update:model-value="onInput"
				/>
			</N8nInputLabel>
			<br />
			<div :class="[$style.formContainer]">
				<div :class="[$style.aja]">
					<n8n-text bold> Schema Definition</n8n-text>
					<JsonEditor
						:model-value="modelJsonSchema"
						fill-parent
						@update:model-value="(value) => valueChangedDebounced(value, 'definition')"
					/>
				</div>
				<div :class="[$style.aja]">
					<n8n-text bold> Input JSON</n8n-text>

					<JsonEditor
						:model-value="modelTestJson"
						fill-parent
						@update:model-value="(value) => valueChangedDebounced(value, 'input')"
					/>
				</div>
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
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.aja {
	height: 350px;
	flex-basis: 45%;
}
</style>
