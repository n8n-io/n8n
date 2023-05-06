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
			:expressionEvaluated="expressionValueComputed"
			:data-test-id="`parameter-input-${parameter.name}`"
			@focus="onFocus"
			@blur="onBlur"
			@drop="onDrop"
			@textInput="onTextInput"
			@valueChanged="onValueChanged"
		/>
		<input-hint
			v-if="expressionOutput"
			:class="$style.hint"
			data-test-id="parameter-expression-preview"
			class="ph-no-capture"
			:highlight="!!(expressionOutput && targetItem) && isInputParentOfActiveNode"
			:hint="expressionOutput"
			:singleLine="true"
		/>
		<input-hint
			v-else-if="parameterHint"
			:class="$style.hint"
			:renderHTML="true"
			:hint="parameterHint"
		/>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';
import type {
	INodeProperties,
	INodePropertyMode,
	NodeParameterValue,
	NodeParameterValueType,
} from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation, TargetItem } from '@/Interface';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { isValueExpression } from '@/utils';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';

type ParamRef = InstanceType<typeof ParameterInput>;

export default mixins(showMessage, workflowHelpers).extend({
	name: 'parameter-input-wrapper',
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
		...mapStores(useNDVStore),
		isValueExpression() {
			return isValueExpression(this.parameter, this.value);
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		selectedRLMode(): INodePropertyMode | undefined {
			if (
				typeof this.value !== 'object' ||
				this.parameter.type !== 'resourceLocator' ||
				!isResourceLocatorValue(this.value)
			) {
				return undefined;
			}

			const mode = this.value.mode;
			if (mode) {
				return this.parameter.modes?.find((m: INodePropertyMode) => m.name === mode);
			}

			return undefined;
		},
		parameterHint(): string | undefined {
			if (this.isValueExpression) {
				return undefined;
			}
			if (this.selectedRLMode && this.selectedRLMode.hint) {
				return this.selectedRLMode.hint;
			}

			return this.hint;
		},
		targetItem(): TargetItem | null {
			return this.ndvStore.hoveringItem;
		},
		isInputParentOfActiveNode(): boolean {
			return this.ndvStore.isInputParentOfActiveNode;
		},
		expressionValueComputed(): string | null {
			const value = isResourceLocatorValue(this.value) ? this.value.value : this.value;
			if (!this.activeNode || !this.isValueExpression || typeof value !== 'string') {
				return null;
			}

			let computedValue: NodeParameterValue;
			try {
				let opts;
				if (this.ndvStore.isInputParentOfActiveNode) {
					opts = {
						targetItem: this.targetItem ?? undefined,
						inputNodeName: this.ndvStore.ndvInputNodeName,
						inputRunIndex: this.ndvStore.ndvInputRunIndex,
						inputBranchIndex: this.ndvStore.ndvInputBranchIndex,
					};
				}

				computedValue = this.resolveExpression(value, undefined, opts);

				if (computedValue === null) {
					return null;
				}

				if (typeof computedValue === 'string' && computedValue.length === 0) {
					return this.$locale.baseText('parameterInput.emptyString');
				}
			} catch (error) {
				computedValue = `[${this.$locale.baseText('parameterInput.error')}: ${error.message}]`;
			}

			return typeof computedValue === 'string' ? computedValue : JSON.stringify(computedValue);
		},
		expressionOutput(): string | null {
			if (this.isValueExpression && this.expressionValueComputed) {
				return this.expressionValueComputed;
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
		optionSelected(command: string) {
			const paramRef = this.$refs.param as ParamRef | undefined;

			paramRef?.$emit('optionSelected', command);
		},
		onValueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		onTextInput(parameterData: IUpdateInformation) {
			this.$emit('textInput', parameterData);
		},
	},
});
</script>

<style lang="scss" module>
.hint {
	margin-top: var(--spacing-4xs);
}

.hovering {
	color: var(--color-secondary);
}
</style>
