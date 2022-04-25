<template>
	<n8n-input-label :label="label" :tooltipText="tooltipText" :required="required && showRequiredAsterisk">
		<div :class="showErrors ? $style.errorInput : ''" @keydown.stop @keydown.enter="onEnter">
			<slot v-if="hasDefaultSlot"></slot>
			<n8n-select
				v-else-if="type === 'select' || type === 'multi-select'"
				:value="value"
				:placeholder="placeholder"
				:multiple="type === 'multi-select'"
				@change="onInput"
				@focus="onFocus"
				@blur="onBlur"
				ref="input"
			>
				<n8n-option
					v-for="option in (options || [])"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</n8n-select>
			<n8n-input
				v-else
				:type="type"
				:placeholder="placeholder"
				:value="value"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
				ref="input"
			/>
		</div>
		<div :class="$style.errors" v-if="showErrors">
			<span>{{ validationError }}</span>
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
			<span size="small">{{ infoText }}</span>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nInput from '../N8nInput';
import N8nSelect from '../N8nSelect';
import N8nOption from '../N8nOption';
import N8nInputLabel from '../N8nInputLabel';

import { getValidationError, VALIDATORS } from './validators';
import { Rule, RuleGroup, IValidator } from "../../../../editor-ui/src/Interface";

import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';

export default mixins(Locale).extend({
	name: 'n8n-form-input',
	components: {
		N8nInput,
		N8nInputLabel,
		N8nOption,
		N8nSelect,
	},
	data() {
		return {
			hasBlurred: false,
			isTyping: false,
		};
	},
	props: {
		value: {
		},
		label: {
			type: String,
		},
		infoText: {
			type: String,
		},
		required: {
			type: Boolean,
		},
		showRequiredAsterisk: {
			type: Boolean,
			default: true,
		},
		type: {
			type: String,
			default: 'text',
		},
		placeholder: {
			type: String,
		},
		tooltipText: {
			type: String,
		},
		showValidationWarnings: {
			type: Boolean,
		},
		validateOnBlur: {
			type: Boolean,
			default: true,
		},
		documentationUrl: {
			type: String,
		},
		documentationText: {
			type: String,
			default: 'Open docs',
		},
		validationRules: {
			type: Array,
		},
		validators: {
			type: Object,
		},
		maxlength: {
			type: Number,
		},
		options: {
			type: Array,
		},
		autocomplete: {
			type: String,
		},
		focusInitially: {
			type: Boolean,
		},
	},
	mounted() {
		this.$emit('validate', !this.validationError);

		if (this.focusInitially && this.$refs.input) {
			this.$refs.input.focus();
		}
	},
	computed: {
		validationError(): string | null {
			const error = this.getValidationError();
			if (error) {
				return this.t(error.messageKey, error.options);
			}

			return null;
		},
		hasDefaultSlot(): boolean {
			return !!this.$slots.default;
		},
		showErrors(): boolean {
			return (
				!!this.validationError &&
				((this.validateOnBlur && this.hasBlurred && !this.isTyping) || this.showValidationWarnings)
			);
		},
	},
	methods: {
		getValidationError(): ReturnType<IValidator['validate']>  {
			const rules = (this.validationRules || []) as (Rule | RuleGroup)[];
			const validators = {
				...VALIDATORS,
				...(this.validators || {}),
			} as { [key: string]: IValidator | RuleGroup };

			if (this.required) {
				const error = getValidationError(this.value, validators, validators.REQUIRED as Validator);
				if (error) {
					return error;
				}
			}

			for (let i = 0; i < rules.length; i++) {
				if (rules[i].hasOwnProperty('name')) {
					const rule = rules[i] as Rule;
					if (validators[rule.name]) {
						const error = getValidationError(
							this.value,
							validators,
							validators[rule.name] as Validator,
							rule.config,
						);
						if (error) {
							return error;
						}
					}
				}

				if (rules[i].hasOwnProperty('rules')) {
					const rule = rules[i] as RuleGroup;
					const error = getValidationError(
						this.value,
						validators,
						rule,
					);
					if (error) {
						return error;
					}
				}
			}

			return null;
		},
		onBlur() {
			this.hasBlurred = true;
			this.isTyping = false;
			this.$emit('blur');
		},
		onInput(value: any) {
			this.isTyping = true;
			this.$emit('input', value);
		},
		onFocus() {
			this.$emit('focus');
		},
		onEnter(e) {
			e.stopPropagation();
			e.preventDefault();
			this.$emit('enter');
		},
	},
	watch: {
		validationError(newValue: string | null, oldValue: string | null) {
			this.$emit('validate', !newValue);
		},
	},
});
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
