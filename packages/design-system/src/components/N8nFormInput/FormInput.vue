<template>
	<n8n-input-label :label="label" :tooltipText="tooltipText" :required="required && showRequiredAsterisk">
		<div :class="showErrors ? $style.errorInput : ''" @keydown.stop @keydown.enter="onEnter">
			<slot v-if="hasDefaultSlot"></slot>
			<n8n-select
				v-else-if="type === 'select'"
				:value="value"
			>
				<n8n-option
					v-for="option in (options || [])"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					@change="onInput"
					@focus="onFocus"
					@blur="onBlur"
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

type Rule = { name: string; config?: any;};

type RuleSet = (Rule | RuleGroup)[];

type RuleGroup = {
	rules: RuleSet;
	defaultError?: string;
};

type Validator = {
	validate: (value: string, config?: any) => void;
};

// https://stackoverflow.com/a/1373724
const emailRegex =
	/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const VALIDATORS: { [key: string]: Validator | RuleGroup } = {
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
	MIN_LENGTH: {
		validate: (value: string, config: { minimum: number }) => {
			if (value.length < config.minimum) {
				throw new Error(`Must be at least ${config.minimum} characters`);
			}
		},
	},
	MAX_LENGTH: {
		validate: (value: string, config: { maximum: number }) => {
			if (value.length > config.maximum) {
			 throw new Error(`Must be at most ${config.maximum} characters`);
			}
		},
	},
	CONTAINS_NUMBER: {
		validate: (value: string, config: { minimum: number }) => {
			const numberCount = (value.match(/\d/g) || []).length;

			if (numberCount < config.minimum) {
				throw new Error(`Must have at least ${config.minimum} number${config.minimum > 1 ? 's' : ''}`);
			}
		},
	},
	VALID_EMAIL: {
		validate: (value: string) => {
			if (!emailRegex.test(String(value).toLowerCase())) {
				throw new Error('Must be a valid email');
			}
		},
	},
	VALID_EMAILS: {
		validate: (value: string) => {
			value.split(',').forEach((email: string) => {
				if (!!email.trim() && !emailRegex.test(String(email).toLowerCase())) {
					throw new Error(`"${email.trim()}" is not a valid email`);
				}
			});
		},
	},
	CONTAINS_UPPERCASE: {
		validate: (value: string, config: { minimum: number }) => {
			const uppercaseCount = (value.match(/[A-Z]/g) || []).length;

			if (uppercaseCount < config.minimum) {
				throw new Error(`Must have at least ${config.minimum} uppercase character${
					config.minimum > 1 ? 's' : ''
				}`);
			}
		},
	},
	DEFAULT_PASSWORD_RULES: {
		rules: [
			{
				rules: [
					{ name: 'MIN_LENGTH', config: { minimum: 8 } },
					{ name: 'CONTAINS_NUMBER', config: { minimum: 1 } },
					{ name: 'CONTAINS_UPPERCASE', config: { minimum: 1 } },
				],
				defaultError: 'At least 8 characters with 1 number and 1 uppercase',
			},
			{ name: 'MAX_LENGTH', config: {maximum: 64} },
		],
	},
};

const getValidationError = (
	value: any,
	validators: { [key: string]: Validator | RuleGroup },
	validator: Validator | RuleGroup,
	config?: any,
): string | null => {
	if (validator.hasOwnProperty('rules')) {
		const rules = (validator as RuleGroup).rules;
		for (let i = 0; i < rules.length; i++) {
			if (rules[i].hasOwnProperty('rules')) {
				const error = getValidationError(
					value,
					validators,
					rules[i] as RuleGroup,
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
					validators[rule.name] as Validator,
					rule.config,
				);
				if (error) {
					return (validator as RuleGroup).defaultError || error;
				}
			}
		}
	} else if (
		validator.hasOwnProperty('validate')
	) {
		try {
			(validator as Validator).validate(value, config);
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
			const rules = (this.validationRules || []) as RuleSet;
			const validators = {
				...VALIDATORS,
				...(this.validators || {}),
			} as { [key: string]: Validator | RuleGroup };

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
