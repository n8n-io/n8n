<template>
	<div>
		<parameter-input
				ref="param"
				:inputSize="inputSize"
				:parameter="parameter"
				:value="value"
				:path="path"
				:isReadOnly="isReadOnly"
				:droppable="droppable"
				:activeDrop="activeDrop"
				:forceShowExpression="forceShowExpression"
				:hideIssues="hideIssues"
				:documentationUrl="documentationUrl"
				:errorHighlight="errorHighlight"
				:isForCredential="isForCredential"
				:eventSource="eventSource"
				@focus="onFocus"
				@blur="onBlur"
				@drop="onDrop"
				@textInput="onTextInput"
				@valueChanged="onValueChanged" />
		<input-hint v-if="expressionOutput || parameterHint" :class="$style.hint" :hint="expressionOutput || parameterHint" />
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { INodeProperties, INodePropertyMode, isResourceLocatorValue, NodeParameterValue, NodeParameterValueType } from 'n8n-workflow';
import { INodeUi, IUiState, IUpdateInformation } from '@/Interface';
import { workflowHelpers } from './mixins/workflowHelpers';
import { isValueExpression } from './helpers';

export default mixins(
	showMessage,
	workflowHelpers,
)
	.extend({
		name: 'ParameterInputFull',
		components: {
			ParameterInput,
			InputHint,
		},
		mounted() {
			this.$on('optionSelected', this.optionSelected);
		},
		props: {
			isReadOnly: {
				type: Boolean,
			},
			parameter: {
				type: Object as PropType<INodeProperties>,
			},
			path: {
				type: String,
			},
			value: {
				type: [String, Number, Boolean, Array, Object] as PropType<NodeParameterValueType>,
			},
			hideLabel: {
				type: Boolean,
			},
			droppable: {
				type: Boolean,
			},
			activeDrop: {
				type: Boolean,
			},
			forceShowExpression: {
				type: Boolean,
			},
			hint: {
				type: String,
				required: false,
			},
			inputSize: {
				type: String,
			},
			hideIssues: {
				type: Boolean,
			},
			documentationUrl: {
				type: String as PropType<string | undefined>,
			},
			errorHighlight: {
				type: Boolean,
			},
			isForCredential: {
				type: Boolean,
			},
			eventSource: {
				type: String,
			},
		},
		computed: {
			isValueExpression () {
				return isValueExpression(this.parameter, this.value);
			},
			activeNode(): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			selectedRLMode(): INodePropertyMode | undefined {
				if (typeof this.value !== 'object' ||this.parameter.type !== 'resourceLocator' || !isResourceLocatorValue(this.value)) {
					return undefined;
				}

				const mode = this.value.mode;
				if (mode) {
					return this.parameter.modes?.find((m: INodePropertyMode) => m.name === mode);
				}

				return undefined;
			},
			parameterHint(): string | undefined {
				if (this.selectedRLMode && this.selectedRLMode.hint) {
					return this.selectedRLMode.hint;
				}

				return this.hint;
			},
			expressionValueComputed (): string | null {
				const value = isResourceLocatorValue(this.value)? this.value.value: this.value;
				if (this.activeNode === null || !this.isValueExpression || typeof value !== 'string') {
					return null;
				}

				const hoveringItem = this.$store.getters['ui/hoveringItem'] as null | IUiState['ndv']['hoveringItem'];
				let computedValue: NodeParameterValue;
				try {
					const itemIndex = hoveringItem?.itemIndex ?? undefined;
					const runIndex = hoveringItem?.runIndex ?? undefined;
					computedValue = this.resolveExpression(value, undefined, runIndex, itemIndex);

					if (typeof computedValue === 'string' && computedValue.trim().length === 0) {
						computedValue = this.$locale.baseText('parameterInput.emptyString');
					}
				} catch (error) {
					computedValue = `[${this.$locale.baseText('parameterInput.error')}}: ${error.message}]`;
				}

				return typeof computedValue === 'string' ? computedValue : JSON.stringify(computedValue);
			},
			expressionOutput(): string | null {
				if (this.isValueExpression && this.expressionValueComputed) {
					const hoveringItem = this.$store.getters['ui/hoveringItem'] as null | IUiState['ndv']['hoveringItem'];
					let itemIndex = 1;
					if (hoveringItem) {
						itemIndex = hoveringItem.itemIndex + 1;
					}

					return this.$locale.baseText(`parameterInput.expressionResult`, {
						interpolate: {
							result: this.expressionValueComputed,
							item: `${itemIndex}`,
						},
					});
				}

				return null;
			},
		},
		methods: {
			onFocus() {
				this.$emit('focus');
			},
			onBlur() {
				this.$emit('blur');
			},
			onDrop(data: string) {
				this.$emit('drop', data);
			},
			optionSelected (command: string) {
				if (this.$refs.param) {
					(this.$refs.param as Vue).$emit('optionSelected', command);
				}
			},
			onValueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
			onTextInput (parameterData: IUpdateInformation) {
				this.$emit('textInput', parameterData);
			},
			onDrop(data: string) {
				this.$emit('drop', data);
			},
		},
	});
</script>

<style lang="scss" module>
	.hint {
		margin-top: var(--spacing-4xs);
	}
</style>
