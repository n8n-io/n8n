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
				@textInput="onTextInput"
				@valueChanged="onValueChanged" />
		<input-hint v-if="expressionOutput || hint" :class="$style.hint" :hint="expressionOutput || hint" />
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { INodeParameters, INodeProperties, NodeParameterValue, NodeParameterValueType } from 'n8n-workflow';
import { INodeUi, IUpdateInformation } from '@/Interface';
import { workflowHelpers } from './mixins/workflowHelpers';

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
			node: {
				type: Object as PropType<INodeUi | null>,
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
				// todo replace after RL
				if (this.parameter.noDataExpression === true) {
					return false;
				}
				if (typeof this.value === 'string' && this.value.charAt(0) === '=') {
					return true;
				}
				return false;
			},
			expressionValueComputed (): string | null {
				if (this.node === null) {
					return null;
				}
				if (typeof this.value !== 'string' || !this.isValueExpression) {
					return null;
				}

				let computedValue: NodeParameterValue;
				try {
					computedValue = this.resolveExpression(this.value) as NodeParameterValue;

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
					return this.$locale.baseText(`parameterInput.expressionResult`, {
						interpolate: {
							result: this.expressionValueComputed,
							item: '1',
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
