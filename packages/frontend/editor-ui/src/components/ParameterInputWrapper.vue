<script setup lang="ts">
import type { IUpdateInformation, InputSize } from '@/Interface';
import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from '@/components/ParameterInputHint.vue';
import {
	isResourceLocatorValue,
	type IDataObject,
	type INodeProperties,
	type INodePropertyMode,
	type IParameterLabel,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { useResolvedExpression } from '@/composables/useResolvedExpression';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { isValueExpression, parseResourceMapperFieldName } from '@/utils/nodeTypesUtils';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, useTemplateRef } from 'vue';

type Props = {
	parameter: INodeProperties;
	path: string;
	modelValue: NodeParameterValueType;
	additionalExpressionData?: IDataObject;
	rows?: number;
	isReadOnly?: boolean;
	isAssignment?: boolean;
	droppable?: boolean;
	activeDrop?: boolean;
	forceShowExpression?: boolean;
	hint?: string;
	hideHint?: boolean;
	inputSize?: InputSize;
	hideIssues?: boolean;
	documentationUrl?: string;
	errorHighlight?: boolean;
	isForCredential?: boolean;
	eventSource?: string;
	label?: IParameterLabel;
	eventBus?: EventBus;
	canBeOverridden?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	additionalExpressionData: () => ({}),
	rows: 5,
	label: () => ({ size: 'small' }),
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	focus: [];
	blur: [];
	drop: [value: string];
	update: [value: IUpdateInformation];
	textInput: [value: IUpdateInformation];
}>();

const ndvStore = useNDVStore();
const externalSecretsStore = useExternalSecretsStore();
const environmentsStore = useEnvironmentsStore();

const isExpression = computed(() => {
	return isValueExpression(props.parameter, props.modelValue);
});

const selectedRLMode = computed(() => {
	if (
		typeof props.modelValue !== 'object' ||
		props.parameter.type !== 'resourceLocator' ||
		!isResourceLocatorValue(props.modelValue)
	) {
		return undefined;
	}

	const mode = props.modelValue.mode;
	if (mode) {
		return props.parameter.modes?.find((m: INodePropertyMode) => m.name === mode);
	}

	return undefined;
});

const parameterHint = computed(() => {
	if (isExpression.value) {
		return undefined;
	}
	if (selectedRLMode.value?.hint) {
		return selectedRLMode.value.hint;
	}

	return props.hint;
});

const targetItem = computed(() => ndvStore.expressionTargetItem);

const isInputParentOfActiveNode = computed(() => ndvStore.isInputParentOfActiveNode);

const expression = computed(() => {
	if (!isExpression.value) return '';
	return isResourceLocatorValue(props.modelValue) ? props.modelValue.value : props.modelValue;
});

const resolvedAdditionalExpressionData = computed(() => {
	return {
		$vars: environmentsStore.variablesAsObject,
		...(externalSecretsStore.isEnterpriseExternalSecretsEnabled && props.isForCredential
			? { $secrets: externalSecretsStore.secretsAsObject }
			: {}),
		...props.additionalExpressionData,
	};
});

const { resolvedExpression, resolvedExpressionString } = useResolvedExpression({
	expression,
	additionalData: resolvedAdditionalExpressionData,
	isForCredential: props.isForCredential,
	stringifyObject: props.parameter.type !== 'multiOptions',
});

const parsedParameterName = computed(() => {
	return parseResourceMapperFieldName(props.parameter?.name ?? '');
});

function onFocus() {
	emit('focus');
}

function onBlur() {
	emit('blur');
}

function onDrop(data: string) {
	emit('drop', data);
}

function onValueChanged(parameterData: IUpdateInformation) {
	emit('update', parameterData);
}

function onTextInput(parameterData: IUpdateInformation) {
	emit('textInput', parameterData);
}

const param = useTemplateRef('param');
const isSingleLineInput = computed(() => param.value?.isSingleLineInput);
const displaysIssues = computed(() => param.value?.displaysIssues);
defineExpose({
	isSingleLineInput,
	displaysIssues,
	focusInput: () => param.value?.focusInput(),
	selectInput: () => param.value?.selectInput(),
});
</script>

<template>
	<div :class="$style.parameterInput" data-test-id="parameter-input">
		<ParameterInput
			ref="param"
			:input-size="inputSize"
			:parameter="parameter"
			:model-value="modelValue"
			:path="path"
			:is-read-only="isReadOnly"
			:is-assignment="isAssignment"
			:droppable="droppable"
			:active-drop="activeDrop"
			:force-show-expression="forceShowExpression"
			:hide-issues="hideIssues"
			:documentation-url="documentationUrl"
			:error-highlight="errorHighlight"
			:is-for-credential="isForCredential"
			:event-source="eventSource"
			:expression-evaluated="resolvedExpression"
			:additional-expression-data="resolvedAdditionalExpressionData"
			:label="label"
			:rows="rows"
			:data-test-id="`parameter-input-${parsedParameterName}`"
			:event-bus="eventBus"
			:can-be-overridden="canBeOverridden"
			@focus="onFocus"
			@blur="onBlur"
			@drop="onDrop"
			@text-input="onTextInput"
			@update="onValueChanged"
		>
			<template #overrideButton>
				<slot v-if="$slots.overrideButton" name="overrideButton" />
			</template>
		</ParameterInput>
		<div v-if="!hideHint && (resolvedExpressionString || parameterHint)" :class="$style.hint">
			<div>
				<InputHint
					v-if="resolvedExpressionString"
					:class="{ [$style.hint]: true, 'ph-no-capture': isForCredential }"
					:data-test-id="`parameter-expression-preview-${parsedParameterName}`"
					:highlight="!!(resolvedExpressionString && targetItem) && isInputParentOfActiveNode"
					:hint="resolvedExpressionString"
					:single-line="true"
				/>
				<InputHint v-else-if="parameterHint" :render-h-t-m-l="true" :hint="parameterHint" />
			</div>
			<slot v-if="$slots.options" name="options" />
		</div>
	</div>
</template>

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
