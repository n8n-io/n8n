<template>
	<n8n-input-label
		:label="$locale.credText().inputLabelDisplayName(parameter)"
		:tooltipText="$locale.credText().inputLabelDescription(parameter)"
		:required="parameter.required"
		:showTooltip="focused"
		:showOptions="menuExpanded"
	>
		<template #options>
			<parameter-options
				:parameter="parameter"
				:value="value"
				:isReadOnly="false"
				:showOptions="true"
				@optionSelected="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<template>
			<parameter-input
				ref="param"
				inputSize="large"
				:parameter="parameter"
				:value="value"
				:path="parameter.name"
				:hideIssues="true"
				:displayOptions="true"
				:documentationUrl="documentationUrl"
				:errorHighlight="showRequiredErrors"
				:isForCredential="true"
				:eventSource="eventSource"
				@focus="onFocus"
				@blur="onBlur"
				@textInput="valueChanged"
				@valueChanged="valueChanged"
			/>
			<div :class="$style.errors" v-if="showRequiredErrors">
				<n8n-text color="danger" size="small">
					{{ $locale.baseText('parameterInputExpanded.thisFieldIsRequired') }}
					<n8n-link v-if="documentationUrl" :to="documentationUrl" size="small" :underline="true" @click="onDocumentationUrlClick">
						{{ $locale.baseText('parameterInputExpanded.openDocs') }}
					</n8n-link>
				</n8n-text>
			</div>
			<input-hint :class="$style.hint" :hint="$locale.credText().hint(parameter)" />
		</template>
	</n8n-input-label>
</template>

<script lang="ts">
import { IUpdateInformation } from '@/Interface';
import ParameterInput from './ParameterInput.vue';
import ParameterOptions from './ParameterOptions.vue';
import InputHint from './ParameterInputHint.vue';
import Vue from 'vue';

export default Vue.extend({
	name: 'ParameterInputExpanded',
	components: {
		ParameterInput,
		InputHint,
		ParameterOptions,
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
		eventSource: {
			type: String,
		},
	},
	data() {
		return {
			focused: false,
			blurredEver: false,
			menuExpanded: false,
		};
	},
	computed: {
		showRequiredErrors(): boolean {
			if (!this.$props.parameter.required) {
				return false;
			}

			if (this.blurredEver || this.showValidationWarnings) {
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
		onFocus() {
			this.focused = true;
		},
		onBlur() {
			this.blurredEver = true;
			this.focused = false;
		},
		onMenuExpanded(expanded: boolean) {
			this.menuExpanded = expanded;
		},
		optionSelected (command: string) {
			if (this.$refs.param) {
				(this.$refs.param as Vue).$emit('optionSelected', command);
			}
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

<style lang="scss" module>
	.errors {
		margin-top: var(--spacing-2xs);
	}
	.hint {
		margin-top: var(--spacing-4xs);
	}
</style>
