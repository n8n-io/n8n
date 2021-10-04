<template>
	<n8n-input-label :label="label" :tooltipText="tooltipText" :required="required">
		<div :class="showErrors ? $style.errorInput : ''" @keydown.stop @keydown.enter="onEnter">
			<slot v-if="hasDefaultSlot"></slot>
			<n8n-select
				v-else-if="type === 'select'"
				:value="value"
				:placeholder="placeholder"
				@change="onInput"
				@focus="onFocus"
				@blur="onBlur"
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
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
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

import { IValidator, IRuleGroup, IRuleSet, IRule } from '../../Interface';

const VALIDATORS: { [key: string]: IValidator | IRuleGroup } = {
	REQUIRED: {
		validate: (value: string | number | boolean | null | undefined) => {
			if (typeof value === 'string' && !!value.trim()) {
				return;
			}

			if (typeof value === 'boolean' || typeof value === 'number') {
				return;
			}
			throw new Error('This field is required');
		},
	},
};

const getValidationError = (
	value: any,
	validators: { [key: string]: IValidator | IRuleGroup },
	validator: IValidator | IRuleGroup,
	config?: any,
): string | null => {
	if (validator.hasOwnProperty('rules')) {
		const rules = (validator as IRuleGroup).rules;
		for (let i = 0; i < rules.length; i++) {
			if (rules[i].hasOwnProperty('rules')) {
				const error = getValidationError(
					value,
					validators,
					rules[i] as IRuleGroup,
					config,
				);

				if (error) {
					return error;
				}
			}

			if (rules[i].hasOwnProperty('name') ) {
				const rule = rules[i] as {name: string, config?: any};
				if (!validators[rule.name]) {
					continue;
				}

				const error = getValidationError(
					value,
					validators,
					validators[rule.name] as IValidator,
					rule.config,
				);
				if (error) {
					return (validator as IRuleGroup).defaultError || error;
				}
			}
		}
	} else if (
		validator.hasOwnProperty('validate')
	) {
		try {
			(validator as IValidator).validate(value, config);
		} catch (e) {
			return e.message;
		}
	}

	return null;
};

export default Vue.extend({
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
			type: String,
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
	},
	mounted() {
		this.$emit('validate', !this.validationError);
	},
	computed: {
		validationError(): string | null {
			return this.getValidationError();
		},
		hasDefaultSlot(): boolean {
			return !!this.$slots.default;
		},
		showErrors(): boolean {
			return (
				!!this.validationError &&
				((this.hasBlurred && !this.isTyping) || this.showValidationWarnings)
			);
		},
	},
	methods: {
		getValidationError(): string | null {
			const rules = (this.validationRules || []) as IRuleSet;
			const validators = {
				...VALIDATORS,
				...(this.validators || {}),
			} as { [key: string]: IValidator | IRuleGroup };

			if (this.required) {
				const error = getValidationError(this.value, validators, validators.REQUIRED as IValidator);
				if (error) {
					return error;
				}
			}

			for (let i = 0; i < rules.length; i++) {
				if (rules[i].hasOwnProperty('name')) {
					const rule = rules[i] as IRule;
					if (validators[rule.name]) {
						const error = getValidationError(
							this.value,
							validators,
							validators[rule.name] as IValidator,
							rule.config,
						);
						if (error) {
							return error;
						}
					}
				}

				if (rules[i].hasOwnProperty('rules')) {
					const rule = rules[i] as IRuleGroup;
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
		onEnter() {
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
