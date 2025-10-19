<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isValueExpression as isValueExpressionUtil } from '@/utils/nodeTypesUtils';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	INodeParameterResourceLocator,
	INodeProperties,
	IParameterLabel,
	NodeParameterValueType,
} from 'n8n-workflow';
import { computed, ref } from 'vue';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import ParameterOptions from './ParameterOptions.vue';
import { useUIStore } from '@/stores/ui.store';
import { storeToRefs } from 'pinia';

import { N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';
type Props = {
	parameter: INodeProperties;
	value: NodeParameterValueType;
	showValidationWarnings?: boolean;
	documentationUrl?: string;
	eventSource?: string;
	label?: IParameterLabel;
};

const props = withDefaults(defineProps<Props>(), {
	label: () => ({ size: 'small' }),
});
const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

const focused = ref(false);
const blurredEver = ref(false);
const menuExpanded = ref(false);
const eventBus = ref(createEventBus());
const uiStore = useUIStore();

const workflowsStore = useWorkflowsStore();

const i18n = useI18n();
const telemetry = useTelemetry();

const { activeCredentialType } = storeToRefs(uiStore);

const showRequiredErrors = computed(() => {
	if (!props.parameter.required) {
		return false;
	}

	if (blurredEver.value || props.showValidationWarnings) {
		if (props.parameter.type === 'string') {
			return !props.value;
		}

		if (props.parameter.type === 'number') {
			if (typeof props.value === 'string' && props.value.startsWith('=')) {
				return false;
			}

			return typeof props.value !== 'number';
		}
	}

	return false;
});

const hint = computed(() => {
	if (isValueExpression.value) {
		return null;
	}

	return i18n.credText(activeCredentialType.value).hint(props.parameter);
});

const isValueExpression = computed(() => {
	return isValueExpressionUtil(
		props.parameter,
		props.value as string | INodeParameterResourceLocator,
	);
});

function onFocus() {
	focused.value = true;
}

function onBlur() {
	blurredEver.value = true;
	focused.value = false;
}

function onMenuExpanded(expanded: boolean) {
	menuExpanded.value = expanded;
}

function optionSelected(command: string) {
	eventBus.value.emit('optionSelected', command);
}

function valueChanged(parameterData: IUpdateInformation) {
	emit('update', parameterData);
}

function onDocumentationUrlClick(): void {
	telemetry.track('User clicked credential modal docs link', {
		docs_link: props.documentationUrl,
		source: 'field',
		workflow_id: workflowsStore.workflowId,
	});
}
</script>

<template>
	<N8nInputLabel
		:label="i18n.credText(activeCredentialType).inputLabelDisplayName(parameter)"
		:tooltip-text="i18n.credText(activeCredentialType).inputLabelDescription(parameter)"
		:required="parameter.required"
		:show-tooltip="focused"
		:show-options="menuExpanded"
		:data-test-id="parameter.name"
		:size="label.size"
	>
		<template #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="false"
				:show-options="true"
				:is-value-expression="isValueExpression"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<ParameterInputWrapper
			ref="param"
			input-size="large"
			:parameter="parameter"
			:model-value="value"
			:path="parameter.name"
			:hide-issues="true"
			:documentation-url="documentationUrl"
			:error-highlight="showRequiredErrors"
			:is-for-credential="true"
			:event-source="eventSource"
			:hint="!showRequiredErrors && hint ? hint : ''"
			:event-bus="eventBus"
			@focus="onFocus"
			@blur="onBlur"
			@text-input="valueChanged"
			@update="valueChanged"
		/>
		<div v-if="showRequiredErrors" :class="$style.errors">
			<N8nText color="danger" size="small">
				{{ i18n.baseText('parameterInputExpanded.thisFieldIsRequired') }}
				<N8nLink
					v-if="documentationUrl"
					:to="documentationUrl"
					size="small"
					:underline="true"
					@click="onDocumentationUrlClick"
				>
					{{ i18n.baseText('parameterInputExpanded.openDocs') }}
				</N8nLink>
			</N8nText>
		</div>
	</N8nInputLabel>
</template>

<style lang="scss" module>
.errors {
	margin-top: var(--spacing--2xs);
}
.hint {
	margin-top: var(--spacing--4xs);
}
</style>
