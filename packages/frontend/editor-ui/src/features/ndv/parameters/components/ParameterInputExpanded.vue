<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { isValueExpression as isValueExpressionUtil } from '@/app/utils/nodeTypesUtils';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	isINodePropertyCollection,
	type INodeParameterResourceLocator,
	type INodeParameters,
	type INodeProperties,
	type IParameterLabel,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { computed, defineAsyncComponent, ref } from 'vue';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import ParameterOptions from './ParameterOptions.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';

import { N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';

const LazyFixedCollectionParameter = defineAsyncComponent(
	async () => await import('./FixedCollection/FixedCollectionParameter.vue'),
);

type Props = {
	parameter: INodeProperties;
	value: NodeParameterValueType;
	nodeValues?: INodeParameters;
	showValidationWarnings?: boolean;
	documentationUrl?: string;
	eventSource?: string;
	label?: IParameterLabel;
};

const props = withDefaults(defineProps<Props>(), {
	label: () => ({ size: 'small' }),
	nodeValues: () => ({}),
	documentationUrl: undefined,
	eventSource: undefined,
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

const isFixedCollectionType = computed(() => {
	return props.parameter.type === 'fixedCollection';
});

const hiddenIssuesInputs = computed(() => {
	if (!isFixedCollectionType.value) {
		return [];
	}

	if (!props.parameter.options?.length) {
		return [];
	}

	const names = [];
	for (const option of props.parameter.options) {
		if (isINodePropertyCollection(option)) {
			names.push(...option.values.map((value) => value.name));
		}
	}

	return names;
});

const fixedCollectionValues = computed(() => {
	if (!isFixedCollectionType.value || !props.value) {
		return {};
	}

	return props.value as Record<string, INodeParameters[]>;
});

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
	let name = parameterData.name;
	// for fixed collection, we need to keep the full path
	if (!isFixedCollectionType.value) {
		name = name.split('.').pop() ?? name;
	}

	emit('update', {
		name,
		value: parameterData.value,
	});
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
	<div>
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
					:show-options="!isFixedCollectionType"
					:show-expression-selector="!isFixedCollectionType"
					:is-value-expression="isValueExpression"
					@update:model-value="optionSelected"
					@menu-expanded="onMenuExpanded"
				/>
			</template>
			<ParameterInputWrapper
				v-if="!isFixedCollectionType"
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
		<div
			v-if="isFixedCollectionType"
			class="fixed-collection-wrapper"
			data-test-id="fixed-collection-wrapper"
		>
			<LazyFixedCollectionParameter
				:parameter="parameter"
				:values="fixedCollectionValues"
				:node-values="nodeValues"
				:path="parameter.name"
				:hidden-issues-inputs="hiddenIssuesInputs"
				@value-changed="valueChanged"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.errors {
	margin-top: var(--spacing--2xs);
}
.hint {
	margin-top: var(--spacing--4xs);
}
</style>

<style lang="scss">
.fixed-collection-wrapper {
	.icon-button {
		position: absolute;
		opacity: 0;
		top: -3px;
		left: calc(-0.5 * var(--spacing--xs));
		transition: opacity 100ms ease-in;
		Button {
			color: var(--icon--color);
		}
	}
	.icon-button > Button:hover {
		color: var(--icon--color--hover);
	}
}
</style>
