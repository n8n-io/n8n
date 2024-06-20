<template>
	<n8n-input-label
		:class="[$style.wrapper, { [$style.tipVisible]: showDragnDropTip }]"
		:label="hideLabel ? '' : i18n.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltip-text="hideLabel ? '' : i18n.nodeText().inputLabelDescription(parameter, path)"
		:show-tooltip="focused"
		:show-options="menuExpanded || focused || forceShowExpression"
		:options-position="optionsPosition"
		:bold="false"
		:size="label.size"
		color="text-dark"
	>
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
			:sticky="true"
			:sticky-offset="isExpression ? [26, 3] : [3, 3]"
			@drop="onDrop"
		>
			<template #default="{ droppable, activeDrop }">
				<ParameterInputWrapper
					ref="param"
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
					input-size="small"
					@update="valueChanged"
					@text-input="onTextInput"
					@focus="onFocus"
					@blur="onBlur"
					@drop="onDrop"
				/>
			</template>
		</DraggableTarget>
		<div v-if="showDragnDropTip" :class="$style.tip">
			<InlineExpressionTip />
		</div>
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
	</n8n-input-label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { IUpdateInformation } from '@/Interface';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { useSegment } from '@/stores/segment.store';
import { getMappedResult } from '@/utils/mappingUtils';
import { hasExpressionMapping, hasOnlyListMode, isValueExpression } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import { createEventBus } from 'n8n-design-system/utils';
import type { INodeProperties, IParameterLabel, NodeParameterValueType } from 'n8n-workflow';
import InlineExpressionTip from './InlineExpressionEditor/InlineExpressionTip.vue';

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
	(event: 'blur'): void;
	(event: 'update', value: IUpdateInformation): void;
}>();

const i18n = useI18n();
const toast = useToast();

const eventBus = ref(createEventBus());
const focused = ref(false);
const menuExpanded = ref(false);
const forceShowExpression = ref(false);

const ndvStore = useNDVStore();

const node = computed(() => ndvStore.activeNode);
const hint = computed(() => i18n.nodeText().hint(props.parameter, props.path));
const isInputTypeString = computed(() => props.parameter.type === 'string');
const isInputTypeNumber = computed(() => props.parameter.type === 'number');
const isResourceLocator = computed(() => props.parameter.type === 'resourceLocator');
const isDropDisabled = computed(
	() => props.parameter.noDataExpression || props.isReadOnly || isResourceLocator.value,
);
const isExpression = computed(() => isValueExpression(props.parameter, props.value));
const showExpressionSelector = computed(() =>
	isResourceLocator.value ? !hasOnlyListMode(props.parameter) : true,
);
const isInputDataEmpty = computed(() => ndvStore.isNDVDataEmpty('input'));
const showDragnDropTip = computed(
	() =>
		focused.value &&
		(isInputTypeString.value || isInputTypeNumber.value) &&
		!isExpression.value &&
		!isDropDisabled.value &&
		(!ndvStore.hasInputData || !isInputDataEmpty.value) &&
		!ndvStore.isMappingOnboarded &&
		ndvStore.isInputParentOfActiveNode,
);

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
					dangerouslyUseHTMLString: true,
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

			const segment = useSegment();
			segment.track(segment.EVENTS.MAPPED_DATA);
		}
		forceShowExpression.value = false;
	}, 200);
}
</script>

<style lang="scss" module>
.wrapper {
	position: relative;

	&:hover {
		.options {
			opacity: 1;
		}
	}
}

.tipVisible {
	--input-border-bottom-left-radius: 0;
	--input-border-bottom-right-radius: 0;
}

.tip {
	position: absolute;
	z-index: 2;
	top: 100%;
	background: var(--color-code-background);
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
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
