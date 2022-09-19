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
		<input-hint v-if="hint" :class="$style.hint" :hint="hint" />
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { INodeParameters } from 'n8n-workflow';
import { INodeUi, IUpdateInformation } from '@/Interface';

export default mixins(
	showMessage,
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
				type: Object,
			},
			path: {
				type: String,
			},
			value: {
				type: [String, Number, Boolean, Array, Object] as PropType<string | number | boolean | string[] | INodeParameters>, // todo after RL INodeParamVal
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
				type: String,
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
