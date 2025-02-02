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
	type Result,
} from 'n8n-workflow';

import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { stringifyExpressionResult } from '@/utils/expressions';
import { isValueExpression, parseResourceMapperFieldName } from '@/utils/nodeTypesUtils';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';

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

const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });

const ndvStore = useNDVStore();
const externalSecretsStore = useExternalSecretsStore();
const environmentsStore = useEnvironmentsStore();

const isExpression = computed(() => {
	return isValueExpression(props.parameter, props.modelValue);
});

const activeNode = computed(() => ndvStore.activeNode);

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

const evaluatedExpression = computed<Result<unknown, Error>>(() => {
	const value = isResourceLocatorValue(props.modelValue)
		? props.modelValue.value
		: props.modelValue;

	if (!activeNode.value || !isExpression.value || typeof value !== 'string') {
		return { ok: false, error: new Error() };
	}

	try {
		let opts: Parameters<typeof workflowHelpers.resolveExpression>[2] = {
			isForCredential: props.isForCredential,
		};
		if (ndvStore.isInputParentOfActiveNode) {
			opts = {
				...opts,
				targetItem: targetItem.value ?? undefined,
				inputNodeName: ndvStore.ndvInputNodeName,
				inputRunIndex: ndvStore.ndvInputRunIndex,
				inputBranchIndex: ndvStore.ndvInputBranchIndex,
				additionalKeys: resolvedAdditionalExpressionData.value,
			};
		}

		if (props.isForCredential) opts.additionalKeys = resolvedAdditionalExpressionData.value;
		const stringifyObject = props.parameter.type !== 'multiOptions';
		return {
			ok: true,
			result: workflowHelpers.resolveExpression(value, undefined, opts, stringifyObject),
		};
	} catch (error) {
		return { ok: false, error };
	}
});

const evaluatedExpressionValue = computed(() => {
	const evaluated = evaluatedExpression.value;
	return evaluated.ok ? evaluated.result : null;
});

const evaluatedExpressionString = computed(() => {
	const hasRunData =
		!!useWorkflowsStore().workflowExecutionData?.data?.resultData?.runData[
			ndvStore.activeNode?.name ?? ''
		];
	return stringifyExpressionResult(evaluatedExpression.value, hasRunData);
});

const expressionOutput = computed(() => {
	if (isExpression.value && evaluatedExpressionString.value) {
		return evaluatedExpressionString.value;
	}

	return null;
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
			:expression-evaluated="evaluatedExpressionValue"
			:additional-expression-data="resolvedAdditionalExpressionData"
			:label="label"
			:rows="rows"
			:data-test-id="`parameter-input-${parsedParameterName}`"
			:event-bus="eventBus"
			@focus="onFocus"
			@blur="onBlur"
			@drop="onDrop"
			@text-input="onTextInput"
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
