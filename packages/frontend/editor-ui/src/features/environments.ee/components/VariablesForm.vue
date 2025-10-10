<script lang="ts" setup>
import type { Rule, RuleGroup } from '@/Interface';
import type { EnvironmentVariable } from '../environments.types';
import { useI18n } from '@n8n/i18n';
import { computed, reactive, ref, toRaw } from 'vue';
import VariablesUsageBadge from './VariablesUsageBadge.vue';

import { N8nButton, N8nFormInput } from '@n8n/design-system';
const props = defineProps<{
	variable: EnvironmentVariable;
}>();

const emit = defineEmits<{
	submit: [variable: EnvironmentVariable];
	cancel: [];
}>();

const i18n = useI18n();

const keyValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: 50 } },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^[a-zA-Z]/,
			message: i18n.baseText('variables.editing.key.error.startsWithLetter'),
		},
	},
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^[a-zA-Z][a-zA-Z0-9_]*$/,
			message: i18n.baseText('variables.editing.key.error.jsonKey'),
		},
	},
];

const VALUE_MAX_LENGTH = 220;
const valueValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: VALUE_MAX_LENGTH } },
];
const form = reactive<EnvironmentVariable>(structuredClone(toRaw(props.variable)));
const formValidation = reactive<{
	key: boolean;
	value: boolean;
}>({
	key: false,
	value: false,
});
const isValid = computed(() => Object.values(formValidation).every((value) => value));

const handleCancel = () => emit('cancel');

const validateOnBlur = ref(false);
const handleSubmit = () => {
	validateOnBlur.value = true;
	if (isValid.value) {
		emit('submit', form);
	}
};
</script>

<template>
	<tr>
		<td class="key-cell">
			<N8nFormInput
				v-model="form.key"
				label=""
				name="key"
				data-test-id="variable-row-key-input"
				:placeholder="i18n.baseText('variables.editing.key.placeholder')"
				required
				:validate-on-blur="validateOnBlur"
				:validation-rules="keyValidationRules"
				focus-initially
				@validate="(value: boolean) => (formValidation.key = value)"
			/>
		</td>

		<td class="value-cell" width="100%">
			<N8nFormInput
				v-model="form.value"
				class="key-input"
				label=""
				name="value"
				data-test-id="variable-row-value-input"
				:placeholder="i18n.baseText('variables.editing.value.placeholder')"
				type="textarea"
				:autosize="{ minRows: 1, maxRows: 6 }"
				size="medium"
				:maxlength="VALUE_MAX_LENGTH"
				:validate-on-blur="validateOnBlur"
				:validation-rules="valueValidationRules"
				@validate="(value: boolean) => (formValidation.value = value)"
			/>
		</td>

		<td><VariablesUsageBadge v-if="formValidation.key" :name="form.key" /></td>
		<td align="right">
			<N8nButton
				data-test-id="variable-row-cancel-button"
				type="tertiary"
				class="mr-xs"
				@click="handleCancel"
			>
				{{ i18n.baseText('variables.row.button.cancel') }}
			</N8nButton>
			<N8nButton data-test-id="variable-row-save-button" type="primary" @click="handleSubmit">
				{{ i18n.baseText('variables.row.button.save') }}
			</N8nButton>
		</td>
	</tr>
</template>

<style lang="scss" scoped>
.value-cell {
	width: 100%;
	max-width: 50%;
}

.key-input {
	:deep(textarea) {
		min-height: 40px !important;
		resize: none;
	}
}
</style>
