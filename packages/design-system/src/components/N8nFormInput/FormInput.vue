<template>
	<N8nCheckbox
		v-if="type === 'checkbox'"
		ref="inputRef"
		:label="label"
		:disabled="disabled"
		:label-size="labelSize as CheckboxLabelSizePropType"
		:model-value="modelValue as CheckboxModelValuePropType"
		@update:model-value="onUpdateModelValue"
		@focus="onFocus"
	/>
	<N8nInputLabel
		v-else-if="type === 'toggle'"
		:input-name="name"
		:label="label"
		:tooltip-text="tooltipText"
		:required="required && showRequiredAsterisk"
	>
		<template #content>
			{{ tooltipText }}
		</template>
		<ElSwitch
			:model-value="modelValue as SwitchModelValuePropType"
			:active-color="activeColor"
			:inactive-color="inactiveColor"
			@update:model-value="onUpdateModelValue"
		></ElSwitch>
	</N8nInputLabel>
	<N8nInputLabel
		v-else
		:input-name="name"
		:label="label"
		:tooltip-text="tooltipText"
		:required="required && showRequiredAsterisk"
	>
		<div :class="showErrors ? $style.errorInput : ''" @keydown.stop @keydown.enter="onEnter">
			<slot v-if="hasDefaultSlot" />
			<N8nSelect
				v-else-if="type === 'select' || type === 'multi-select'"
				ref="inputRef"
				:class="{ [$style.multiSelectSmallTags]: tagSize === 'small' }"
				:model-value="modelValue"
				:placeholder="placeholder"
				:multiple="type === 'multi-select'"
				:disabled="disabled"
				:name="name"
				:teleported="teleported"
				@update:model-value="onUpdateModelValue"
				@focus="onFocus"
				@blur="onBlur"
			>
				<N8nOption
					v-for="option in options || []"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					:disabled="!!option.disabled"
					size="small"
				/>
			</N8nSelect>
			<N8nInput
				v-else
				ref="inputRef"
				:name="name"
				:type="type as InputTypePropType"
				:placeholder="placeholder"
				:model-value="modelValue as InputModelValuePropType"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				:disabled="disabled"
				@update:model-value="onUpdateModelValue"
				@blur="onBlur"
				@focus="onFocus"
			/>
		</div>
		<div v-if="showErrors" :class="$style.errors">
			<span v-text="validationError" />
			<n8n-link
				v-if="documentationUrl && documentationText"
				:to="documentationUrl"
				:new-window="true"
				size="small"
				theme="danger"
			>
				{{ documentationText }}
			</n8n-link>
		</div>
		<div v-else-if="infoText" :class="$style.infoText">
			<span size="small" v-text="infoText" />
		</div>
	</N8nInputLabel>
</template>

<script lang="ts" setup>
import { computed, reactive, onMounted, ref, watch, useSlots } from 'vue';

import N8nInput from '../N8nInput';
import N8nSelect from '../N8nSelect';
import N8nOption from '../N8nOption';
import N8nInputLabel from '../N8nInputLabel';
import N8nCheckbox from '../N8nCheckbox';
import { ElSwitch } from 'element-plus';

import { getValidationError, VALIDATORS } from './validators';
import type {
	Rule,
	RuleGroup,
	IValidator,
	Validatable,
	InputModelValuePropType,
	InputTypePropType,
	SwitchModelValuePropType,
	CheckboxModelValuePropType,
	CheckboxLabelSizePropType,
	InputAutocompletePropType,
} from '../../types';

import { t } from '../../locale';

export interface Props {
	modelValue: Validatable;
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
	options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
	autocomplete?: InputAutocompletePropType;
	name?: string;
	focusInitially?: boolean;
	labelSize?: 'small' | 'medium' | 'large';
	disabled?: boolean;
	activeLabel?: string;
	activeColor?: string;
	inactiveLabel?: string;
	inactiveColor?: string;
	teleported?: boolean;
	tagSize?: 'small' | 'medium';
}

const props = withDefaults(defineProps<Props>(), {
	documentationText: 'Open docs',
	labelSize: 'medium',
	type: 'text',
	showRequiredAsterisk: true,
	validateOnBlur: true,
	teleported: true,
	tagSize: 'small',
});

const $emit = defineEmits<{
	(event: 'validate', shouldValidate: boolean): void;
	(event: 'update:modelValue', value: unknown): void;
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
	const rules = props.validationRules || [];
	const validators = {
		...VALIDATORS,
		...(props.validators || {}),
	} as { [key: string]: IValidator | RuleGroup };

	if (props.required) {
		const error = getValidationError(
			props.modelValue,
			validators,
			validators.REQUIRED as IValidator,
		);
		if (error) return error;
	}

	for (let i = 0; i < rules.length; i++) {
		if (rules[i].hasOwnProperty('name')) {
			const rule = rules[i] as Rule;
			if (validators[rule.name]) {
				const error = getValidationError(
					props.modelValue,
					validators,
					validators[rule.name] as IValidator,
					rule.config,
				);
				if (error) return error;
			}
		}

		if (rules[i].hasOwnProperty('rules')) {
			const rule = rules[i] as RuleGroup;
			const error = getValidationError(props.modelValue, validators, rule);
			if (error) return error;
		}
	}

	return null;
}

function onBlur() {
	state.hasBlurred = true;
	state.isTyping = false;
	$emit('blur');
}

function onUpdateModelValue(value: Validatable) {
	state.isTyping = true;
	$emit('update:modelValue', value);
}

function onFocus() {
	$emit('focus');
}

function onEnter(event: Event) {
	event.stopPropagation();
	event.preventDefault();
	$emit('enter');
}

const validationError = computed<string | null>(() => {
	const error = getInputValidationError();

	if (error) {
		if ('messageKey' in error) {
			return t(error.messageKey, error.options as object);
		} else if ('message' in error) {
			return error.message;
		}
	}

	return null;
});

const hasDefaultSlot = computed(() => !!slots.default);

const showErrors = computed(
	() =>
		!!validationError.value &&
		((props.validateOnBlur && state.hasBlurred && !state.isTyping) || props.showValidationWarnings),
);

onMounted(() => {
	$emit('validate', !validationError.value);

	if (props.focusInitially && inputRef.value) inputRef.value.focus();
});

watch(
	() => validationError.value,
	(error) => $emit('validate', !error),
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

.multiSelectSmallTags {
	:global(.el-tag) {
		height: 24px;
		padding: 0 8px;
		line-height: 22px;
	}
}
</style>
