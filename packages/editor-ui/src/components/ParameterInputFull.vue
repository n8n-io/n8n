<script setup lang="ts">
import { computed, ComputedRef, ref, useTemplateRef, watch } from 'vue';
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
import { N8nButton, N8nInputLabel } from 'n8n-design-system';
import AiStarsIcon from './AiStarsIcon.vue';
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

const eventBus = ref(createEventBus());
const focused = ref(false);
const menuExpanded = ref(false);
const forceShowExpression = ref(false);

const fromAiOverride = {
	overridePlaceholder: 'Defined automatically by the model',
	icon: 'plus',
	output: '={{ [marker] $fromAI([key], [type], [default], [description]) }}',
	providers: {
		marker: '/* n8n-auto-generated-override */',
		key: (props: Props) => props.parameter.name, // todo - need to check these
		type: (props: Props) => 'string', // todo - infer boolean, number and other matching types
	},
	extraProps: {
		description: {
			default: '',
			placeholder: 'Description of how the model should define this value',
		},
	},
};

function buildValueFromOverride(
	providedExtraProps: (typeof fromAiOverride)['extraProps'], // todo generic-ify
	includeMarker: boolean,
) {
	const {
		providers: { marker, key, type },
		extraProps,
	} = fromAiOverride;
	return `={{ ${includeMarker ? marker : ''} $fromAI('${key(props)}', '${providedExtraProps.description.default ?? extraProps.description}', '${type(props)}') }}`;
}

function isOverrideValue(s: string) {
	return s.startsWith('={{ /* n8n-auto-generated-override */ $fromAI(');
}

function parseOverrides(s: string) {
	/*
		Approaches:
		- Smart and boring: Reuse packages/core/src/CreateNodeAsTool.ts ; unclear where to move it
		- Fun and dangerous: Use eval, see below
	*/
	if (!isOverrideValue(s)) return null;

	const fromAI = (...args: unknown[]) => args;
	const fns = `const $fromAI = ${fromAI}; const $fromAi = ${fromAI}; const $fromai = ${fromAI};`;
	const cursor = '={{ /* n8n-auto-generated-override */ $fromAI('.length;
	const end = '}}'.length;
	// `eval?.` is an indirect evaluation, outside of local scope
	const params: unknown[] = eval?.(`${fns} ${s.slice(cursor, -end)}`) ?? [];
	console.log(fns, params);
	return {
		key: params[0] ?? '',
		description: params[1] ?? '',
		type: params[2] ?? undefined,
		// todo - parse the string to get the values
	};
}

const isContentOverride = computed(() => isOverrideValue(props.value?.toString() ?? ''));
const canBeContentOverride = computed(() =>
	node.value?.type === undefined
		? false
		: nodeTypesStore
				.getNodeType(node.value.type, node.value.typeVersion)
				?.codex?.categories?.includes('AI') &&
			(!props.parameter.noDataExpression || props.parameter.typeOptions?.editor !== undefined) &&
			props.parameter.type !== 'options',
);
// const canBeContentOverride = computed(() => getNodeTypeDescription().codex?.ai?.subcategories.contains('Tool'));

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();

const node = computed(() => ndvStore.activeNode);
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
		props.isReadOnly || props.parameter.disabledOptions !== undefined || isContentOverride.value,
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
	() => parameterInputWrapper.value?.isSingleLineInput ?? isSingleLineInput.value ?? false,
);
</script>

<template>
	<N8nInputLabel
		ref="inputLabel"
		:class="[$style.wrapper, { [$style.displayFlex]: canBeContentOverride }]"
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
			v-if="canBeContentOverride && !isSingleLineInput && optionsPosition === 'top'"
			#persistentOptions
		>
			<N8nButton
				:class="['n8n-input', $style.overrideButton, $style.cornersRight]"
				type="tertiary"
				@click="
					() => {
						valueChanged({
							name: props.path,
							value: buildValueFromOverride(fromAiOverride.extraProps, true),
						});
					}
				"
			>
				<AiStarsIcon />
			</N8nButton>
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
					<div :class="[$style['prepend-section'], 'el-input-group__prepend', $style.cornersLeft]">
						<AiStarsIcon />
					</div>
					<N8nInput
						:model-value="fromAiOverride.overridePlaceholder"
						disabled
						type="text"
						size="small"
					/>
					<!-- <ElInput class="n8n-input" size="small" disabled /> -->
					<N8nIconButton
						type="tertiary"
						:class="['n8n-input', $style.closeButton, $style.cornersRight]"
						outline="false"
						icon="xmark"
						size="xsmall"
						@click="
							() => {
								valueChanged({
									node: node?.name,
									name: props.path,
									value: buildValueFromOverride(fromAiOverride.extraProps, false),
								});
							}
						"
					/>
				</div>
				<div v-else :class="$style.displayFlex">
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
						input-size="small"
						@update="valueChanged"
						@text-input="onTextInput"
						@focus="onFocus"
						@blur="onBlur"
						@drop="onDrop"
					>
						<template #overrideButton>
							<N8nButton
								v-if="canBeContentOverride && isSingleLineInput"
								:class="['n8n-input', $style.overrideButton, $style.cornersRight]"
								type="tertiary"
								@click="
									() => {
										valueChanged({
											name: props.path,
											value: buildValueFromOverride(fromAiOverride.extraProps, true),
										});
									}
								"
							>
								<AiStarsIcon />
							</N8nButton>
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

.displayFlex {
	display: flex;
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
}

.overrideButton {
	display: flex;
	justify-content: center;
	align-self: start;
	flex-grow: 1;
	border: 0px;
	// height: 30px;
	width: 30px;
	background: var(--color-background-base);

	&:hover {
		background: var(--color-primary);
	}
}

.cornersLeft {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.cornersRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.prepend-section {
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
</style>
