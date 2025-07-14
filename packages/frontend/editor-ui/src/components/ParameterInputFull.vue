<script setup lang="ts">
import { computed, type ComputedRef, ref, useTemplateRef, watch } from 'vue';
import type { IUpdateInformation } from '@/Interface';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
import FromAiOverrideButton from '@/components/ParameterInputOverrides/FromAiOverrideButton.vue';
import FromAiOverrideField from '@/components/ParameterInputOverrides/FromAiOverrideField.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { getMappedResult } from '@/utils/mappingUtils';
import { hasExpressionMapping, hasOnlyListMode, isValueExpression } from '@/utils/nodeTypesUtils';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	isResourceLocatorValue,
	type INodeProperties,
	type IParameterLabel,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { N8nInputLabel } from '@n8n/design-system';
import {
	buildValueFromOverride,
	type FromAIOverride,
	isFromAIOverrideValue,
	makeOverrideValue,
	updateFromAIOverrideValues,
} from '../utils/fromAIOverrideUtils';
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
const telemetry = useTelemetry();

const activeNode = computed(() => ndvStore.activeNode);
const fromAIOverride = ref<FromAIOverride | null>(makeOverrideValue(props, activeNode.value));

const canBeContentOverride = computed(() => {
	// The resourceLocator handles overrides separately
	if (!activeNode.value || isResourceLocator.value) return false;

	return fromAIOverride.value !== null;
});

const isContentOverride = computed(
	() => canBeContentOverride.value && !!isFromAIOverrideValue(props.value?.toString() ?? ''),
);

const hint = computed(() =>
	i18n.nodeText(activeNode.value?.type).hint(props.parameter, props.path),
);

const isResourceLocator = computed(
	() => props.parameter.type === 'resourceLocator' || props.parameter.type === 'workflowSelector',
);
const isDropDisabled = computed(
	() =>
		props.parameter.noDataExpression ||
		props.isReadOnly ||
		isResourceLocator.value ||
		isExpression.value,
);
const isExpression = computed(() => isValueExpression(props.parameter, props.value));
const showExpressionSelector = computed(() => {
	if (isResourceLocator.value) {
		// The resourceLocator handles overrides itself, so we use this hack to
		// infer whether it's overridden and we should hide the toggle
		const value =
			props.value && typeof props.value === 'object' && 'value' in props.value && props.value.value;
		if (value && isFromAIOverrideValue(String(value))) {
			return false;
		}

		return !hasOnlyListMode(props.parameter);
	}

	return !isContentOverride.value;
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
	if (isContentOverride.value && command === 'resetValue') {
		removeOverride(true);
	}
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
		if (activeNode.value) {
			let parameterData;
			if (isResourceLocator.value) {
				if (!isResourceLocatorValue(props.value)) {
					parameterData = {
						node: activeNode.value.name,
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
						node: activeNode.value.name,
						name: props.path,
						value: { __rl: true, value: updatedValue, mode: mode ? mode.name : '' },
					};
				} else {
					parameterData = {
						node: activeNode.value.name,
						name: props.path,
						value: { __rl: true, value: updatedValue, mode: props.value?.mode },
					};
				}
			} else {
				parameterData = {
					node: activeNode.value.name,
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
				dest_node_type: activeNode.value.type,
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
	() => canBeContentOverride.value && !isContentOverride.value && !props.isReadOnly,
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
	if (!fromAIOverride.value) return;

	telemetry.track('User turned on fromAI override', {
		nodeType: activeNode.value?.type,
		parameter: props.path,
	});
	updateFromAIOverrideValues(fromAIOverride.value, String(props.value));
	const value = buildValueFromOverride(fromAIOverride.value, props, true);
	valueChanged({
		node: activeNode.value?.name,
		name: props.path,
		value,
	});
}

function removeOverride(clearField = false) {
	if (!fromAIOverride.value) return;

	telemetry.track('User turned off fromAI override', {
		nodeType: activeNode.value?.type,
		parameter: props.path,
	});
	valueChanged({
		node: activeNode.value?.name,
		name: props.path,
		value: clearField
			? props.parameter.default
			: buildValueFromOverride(fromAIOverride.value, props, false),
	});
	void setTimeout(async () => {
		await parameterInputWrapper.value?.focusInput();
		parameterInputWrapper.value?.selectInput();
	}, 0);
}
</script>

<template>
	<N8nInputLabel
		ref="inputLabel"
		:class="[$style.wrapper]"
		:label="hideLabel ? '' : i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
		:tooltip-text="
			hideLabel ? '' : i18n.nodeText(activeNode?.type).inputLabelDescription(parameter, path)
		"
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
			<div
				:class="[
					$style.noCornersBottom,
					$style.overrideButtonInOptions,
					{ [$style.overrideButtonIssueOffset]: parameterInputWrapper?.displaysIssues },
				]"
			>
				<FromAiOverrideButton @click="applyOverride" />
			</div>
		</template>

		<template v-if="displayOptions && optionsPosition === 'top'" #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnly"
				:show-options="displayOptions"
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
					v-if="fromAIOverride && isContentOverride"
					:is-read-only="isReadOnly"
					@close="removeOverride"
				/>
				<div v-else>
					<ParameterInputWrapper
						ref="parameterInputWrapper"
						:parameter="parameter"
						:model-value="value"
						:path="path"
						:is-read-only="isReadOnly"
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
				:is-read-only="isReadOnly"
				:show-options="displayOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</div>
		<ParameterOverrideSelectableList
			v-if="isContentOverride && fromAIOverride"
			v-model="fromAIOverride"
			:parameter="parameter"
			:path="path"
			:is-read-only="isReadOnly"
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
	margin-bottom: -2px;
}

.overrideButtonIssueOffset {
	right: 20px;
	// this is necessary to push the other options to the left
	margin-left: 20px;
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
