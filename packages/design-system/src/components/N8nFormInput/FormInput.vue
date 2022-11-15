<template>
	<n8n-checkbox
		v-if="type === 'checkbox'"
		v-bind="$props"
		@input="onInput"
		@focus="onFocus"
		ref="inputRef"
	/>
	<n8n-input-label
		v-else
		:inputName="name"
		:label="label"
		:tooltipText="tooltipText"
		:required="required && showRequiredAsterisk"
	>
		<div :class="showErrors ? $style.errorInput : ''" @keydown.stop @keydown.enter="onEnter">
			<slot v-if="hasDefaultSlot" />
			<n8n-select
				v-else-if="type === 'select' || type === 'multi-select'"
				:value="value"
				:placeholder="placeholder"
				:multiple="type === 'multi-select'"
				@change="onInput"
				@focus="onFocus"
				@blur="onBlur"
				:name="name"
				ref="inputRef"
			>
				<n8n-option
					v-for="option in options || []"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</n8n-select>
			<n8n-input
				v-else
				:name="name"
				:type="type"
				:placeholder="placeholder"
				:value="value"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
				ref="inputRef"
			/>
		</div>
		<div :class="$style.errors" v-if="showErrors">
			<span v-text="validationError" />
			<n8n-link
				v-if="documentationUrl && documentationText"
				:to="documentationUrl"
				:newWindow="true"
				size="small"
				theme="danger"
			>
				{{ documentationText }}
			</n8n-link>
		</div>
		<div :class="$style.infoText" v-else-if="infoText">
			<span size="small" v-text="infoText" />
		</div>
	</n8n-input-label>
</template>

<script lang="ts" setup>
import { computed, reactive, onMounted, ref, watch, useSlots } from 'vue';

import N8nInput from '../N8nInput';
import N8nSelect from '../N8nSelect';
import N8nOption from '../N8nOption';
import N8nInputLabel from '../N8nInputLabel';
import N8nCheckbox from '../N8nCheckbox';

import { getValidationError, VALIDATORS } from './validators';
import { Rule, RuleGroup, IValidator } from '../../types';

import { t } from '../../locale';

export interface Props {
	value: any;
	label: string;
	infoText?: string;
	required?: boolean;
	showRequiredAsterisk?: boolean;
	type?: string;
	placeholder?: string;
	tooltipText?: string;
	showValidationWarnings?: boolean;
	validateOnBlur?: boolean;
	documentationUrl?: string;
	documentationText?: string;
	validationRules?: Array<Rule | RuleGroup>;
	validators?: { [key: string]: IValidator | RuleGroup };
	maxlength?: number;
	options?: Array<{ value: string | number; label: string }>;
	autocomplete?: string;
	name?: string;
	focusInitially?: boolean;
	labelSize?: 'small' | 'medium';
}

const props = withDefaults(defineProps<Props>(), {
	documentationText: 'Open docs',
	labelSize: 'medium',
	type: 'text',
	showRequiredAsterisk: true,
	validateOnBlur: true,
});

const emit = defineEmits<{
	(event: 'validate', shouldValidate: boolean): void;
	(event: 'input', value: any): void;
	(event: 'focus'): void;
	(event: 'blur'): void;
	(event: 'enter'): void;
}>();

const state = reactive({
	hasBlurred: false,
	isTyping: false,
});

const slots = useSlots();

const inputRef = ref<HTMLTextAreaElement | null>(null);

function getInputValidationError(): ReturnType<IValidator['validate']> {
	const rules = props.validationRules ?? [];
	const validators = {
		...VALIDATORS,
		...(props.validators ?? {}),
	} as { [key: string]: IValidator | RuleGroup };

	if (props.required) {
		const error = getValidationError(props.value, validators, validators.REQUIRED as IValidator);
		if (error) return error;
	}

	for (let i = 0; i < rules.length; i++) {
		if (rules[i].hasOwnProperty('name')) {
			const rule = rules[i] as Rule;
			if (validators[rule.name]) {
				const error = getValidationError(
					props.value,
					validators,
					validators[rule.name] as IValidator,
					rule.config,
				);
				if (error) return error;
			}
		}

		if (rules[i].hasOwnProperty('rules')) {
			const rule = rules[i] as RuleGroup;
			const error = getValidationError(props.value, validators, rule);
			if (error) return error;
		}
	}

	return null;
}

function onBlur() {
	state.hasBlurred = true;
	state.isTyping = false;
	emit('blur');
}

function onInput(value: any) {
	state.isTyping = true;
	emit('input', value);
}

function onFocus() {
	emit('focus');
}

function onEnter(event: Event) {
	event.stopPropagation();
	event.preventDefault();
	emit('enter');
}

const validationError = computed<string | null>(() => {
	const error = getInputValidationError();

	return error ? t(error.messageKey, error.options) : null;
});

const hasDefaultSlot = computed(() => !!slots.default);

const showErrors = computed(
	() =>
		!!validationError.value &&
		((props.validateOnBlur && state.hasBlurred && !state.isTyping) || props.showValidationWarnings),
);

onMounted(() => {
	emit('validate', !validationError.value);

	if (props.focusInitially && inputRef.value) inputRef.value.focus();
});

watch(
	() => validationError.value,
	(error) => emit('validate', !error),
);

defineExpose({ inputRef });
</script>

<style lang="scss" module>
.infoText {
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
}

.errors {
	composes: infoText;
	color: var(--color-danger);
}

.errorInput {
	--input-border-color: var(--color-danger);
}
</style>
