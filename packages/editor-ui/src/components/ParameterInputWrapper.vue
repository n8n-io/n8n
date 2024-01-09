<template>
	<div :class="$style.parameterInput" data-test-id="parameter-input">
		<ParameterInput
			ref="param"
			:input-size="inputSize"
			:parameter="parameter"
			:model-value="modelValue"
			:path="path"
			:is-read-only="isReadOnly"
			:droppable="droppable"
			:active-drop="activeDrop"
			:force-show-expression="forceShowExpression"
			:hide-issues="hideIssues"
			:documentation-url="documentationUrl"
			:error-highlight="errorHighlight"
			:is-for-credential="isForCredential"
			:event-source="eventSource"
			:expression-evaluated="expressionValueComputed"
			:additional-expression-data="resolvedAdditionalExpressionData"
			:label="label"
			:is-single-line="isSingleLine"
			:data-test-id="`parameter-input-${parsedParameterName}`"
			:event-bus="eventBus"
			@focus="onFocus"
			@blur="onBlur"
			@drop="onDrop"
			@textInput="onTextInput"
			@update="onValueChanged"
		/>
		<div v-if="!hideHint && (expressionOutput || parameterHint)" :class="$style.hint">
			<div>
				<InputHint
					v-if="expressionOutput"
					:class="{ [$style.hint]: true, 'ph-no-capture': isForCredential }"
					:data-test-id="`parameter-expression-preview-${parsedParameterName}`"
					:highlight="!!(expressionOutput && targetItem) && isInputParentOfActiveNode"
					:hint="expressionOutput"
					:single-line="true"
				/>
				<InputHint v-else-if="parameterHint" :render-h-t-m-l="true" :hint="parameterHint" />
			</div>
			<slot v-if="$slots.options" name="options" />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from '@/components/ParameterInputHint.vue';
import type {
	IDataObject,
	INodeProperties,
	INodePropertyMode,
	IParameterLabel,
	NodeParameterValue,
	NodeParameterValueType,
} from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation, TargetItem } from '@/Interface';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { isValueExpression, parseResourceMapperFieldName } from '@/utils/nodeTypesUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';

import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'ParameterInputWrapper',
	components: {
		ParameterInput,
		InputHint,
	},
	mixins: [workflowHelpers],
	props: {
		additionalExpressionData: {
			type: Object as PropType<IDataObject>,
			default: () => ({}),
		},
		isReadOnly: {
			type: Boolean,
		},
		isSingleLine: {
			type: Boolean,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
		},
		path: {
			type: String,
		},
		modelValue: {
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
		hideHint: {
			type: Boolean,
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
		label: {
			type: Object as PropType<IParameterLabel>,
			default: () => ({
				size: 'small',
			}),
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: () => createEventBus(),
		},
	},
	computed: {
		...mapStores(useNDVStore, useExternalSecretsStore, useEnvironmentsStore),
		isValueExpression() {
			return isValueExpression(this.parameter, this.modelValue);
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		selectedRLMode(): INodePropertyMode | undefined {
			if (
				typeof this.modelValue !== 'object' ||
				this.parameter.type !== 'resourceLocator' ||
				!isResourceLocatorValue(this.modelValue)
			) {
				return undefined;
			}

			const mode = this.modelValue.mode;
			if (mode) {
				return this.parameter.modes?.find((m: INodePropertyMode) => m.name === mode);
			}

			return undefined;
		},
		parameterHint(): string | undefined {
			if (this.isValueExpression) {
				return undefined;
			}
			if (this.selectedRLMode?.hint) {
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
			const value = isResourceLocatorValue(this.modelValue)
				? this.modelValue.value
				: this.modelValue;
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
						additionalKeys: this.resolvedAdditionalExpressionData,
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
		resolvedAdditionalExpressionData() {
			return {
				$vars: this.environmentsStore.variablesAsObject,
				...(this.externalSecretsStore.isEnterpriseExternalSecretsEnabled && this.isForCredential
					? { $secrets: this.externalSecretsStore.secretsAsObject }
					: {}),
				...this.additionalExpressionData,
			};
		},
		parsedParameterName() {
			return parseResourceMapperFieldName(this.parameter?.name ?? '');
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
		onValueChanged(parameterData: IUpdateInformation) {
			this.$emit('update', parameterData);
		},
		onTextInput(parameterData: IUpdateInformation) {
			this.$emit('textInput', parameterData);
		},
	},
});
</script>

<style lang="scss" module>
.parameterInput {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
}

.hovering {
	color: var(--color-secondary);
}
</style>
