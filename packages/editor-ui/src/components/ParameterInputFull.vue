<script setup lang="ts">
import { computed, type ComputedRef, ref, useTemplateRef, watch } from 'vue';
import type { IUpdateInformation } from '@/Interface';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
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
import { N8nButton, N8nInputLabel, N8nPillList, N8nTooltip } from 'n8n-design-system';
import AiStarsIcon from './AiStarsIcon.vue';
import { type ParameterOverride, makeOverrideValue } from '../utils/parameterOverrides';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

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

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();

const eventBus = ref(createEventBus());
const focused = ref(false);
const menuExpanded = ref(false);
const forceShowExpression = ref(false);

const node = computed(() => ndvStore.activeNode);
const parameterOverrides = ref<ParameterOverride | null>(
	makeOverrideValue(
		props,
		node.value && nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
	),
);

const isContentOverride = computed(() =>
	parameterOverrides.value?.isOverrideValue(props.value?.toString() ?? ''),
);
const canBeContentOverride = computed(() => {
	if (!node.value || isResourceLocator.value) return false;

	return parameterOverrides.value !== null;
});

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
			<N8nTooltip>
				<template #content>
					<div>{{ i18n.baseText('parameterOverride.applyOverrideButtonTooltip') }}</div>
				</template>

				<N8nButton
					:class="[$style.overrideButton, $style.noCornersBottom, $style.overrideButtonInOptions]"
					type="tertiary"
					@click="
						() => {
							valueChanged({
								name: props.path,
								value: parameterOverrides?.buildValueFromOverride(props, false),
							});
						}
					"
				>
					<AiStarsIcon />
				</N8nButton>
			</N8nTooltip>
		</template>

		<template v-if="displayOptions && optionsPosition === 'top'" #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnlyParameter"
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
				<div v-if="canBeContentOverride && isContentOverride" :class="$style.contentOverride">
					<div :class="[$style.iconStars, 'el-input-group__prepend', $style.noCornersRight]">
						<AiStarsIcon />
					</div>
					<N8nInput
						:model-value="parameterOverrides?.overridePlaceholder"
						:class="$style.overrideInput"
						disabled
						type="text"
						size="small"
					/>
					<N8nIconButton
						v-if="!isReadOnly"
						type="tertiary"
						:class="['n8n-input', $style.closeButton]"
						outline="false"
						icon="xmark"
						size="xsmall"
						@click="
							() => {
								valueChanged({
									node: node?.name,
									name: props.path,
									value: parameterOverrides?.buildValueFromOverride(props, true),
								});
							}
						"
					/>
				</div>
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
						:can-be-override="canBeContentOverride"
						input-size="small"
						@update="valueChanged"
						@text-input="onTextInput"
						@focus="onFocus"
						@blur="onBlur"
						@drop="onDrop"
					>
						<template v-if="showOverrideButton && isSingleLineInput" #overrideButton>
							<N8nTooltip>
								<template #content>
									<div>
										{{ i18n.baseText('parameterOverride.applyOverrideButtonTooltip') }}
									</div>
								</template>

								<N8nButton
									:class="[$style.overrideButton]"
									type="tertiary"
									@click="
										() => {
											valueChanged({
												name: props.path,
												value: parameterOverrides?.buildValueFromOverride(props, false),
											});
										}
									"
								>
									<AiStarsIcon />
								</N8nButton>
							</N8nTooltip>
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
				:show-options="displayOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</div>
		<N8nPillList
			v-if="isContentOverride && parameterOverrides"
			v-model="parameterOverrides.extraPropValues"
			:class="$style.overridePillList"
			:inputs="
				Object.entries(parameterOverrides.extraProps).map(([name, prop]) => ({
					name,
					...prop,
				}))
			"
			:disabled="isReadOnly"
		>
			<template #displayItem="{ name, tooltip, initialValue, type }">
				<ParameterInputFull
					:parameter="{
						name,
						displayName: name[0].toUpperCase() + name.slice(1),
						type,
						default: initialValue,
						noDataExpression: true,
						description: tooltip,
					}"
					:is-read-only="isReadOnly"
					:value="parameterOverrides?.extraPropValues[name]"
					:path="`${path}.tags.${name}`"
					input-size="small"
					@update="
						(x) => {
							if (parameterOverrides) parameterOverrides.extraPropValues[name] = x.value as never;
							valueChanged({
								name: props.path,
								value: parameterOverrides?.buildValueFromOverride(props, false),
							});
						}
					"
				/>
			</template>
		</N8nPillList>
	</N8nInputLabel>

	<!-- badges to add extra fields from overrides go here -->
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

.contentOverride {
	display: flex;
	gap: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	background: var(--color-background-base);
}

.closeButton {
	padding: 0px 8px 3px; // the icon used is off-center vertically
	border: 0px;
	color: var(--color-text-base);
}

.overrideButton {
	display: flex;
	justify-content: center;
	border: 0px;
	height: 30px;
	width: 30px;
	background: var(--color-background-base);

	&:hover {
		background: var(--color-secondary);
	}
}

.overrideButtonInOptions {
	position: relative;
	// To connect to input panel below the button
	top: 1px;
}

.noCornersRight {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.noCornersBottom {
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}

.iconStars {
	align-self: center;
	padding-left: 8px;
	width: 22px;
	text-align: center;
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

.overridePillList {
	margin-top: var(--spacing-2xs);
}
</style>
