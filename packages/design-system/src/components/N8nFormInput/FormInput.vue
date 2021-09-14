<template>
	<n8n-input-label
		:label="label"
		:tooltipText="tooltipText"
		:required="required"
	>
		<div>
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
			<span v-if="showRequiredErrors">{{errors.required}}</span>
			<a v-if="documentationUrl && documentationText" :href="documentationUrl" target="_blank">{{ documentationText }}</a>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nInput from '../N8nInput';
import N8nInputLabel from '../N8nInputLabel';

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
		errors: {
			type: Object,
			default() {
				return {
					required: 'This field is required.',
				};
			},
		},
	},
	computed: {
		hasDefaultSlot(): boolean {
  		return !!this.$slots.default;
  	},
		showAnyErrors(): boolean {
			return this.blurred || this.showValidationWarnings;
		},
		showRequiredErrors(): boolean {
			return this.type !== 'boolean' && !this.value && this.required && this.showAnyErrors;
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
</style>
