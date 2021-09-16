<template>
	<n8n-input-label
		:label="label"
		:tooltipText="tooltipText"
		:required="required"
	>
		<div :class="validationError ? $style.errorInput : ''">
			<slot v-if="hasDefaultSlot"></slot>
			<n8n-input
				v-else
				:type="type"
				:placeholder="placeholder"
				:value="value"
				:name="name"
				:maxlength="maxlength"
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
			/>
		</div>
		<div :class="$style.errors">
			<span v-if="validationError">{{validationError}}</span>
			<a v-if="documentationUrl && documentationText" :href="documentationUrl" target="_blank">{{ documentationText }}</a>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nInput from '../N8nInput';
import N8nInputLabel from '../N8nInputLabel';

type RuleSet = {name: string, config?: any}[];

type Validator = {
	isValid: (value: string, config?: any) => boolean,
	generateError?: (config: any) => string,
	defaultError?: string,
}

type ValidatationGroup = {
	rules: RuleSet,
	generateError?: (config: any) => string,
	defaultError?: string,
}

// https://stackoverflow.com/a/1373724
const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const VALIDATORS: {[key: string]: Validator | ValidatationGroup} = {
	REQUIRED: {
		isValid: (value: string | number | boolean | null | undefined) => {
			if (typeof value === 'string') {
				return !!value;
			}

			return typeof value === 'boolean' || typeof value === 'number';
		},
		defaultError: 'This field is required',
	},
	MIN_LENGTH: {
		isValid: (value: string, config: {minimum: number}) => {
			return value.length >= config.minimum;
		},
		generateError: (config: {minimum: number}) => {
			return `Must be at least ${config.minimum} characters`;
		},
	},
	MAX_LENGTH: {
		isValid: (value: string, config: {maximum: number}) => {
			return value.length <= config.maximum;
		},
		generateError: (config: {minimum: number}) => {
			return `Must be at most ${config.minimum} characters`;
		},
	},
	CONTAINS_NUMBER: {
		isValid: (value: string, config: {minimum: number}) => {
			const numberCount = (value.match(/\d/g) || []).length;

			return numberCount >= config.minimum;
		},
		generateError: (config: {minimum: number}) => {
			return `Must have at least ${config.minimum} numbers`;
		},
	},
	VALID_EMAIL: {
		isValid: (value: string) => {
  	  return emailRegex.test(String(value).toLowerCase());
		},
		defaultError: 'Must be a valid email',
	},
	CONTAINS_UPPERCASE: {
		isValid: (value: string, config: {minimum: number}) => {
			const uppercaseCount = (value.match(/[A-Z]/g) || []).length;

			return uppercaseCount >= config.minimum;
		},
		generateError: (config: {minimum: number}) => {
			return `Must have at least ${config.minimum} uppercase`;
		},
	},
	DEFAULT_PASSWORD_RULES: {
		rules: [{name: 'CONTAINS_NUMBER', config: {minimum: 1}}, {name: 'CONTAINS_UPPERCASE', config: {minimum: 1}}, {name: 'MIN_LENGTH', config: {minimum: 8}}],
		defaultError: 'At least 8 characters with 1 number and 1 uppercase',
	},
};

const getErrorMessage = (validator: Validator | ValidatationGroup, config? :any): string | null => {
	if (validator.generateError) {
		return validator.generateError(config);
	}

	return validator.defaultError? validator.defaultError : null;
};

const getValidationError = (value: any, validators: {[key: string]: Validator | ValidatationGroup}, validator: Validator | ValidatationGroup, config?: any): string | null => {
	if (validator.hasOwnProperty('rules')) {
		const rules = (validator as ValidatationGroup).rules;
		for (let i = 0; i < rules.length; i++) {
			const rule = rules[i];
			if (validators[rule.name]) {
				const error = getValidationError(value, validators, validators[rule.name] as Validator, rule.config);
				if (error) {
					return getErrorMessage(validator, rule.config) || error;
				}
			}
		}
	}
	else if (validator.hasOwnProperty('isValid') && !(validator as Validator).isValid(value, config)) {
		return getErrorMessage(validator, config);
	}

	return null;
};

export default Vue.extend({
	name: 'FormInput',
	components: {
		N8nInput,
		N8nInputLabel,
	},
	data() {
		return {
			hasBlurred: false,
			isTyping: false,
		};
	},
	props: {
		name: {
			type: String,
			required: true,
		},
		value: {
			type: String,
		},
		label: {
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
	},
	mounted() {
		this.$emit('validate', !this.getValidationError());
	},
	computed: {
		hasDefaultSlot(): boolean {
  		return !!this.$slots.default;
  	},
		showAnyErrors(): boolean {
			return (this.hasBlurred && !this.isTyping)|| this.showValidationWarnings;
		},
		validationError(): string | null {
			if (!this.showAnyErrors) {
				return null;
			}

			return this.getValidationError();
		},
	},
	methods: {
		getValidationError() {
			const rules = (this.validationRules || []) as RuleSet;
			const validators = {
				...VALIDATORS,
				...(this.validators || {}),
			} as {[key: string]: Validator | ValidatationGroup};

			if (this.required) {
				const error = getValidationError(this.value, validators, validators.REQUIRED as Validator);
				if (error) {
					return error;
				}
			}

			for (let i = 0; i < rules.length; i++) {
				const rule = rules[i];
				if (validators[rule.name]) {
					const error = getValidationError(this.value, validators, validators[rule.name] as Validator, rule.config);
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
	},
	watch: {
		validationError(newValue: string | null) {
			this.$emit('validate', !newValue);
		},
	},
});
</script>

<style lang="scss" module>
.errors {
	margin-top: var(--spacing-2xs);
	color: var(--color-danger);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);

	a {
		color: var(--color-danger);
		text-decoration: underline;
	}
}

.errorInput {
	--input-border-color: var(--color-danger);
}
</style>
