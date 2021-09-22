<template>
	<n8n-input-label
		:label="parameter.displayName"
		:tooltipText="parameter.description"
		:required="parameter.required"
	>
		<parameter-input
			:parameter="parameter"
			:value="value"
			:path="parameter.name"
			:hideIssues="true"
			:displayOptions="true"
			:documentationUrl="documentationUrl"
			:errorHighlight="showRequiredErrors"

			@blur="onBlur"
			@textInput="valueChanged"
			@valueChanged="valueChanged"
			inputSize="large"
		/>
		<div class="errors" v-if="showRequiredErrors">
			This field is required. <a v-if="documentationUrl" :href="documentationUrl" target="_blank">Open docs</a>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import { IUpdateInformation } from '@/Interface';
import ParameterInput from './ParameterInput.vue';
import Vue from 'vue';

export default Vue.extend({
	name: 'ParameterInputExpanded',
	components: {
		ParameterInput,
	},
	props: {
		parameter: {
		},
		value: {
		},
		showValidationWarnings: {
			type: Boolean,
		},
		documentationUrl: {
			type: String,
		},
	},
	data() {
		return {
			blurred: false,
		};
	},
	computed: {
		showRequiredErrors(): boolean {
			return this.$props.parameter.type !== 'boolean' && !this.value && this.$props.parameter.required && (this.blurred || this.showValidationWarnings);
		},
	},
	methods: {
		onBlur() {
			this.blurred = true;
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('change', parameterData);
		},
	},
});
</script>
