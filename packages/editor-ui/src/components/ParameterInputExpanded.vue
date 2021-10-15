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
			This field is required. <a v-if="documentationUrl" :href="documentationUrl" target="_blank" @click="onDocumentationUrlClick">Open docs</a>
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
			if (!this.$props.parameter.required) {
				return false;
			}

			if (this.blurred || this.showValidationWarnings) {
				if (this.$props.parameter.type === 'string') {
					return !this.value;
				}

				if (this.$props.parameter.type === 'number') {
					return typeof this.value !== 'number';
				}
			}

			return false;
		},
	},
	methods: {
		onBlur() {
			this.blurred = true;
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('change', parameterData);
		},
		onDocumentationUrlClick (): void {
			this.$telemetry.track('User clicked credential modal docs link', {
				docs_link: this.documentationUrl,
				source: 'field',
				workflow_id: this.$store.getters.workflowId,
			});
		},
	},
});
</script>
