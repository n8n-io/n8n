<script setup lang="ts">
import { computed, type ComputedRef, ref, useTemplateRef, watch } from 'vue';
import type { IUpdateInformation } from '@/Interface';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
import FromAiOverrideButton from '@/components/ParameterInputOverrides/FromAiOverrideButton.vue';
import FromAiOverrideField from '@/components/ParameterInputOverrides/FromAiOverrideField.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { getMappedResult } from '@/utils/mappingUtils';
import { hasExpressionMapping, hasOnlyListMode, isValueExpression } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import { createEventBus } from 'n8n-design-system/utils';
import {
	type INodeProperties,
	type IParameterLabel,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { N8nInputLabel } from 'n8n-design-system';
import {
	type ParameterOverride,
	makeOverrideValue,
} from './ParameterInputOverrides/parameterInputOverrides';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTelemetry } from '@/composables/useTelemetry';

type Props = {
	parameter: INodeProperties;
	path: string;
	value: NodeParameterValueType;
	label?: IParameterLabel;
	displayOptions?: boolean;
	optionsPosition?: 'bottom' | 'top';
	hideHint?: boolean;
	isReadOnly?: boolean;
	rows?: number;
	isAssignment?: boolean;
	hideLabel?: boolean;
	hideIssues?: boolean;
	entryIndex?: number;
};

const props = withDefaults(defineProps<Props>(), {
	optionsPosition: 'top',
	hideHint: false,
	isReadOnly: false,
	rows: 5,
	hideLabel: false,
	hideIssues: false,
	label: () => ({ size: 'small' }),
});
const emit = defineEmits<{
	blur: [];
	update: [value: IUpdateInformation];
}>();

const i18n = useI18n();
const toast = useToast();

const eventBus = ref(createEventBus());
const focused = ref(false);
const menuExpanded = ref(false);
const forceShowExpression = ref(false);

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();

const node = computed(() => ndvStore.activeNode);
const parameterOverrides = ref<ParameterOverride | null>(
	makeOverrideValue(
		props,
		node.value && nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
	),
);

const canBeContentOverride = computed(() => {
	if (!node.value || isResourceLocator.value) return false;

	return parameterOverrides.value !== null;
});

const isContentOverride = computed(
	() =>
		canBeContentOverride.value &&
		!!parameterOverrides.value?.isOverrideValue(props.value?.toString() ?? ''),
);

const hint = computed(() => i18n.nodeText().hint(props.parameter, props.path));

const isResourceLocator = computed(
	() => props.parameter.type === 'resourceLocator' || props.parameter.type === 'workflowSelector',
);
const isDropDisabled = computed(
	() =>
		props.parameter.noDataExpression ||
		isReadOnlyParameter.value ||
		isResourceLocator.value ||
		isExpression.value,
);
const isExpression = computed(() => isValueExpression(props.parameter, props.value));
const showExpressionSelector = computed(() =>
	!isContentOverride.value && isResourceLocator.value ? !hasOnlyListMode(props.parameter) : true,
);

const isReadOnlyParameter = computed(
	() =>
		props.isReadOnly || props.parameter.disabledOptions !== undefined || !!isContentOverride.value,
);

const showOptions = computed(() => {
	if (isResourceLocator.value) {
		// The resourceLocator handles overrides itself, so we use this hack to
		// infer whether it's overridden and we should hide the options
		const value =
			props.value && typeof props.value === 'object' && 'value' in props.value && props.value.value;
		if (
			value &&
			makeOverrideValue(
				props,
				node.value && nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
			)?.isOverrideValue(String(value))
		) {
			return false;
		}
	}

	return props.displayOptions;
});

function onFocus() {
	focused.value = true;
	if (!props.parameter.noDataExpression) {
		ndvStore.setMappableNDVInputFocus(props.parameter.displayName);
	}
	ndvStore.setFocusedInputPath(props.path ?? '');
}

function onBlur() {
	focused.value = false;
	if (
		!props.parameter.noDataExpression &&
		ndvStore.focusedMappableInput === props.parameter.displayName
	) {
		ndvStore.setMappableNDVInputFocus('');
	}
	ndvStore.setFocusedInputPath('');
	emit('blur');
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

function onTextInput(parameterData: IUpdateInformation) {
	if (isValueExpression(props.parameter, parameterData.value)) {
		eventBus.value.emit('optionSelected', 'addExpression');
	}
}

function onDrop(newParamValue: string) {
	const value = props.value;
	const updatedValue = getMappedResult(props.parameter, newParamValue, value);
	const prevValue = isResourceLocator.value && isResourceLocatorValue(value) ? value.value : value;

	if (updatedValue.startsWith('=')) {
		forceShowExpression.value = true;
	}
	setTimeout(() => {
		if (node.value) {
			let parameterData;
			if (isResourceLocator.value) {
				if (!isResourceLocatorValue(props.value)) {
					parameterData = {
						node: node.value.name,
						name: props.path,
						value: { __rl: true, value: updatedValue, mode: '' },
					};
				} else if (
					props.value.mode === 'list' &&
					props.parameter.modes &&
					props.parameter.modes.length > 1
				) {
					let mode = props.parameter.modes.find((m) => m.name === 'id') ?? null;
					if (!mode) {
						mode = props.parameter.modes.filter((m) => m.name !== 'list')[0];
					}

					parameterData = {
						node: node.value.name,
						name: props.path,
						value: { __rl: true, value: updatedValue, mode: mode ? mode.name : '' },
					};
				} else {
					parameterData = {
						node: node.value.name,
						name: props.path,
						value: { __rl: true, value: updatedValue, mode: props.value?.mode },
					};
				}
			} else {
				parameterData = {
					node: node.value.name,
					name: props.path,
					value: updatedValue,
				};
			}

			valueChanged(parameterData);
			eventBus.value.emit('drop', updatedValue);

			if (!ndvStore.isMappingOnboarded) {
				toast.showMessage({
					title: i18n.baseText('dataMapping.success.title'),
					message: i18n.baseText('dataMapping.success.moreInfo'),
					type: 'success',
				});

				ndvStore.setMappingOnboarded();
			}

			ndvStore.setMappingTelemetry({
				dest_node_type: node.value.type,
				dest_parameter: props.path,
				dest_parameter_mode:
					typeof prevValue === 'string' && prevValue.startsWith('=') ? 'expression' : 'fixed',
				dest_parameter_empty: prevValue === '' || prevValue === undefined,
				dest_parameter_had_mapping:
					typeof prevValue === 'string' &&
					prevValue.startsWith('=') &&
					hasExpressionMapping(prevValue),
				success: true,
			});
		}
		forceShowExpression.value = false;
	}, 200);
}

const showOverrideButton = computed(
	() => canBeContentOverride.value && !isContentOverride.value && !isReadOnlyParameter.value,
);

// When switching to read-only mode, reset the value to the default value
watch(
	() => props.isReadOnly,
	(isReadOnly) => {
		// Patch fix, see https://linear.app/n8n/issue/ADO-2974/resource-mapper-values-are-emptied-when-refreshing-the-columns
		if (isReadOnly && props.parameter.disabledOptions !== undefined) {
			valueChanged({ name: props.path, value: props.parameter.default });
		}
	},
);

const parameterInputWrapper = useTemplateRef('parameterInputWrapper');
const isSingleLineInput: ComputedRef<boolean> = computed(
	() => parameterInputWrapper.value?.isSingleLineInput ?? false,
);

function applyOverride() {
	telemetry.track(
		'User turned on fromAI override',
		{
			nodeType: node.value?.type,
			parameter: props.path,
		},
		{ withPostHog: true },
	);
	parameterOverrides.value?.updateExtraPropValues(props.value?.toString() ?? '');
	const value = parameterOverrides.value?.buildValueFromOverride(props, true);
	valueChanged({
		name: props.path,
		value,
	});
}

function removeOverride() {
	telemetry.track(
		'User turned off fromAI override',
		{
			nodeType: node.value?.type,
			parameter: props.path,
		},
		{ withPostHog: true },
	);
	valueChanged({
		node: node.value?.name,
		name: props.path,
		value: parameterOverrides.value?.buildValueFromOverride(props, false),
	});
}
</script>

<template>
	<N8nInputLabel
		ref="inputLabel"
		:class="[$style.wrapper]"
		:label="hideLabel ? '' : i18n.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltip-text="hideLabel ? '' : i18n.nodeText().inputLabelDescription(parameter, path)"
		:show-tooltip="focused"
		:show-options="menuExpanded || focused || forceShowExpression"
		:options-position="optionsPosition"
		:bold="false"
		:size="label.size"
		color="text-dark"
	>
		<template
			v-if="showOverrideButton && !isSingleLineInput && optionsPosition === 'top'"
			#persistentOptions
		>
			<div :class="[$style.noCornersBottom, $style.overrideButtonInOptions]">
				<FromAiOverrideButton @click="applyOverride" />
			</div>
		</template>

		<template v-if="showOptions && optionsPosition === 'top'" #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnlyParameter"
				:show-options="showOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<DraggableTarget
			type="mapping"
			:disabled="isDropDisabled"
			sticky
			:sticky-offset="[3, 3]"
			@drop="onDrop"
		>
			<template #default="{ droppable, activeDrop }">
				<FromAiOverrideField
					v-if="parameterOverrides && isContentOverride"
					:text="parameterOverrides?.overridePlaceholder"
					@close="removeOverride"
				/>
				<div v-else>
					<ParameterInputWrapper
						ref="parameterInputWrapper"
						:parameter="parameter"
						:model-value="value"
						:path="path"
						:is-read-only="isReadOnlyParameter"
						:is-assignment="isAssignment"
						:rows="rows"
						:droppable="droppable"
						:active-drop="activeDrop"
						:force-show-expression="forceShowExpression"
						:hint="hint"
						:hide-hint="hideHint"
						:hide-issues="hideIssues"
						:label="label"
						:event-bus="eventBus"
						:can-be-overridden="canBeContentOverride"
						input-size="small"
						@update="valueChanged"
						@text-input="onTextInput"
						@focus="onFocus"
						@blur="onBlur"
						@drop="onDrop"
					>
						<template v-if="showOverrideButton && isSingleLineInput" #overrideButton>
							<FromAiOverrideButton @click="applyOverride" />
						</template>
					</ParameterInputWrapper>
				</div>
			</template>
		</DraggableTarget>
		<div
			:class="{
				[$style.options]: true,
				[$style.visible]: menuExpanded || focused || forceShowExpression,
			}"
		>
			<ParameterOptions
				v-if="optionsPosition === 'bottom'"
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnlyParameter"
				:show-options="showOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</div>
		<ParameterOverrideSelectableList
			v-if="isContentOverride && parameterOverrides"
			v-model="parameterOverrides"
			:parameter="parameter"
			:path="path"
			:read-only="isReadOnly"
			@update="valueChanged"
		/>
	</N8nInputLabel>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;

	&:hover {
		.options {
			opacity: 1;
		}
	}
}

.overrideButtonInOptions {
	position: relative;
	// To connect to input panel below the button
	top: 1px;
}

.noCornersBottom > button {
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}

.options {
	position: absolute;
	bottom: -22px;
	right: 0;
	z-index: 1;
	opacity: 0;
	transition: opacity 100ms ease-in;

	&.visible {
		opacity: 1;
	}
}
</style>
