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

type Validator = {
	isValid: (value: string, config?: any) => boolean,
	generateError?: (config: any) => string,
	defaultError?: string,
}

type ValidatationGroup = {
	rules: {name: string, config?: any}[],
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
			return `At least ${config.minimum} characters`;
		},
	},
	MAX_LENGTH: {
		isValid: (value: string, config: {maximum: number}) => {
			return value.length <= config.maximum;
		},
		generateError: (config: {minimum: number}) => {
			return `At most ${config.minimum} characters`;
		},
	},
	CONTAINS_NUMBER: {
		isValid: (value: string, config: {minimum: number}) => {
			const numberCount = (value.match(/\d/g) || []).length;

			return numberCount >= config.minimum;
		},
		generateError: (config: {minimum: number}) => {
			return `At least ${config.minimum} numbers`;
		},
	},
	isValidEmail: {
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
			return `At least ${config.minimum} uppercase`;
		},
	},
	DEFAULT_PASSWORD_RULES: {
		rules: [{name: 'CONTAINS_NUMBER', config: {minimum: 1}}, {name: 'CONTAINS_UPPERCASE', config: {minimum: 1}}, {name: 'MIN_LENGTH', config: {minimum: 8}}],
		defaultError: 'At least 8 characters with 1 number and 1 uppercase',
	},
	MUST_MATCH_PASSWORD: {
		isValid: (value: string, config: {password: string}) => {
			return value === config.password;
		},
		generateError: (config: {minimum: number}) => {
			return `Two passwords must match`;
		},
	},
};

export default Vue.extend({
	name: 'FormInput',
	components: {
		N8nInput,
		N8nInputLabel,
	},
	data() {
		return {
			blurred: false,
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
	},
	computed: {
		hasDefaultSlot(): boolean {
  		return !!this.$slots.default;
  	},
		showAnyErrors(): boolean {
			return this.blurred || this.showValidationWarnings;
		},
		validationError(): string | null {
			if (!this.showAnyErrors) {
				return null;
			}

			if (this.required && !(VALIDATORS.REQUIRED as Validator).isValid(this.value)) {
				return VALIDATORS.REQUIRED.defaultError as string;
			}

			return null;
		},
	},
	methods: {
		onBlur() {
			this.blurred = true;
			this.$emit('blur');
		},
		onInput(value: any) {
			this.$emit('input', value);
		},
		onFocus() {
			this.$emit('focus');
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
