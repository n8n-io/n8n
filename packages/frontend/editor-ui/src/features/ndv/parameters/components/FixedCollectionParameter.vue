<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';

import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';
import { deepCopy, isINodePropertyCollectionList } from 'n8n-workflow';

import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

import { computed, ref, watch, onBeforeMount } from 'vue';
import { useI18n } from '@n8n/i18n';
import ParameterInputList from './ParameterInputList.vue';
import Draggable from 'vuedraggable';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { telemetry } from '@/app/plugins/telemetry';
import { storeToRefs } from 'pinia';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';

import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
const locale = useI18n();
const nodeHelpers = useNodeHelpers();

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[]>;
	isReadOnly?: boolean;
	hiddenIssuesInputs?: string[];
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	isReadOnly: false,
	hiddenIssuesInputs: () => [],
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
}>();

const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const { activeNode } = storeToRefs(ndvStore);

const getPlaceholderText = computed(() => {
	const placeholder = locale
		.nodeText(activeNode.value?.type)
		.placeholder(props.parameter, props.path);
	return placeholder ? placeholder : locale.baseText('fixedCollectionParameter.choose');
});
const mutableValues = ref({} as Record<string, INodeParameters[]>);
const selectedOption = ref<string | null | undefined>(null);
const propertyNames = computed(() => {
	return new Set(Object.keys(mutableValues.value || {}));
});
const getProperties = computed(() => {
	const returnProperties = [];
	let tempProperties;
	for (const name of propertyNames.value) {
		tempProperties = getOptionProperties(name);
		if (tempProperties !== undefined) {
			returnProperties.push(tempProperties);
		}
	}
	return returnProperties;
});
const multipleValues = computed(() => {
	return !!props.parameter.typeOptions?.multipleValues;
});
const addedOptionalValues = ref(new Map<string, Set<string>>());
const parameterOptions = computed(() => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return [];

	if (multipleValues.value) {
		return props.parameter.options;
	}

	return (props.parameter.options ?? []).filter((option) => {
		return !propertyNames.value.has(option.name);
	});
});

const sortable = computed(() => {
	return !!props.parameter.typeOptions?.sortable;
});

const hideOptionalFields = computed(() => {
	return !!props.parameter.typeOptions?.hideOptionalFields;
});

const addOptionalFieldButtonText = computed(() => {
	if (!props.parameter.typeOptions?.addOptionalFieldButtonText) {
		return locale.baseText('fixedCollectionParameter.addField');
	}
	return locale.nodeText(activeNode.value?.type).addOptionalFieldButtonText(props.parameter);
});

const getOptionalValuesKey = (propertyName: string, index?: number): string => {
	return index !== undefined ? `${propertyName}-${index}` : propertyName;
};

const hasNonDefaultValue = (
	propertyDef: INodeProperties,
	itemValues: INodeParameters | undefined,
): boolean => {
	if (!itemValues) return false;
	const value = itemValues[propertyDef.name];
	if (value === undefined || value === null) return false;
	if (typeof value === 'string' && value === '') return false;
	if (typeof value === 'object') {
		return !isEqual(value, propertyDef.default);
	}
	return value !== propertyDef.default;
};

const initializeAddedOptionalValues = () => {
	if (!hideOptionalFields.value) return;
	if (!isINodePropertyCollectionList(props.parameter.options)) return;

	addedOptionalValues.value.clear();

	for (const property of props.parameter.options) {
		const propertyPath = `${props.path}.${property.name}`;
		const propertyValues = get(props.nodeValues, propertyPath) as
			| INodeParameters[]
			| INodeParameters
			| undefined;

		if (!propertyValues) continue;

		const optionalValueDefs = property.values.filter(
			(v) => v.required !== true && v.type !== 'notice',
		);

		if (multipleValues.value && Array.isArray(propertyValues)) {
			propertyValues.forEach((itemValues, index) => {
				const key = getOptionalValuesKey(property.name, index);
				const addedValues = new Set<string>();

				for (const valueDef of optionalValueDefs) {
					if (hasNonDefaultValue(valueDef, itemValues)) {
						addedValues.add(valueDef.name);
					}
				}

				if (addedValues.size > 0) {
					addedOptionalValues.value.set(key, addedValues);
				}
			});
		} else if (typeof propertyValues === 'object' && !Array.isArray(propertyValues)) {
			const key = getOptionalValuesKey(property.name);
			const addedValues = new Set<string>();

			for (const valueDef of optionalValueDefs) {
				if (hasNonDefaultValue(valueDef, propertyValues)) {
					addedValues.add(valueDef.name);
				}
			}

			if (addedValues.size > 0) {
				addedOptionalValues.value.set(key, addedValues);
			}
		}
	}
};

const isOptionalValueAdded = (propertyName: string, valueName: string, index?: number): boolean => {
	const key = getOptionalValuesKey(propertyName, index);
	return addedOptionalValues.value.get(key)?.has(valueName) ?? false;
};

const getVisiblePropertyValues = (
	property: INodePropertyCollection,
	index?: number,
): INodeProperties[] => {
	if (!hideOptionalFields.value) {
		return property.values;
	}

	const key = getOptionalValuesKey(property.name, index);
	const addedValues = addedOptionalValues.value.get(key);

	return property.values.filter((value) => {
		// Always show required values
		if (value.required === true) {
			return true;
		}

		// Always show notice values - they're informational, not input properties
		if (value.type === 'notice') {
			return true;
		}

		// Show optional values if explicitly added via picker
		if (addedValues?.has(value.name)) {
			return true;
		}

		// Show fields marked with showEvenWhenOptional
		if (value.typeOptions?.showEvenWhenOptional) {
			return true;
		}

		return false;
	});
};

const getPickerPropertyValues = (
	property: INodePropertyCollection,
	index?: number,
): INodeProperties[] => {
	if (!hideOptionalFields.value) {
		return [];
	}

	const itemPath = getPropertyPath(property.name, index);

	return property.values.filter((value) => {
		// Only include non-required values
		if (value.required === true) {
			return false;
		}

		// Exclude notice types - they're just display messages, not input properties
		if (value.type === 'notice') {
			return false;
		}

		// Exclude fields with showEvenWhenOptional - they appear without the picker
		if (value.typeOptions?.showEvenWhenOptional) {
			return false;
		}

		// Use the existing displayParameter helper from node-helpers to check visibility
		return nodeHelpers.displayParameter(props.nodeValues, value, itemPath, activeNode.value);
	});
};

const toggleOptionalValue = (
	property: INodePropertyCollection,
	valueName: string,
	index?: number,
) => {
	const key = getOptionalValuesKey(property.name, index);
	let valueSet = addedOptionalValues.value.get(key);

	if (!valueSet) {
		valueSet = new Set();
		addedOptionalValues.value.set(key, valueSet);
	}

	const valueDef = property.values.find((v) => v.name === valueName);
	if (!valueDef) return;

	const isCurrentlyAdded = valueSet.has(valueName);

	if (isCurrentlyAdded) {
		// Remove the value - clear it
		valueSet.delete(valueName);
	} else {
		// Add the value - set default
		valueSet.add(valueName);
	}

	// Re-set Map entry to trigger Vue reactivity after Set mutation
	addedOptionalValues.value.set(key, valueSet);

	const path = getPropertyPath(property.name, index) + `.${valueName}`;
	emit('valueChanged', {
		name: path,
		value: isCurrentlyAdded ? undefined : deepCopy(valueDef.default),
	});
};

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[]>) => {
		mutableValues.value = deepCopy(newValues);
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
	initializeAddedOptionalValues();
});

const deleteOption = (optionName: string, index?: number) => {
	const currentOptionsOfSameType = mutableValues.value[optionName];
	if (!currentOptionsOfSameType || currentOptionsOfSameType.length > 1) {
		// it's not the only option of this type, so just remove it.
		emit('valueChanged', {
			name: getPropertyPath(optionName, index),
			value: undefined,
		});
	} else {
		// it's the only option, so remove the whole type
		emit('valueChanged', {
			name: getPropertyPath(optionName),
			value: undefined,
		});
	}
};

const getPropertyPath = (name: string, index?: number) => {
	return `${props.path}.${name}` + (index !== undefined ? `[${index}]` : '');
};

const getOptionProperties = (optionName: string) => {
	if (isINodePropertyCollectionList(props.parameter.options)) {
		for (const option of props.parameter.options) {
			if (option.name === optionName) {
				return option;
			}
		}
	}
	return undefined;
};

const onAddButtonClick = (optionName: string) => {
	optionSelected(optionName);
	if (props.parameter.name === 'workflowInputs') {
		trackWorkflowInputFieldAdded();
	}
};

const optionSelected = (optionName: string) => {
	const option = getOptionProperties(optionName);
	if (option === undefined) {
		return;
	}
	const name = `${props.path}.${option.name}`;

	const newParameterValue: INodeParameters = {};

	for (const optionParameter of option.values) {
		if (
			optionParameter.type === 'fixedCollection' &&
			optionParameter.typeOptions !== undefined &&
			optionParameter.typeOptions.multipleValues === true
		) {
			newParameterValue[optionParameter.name] = {};
		} else if (
			optionParameter.typeOptions !== undefined &&
			optionParameter.typeOptions.multipleValues === true
		) {
			// Multiple values are allowed so append option to array
			const multiValue = get(props.nodeValues, [props.path, optionParameter.name], []);

			if (Array.isArray(optionParameter.default)) {
				multiValue.push(...deepCopy(optionParameter.default));
			} else if (optionParameter.default !== '' && typeof optionParameter.default !== 'object') {
				multiValue.push(deepCopy(optionParameter.default));
			}

			newParameterValue[optionParameter.name] = multiValue;
		} else {
			// Add a new option
			newParameterValue[optionParameter.name] = deepCopy(optionParameter.default);
		}
	}

	let newValue: NodeParameterValueType;
	if (multipleValues.value) {
		newValue = get(props.nodeValues, name, []) as INodeParameters[];

		newValue.push(newParameterValue);
	} else {
		newValue = newParameterValue;
	}

	const parameterData = {
		name,
		value: newValue,
	};

	emit('valueChanged', parameterData);
	selectedOption.value = undefined;
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
	if (props.parameter.name === 'workflowInputs') {
		trackWorkflowInputFieldTypeChange(parameterData);
	}
};
const onDragChange = (optionName: string) => {
	const parameterData: ValueChangedEvent = {
		name: getPropertyPath(optionName),
		value: mutableValues.value[optionName],
		type: 'optionsOrderChanged',
	};

	emit('valueChanged', parameterData);
};

const trackWorkflowInputFieldTypeChange = (parameterData: IUpdateInformation) => {
	telemetry.track('User changed workflow input field type', {
		type: parameterData.value,
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const trackWorkflowInputFieldAdded = () => {
	telemetry.track('User added workflow input field', {
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

function getItemKey(item: INodeParameters, property: INodePropertyCollection) {
	return mutableValues.value[property.name]?.indexOf(item) ?? -1;
}
</script>

<template>
	<div
		class="fixed-collection-parameter"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<div v-if="getProperties.length === 0" class="no-items-exist">
			<N8nText size="small">{{
				locale.baseText('fixedCollectionParameter.currentlyNoItemsExist')
			}}</N8nText>
		</div>

		<div
			v-for="property in getProperties"
			:key="property.name"
			class="fixed-collection-parameter-property"
		>
			<N8nInputLabel
				v-if="property.displayName !== '' && parameter.options && parameter.options.length !== 1"
				:label="locale.nodeText(activeNode?.type).inputLabelDisplayName(property, path)"
				:underline="true"
				size="small"
				color="text-dark"
			/>
			<div v-if="multipleValues">
				<Draggable
					v-model="mutableValues[property.name]"
					:item-key="(item: INodeParameters) => getItemKey(item, property)"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@change="onDragChange(property.name)"
				>
					<template #item="{ index }">
						<div :key="property.name + '-' + index" class="parameter-item">
							<div
								:class="
									index ? 'border-top-dashed parameter-item-wrapper ' : 'parameter-item-wrapper'
								"
							>
								<div v-if="!isReadOnly" class="icon-button default-top-padding">
									<N8nIconButton
										v-if="sortable"
										type="tertiary"
										text
										size="small"
										icon="grip-vertical"
										:title="locale.baseText('fixedCollectionParameter.dragItem')"
										class="drag-handle"
									/>
								</div>
								<div v-if="!isReadOnly" class="icon-button extra-top-padding">
									<N8nIconButton
										type="tertiary"
										text
										size="small"
										icon="trash-2"
										data-test-id="fixed-collection-delete"
										:title="locale.baseText('fixedCollectionParameter.deleteItem')"
										@click="deleteOption(property.name, index)"
									/>
								</div>
								<Suspense>
									<ParameterInputList
										:parameters="getVisiblePropertyValues(property, index)"
										:node-values="nodeValues"
										:path="getPropertyPath(property.name, index)"
										:hide-delete="true"
										:is-read-only="isReadOnly"
										:hidden-issues-inputs="hiddenIssuesInputs"
										@value-changed="valueChanged"
									/>
								</Suspense>
								<div
									v-if="getPickerPropertyValues(property, index).length > 0 && !isReadOnly"
									class="optional-values-picker add-option"
									data-test-id="fixed-collection-add-property"
								>
									<N8nSelect
										:placeholder="addOptionalFieldButtonText"
										size="small"
										filterable
										:model-value="null"
										@update:model-value="
											(valueName: string) => toggleOptionalValue(property, valueName, index)
										"
									>
										<N8nOption
											v-for="value in getPickerPropertyValues(property, index)"
											:key="value.name"
											:label="value.displayName || value.name"
											:value="value.name"
										>
											<div class="optional-value-item">
												<span>{{ value.displayName || value.name }}</span>
												<N8nIcon
													v-if="isOptionalValueAdded(property.name, value.name, index)"
													icon="check"
													size="medium"
												/>
											</div>
										</N8nOption>
									</N8nSelect>
								</div>
							</div>
						</div>
					</template>
				</Draggable>
			</div>
			<div v-else class="parameter-item">
				<div class="parameter-item-wrapper">
					<div v-if="!isReadOnly" class="icon-button">
						<N8nIconButton
							type="tertiary"
							text
							size="small"
							icon="trash-2"
							data-test-id="fixed-collection-delete"
							:title="locale.baseText('fixedCollectionParameter.deleteItem')"
							@click="deleteOption(property.name)"
						></N8nIconButton>
					</div>
					<ParameterInputList
						:parameters="getVisiblePropertyValues(property)"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						class="parameter-item"
						:hide-delete="true"
						:hidden-issues-inputs="hiddenIssuesInputs"
						@value-changed="valueChanged"
					/>
					<div
						v-if="getPickerPropertyValues(property).length > 0 && !isReadOnly"
						class="optional-values-picker add-option"
						data-test-id="fixed-collection-add-property"
					>
						<N8nSelect
							:placeholder="addOptionalFieldButtonText"
							size="small"
							filterable
							:model-value="null"
							@update:model-value="(valueName: string) => toggleOptionalValue(property, valueName)"
						>
							<N8nOption
								v-for="value in getPickerPropertyValues(property)"
								:key="value.name"
								:label="value.displayName || value.name"
								:value="value.name"
							>
								<div class="optional-value-item">
									<span>{{ value.displayName || value.name }}</span>
									<N8nIcon
										v-if="isOptionalValueAdded(property.name, value.name)"
										icon="check"
										size="medium"
									/>
								</div>
							</N8nOption>
						</N8nSelect>
					</div>
				</div>
			</div>
		</div>

		<div v-if="parameterOptions.length > 0 && !isReadOnly" class="controls">
			<N8nButton
				v-if="parameter.options && parameter.options.length === 1"
				type="tertiary"
				block
				data-test-id="fixed-collection-add"
				:label="getPlaceholderText"
				@click="onAddButtonClick(parameter.options[0].name)"
			/>
			<div v-else class="add-option">
				<N8nSelect
					v-model="selectedOption"
					:placeholder="getPlaceholderText"
					size="small"
					filterable
					@update:model-value="optionSelected"
				>
					<N8nOption
						v-for="item in parameterOptions"
						:key="item.name"
						:label="
							locale.nodeText(activeNode?.type).collectionOptionDisplayName(parameter, item, path)
						"
						:value="item.name"
					></N8nOption>
				</N8nSelect>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.fixed-collection-parameter {
	padding-left: var(--spacing--sm);

	.icon-button {
		display: flex;
		flex-direction: column;
	}

	.optional-values-picker {
		margin-top: var(--spacing--xs);
		margin-bottom: var(--spacing--xs);
	}

	:global(.optional-value-item) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.controls {
		:deep(.button) {
			font-weight: var(--font-weight--regular);
			--button--color--text: var(--color--text--shade-1);
			--button--border-color: var(--color--foreground);
			--button--color--background: var(--color--background);

			--button--color--text--hover: var(--color--text--shade-1);
			--button--border-color--hover: var(--color--foreground);
			--button--color--background--hover: var(--color--background);

			--button--color--text--active: var(--color--text--shade-1);
			--button--border-color--active: var(--color--foreground);
			--button--color--background--active: var(--color--background);

			--button--color--text--focus: var(--color--text--shade-1);
			--button--border-color--focus: var(--color--foreground);
			--button--color--background--focus: var(--color--background);

			&:active,
			&.active,
			&:focus {
				outline: none;
			}
		}
	}
}

.fixed-collection-parameter-property {
	margin: var(--spacing--xs) 0;
	margin-bottom: 0;
}

.parameter-item:hover > .parameter-item-wrapper > .icon-button {
	opacity: 1;
}

.parameter-item {
	position: relative;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);

	+ .parameter-item {
		.parameter-item-wrapper {
			.default-top-padding {
				top: calc(1.2 * var(--spacing--sm));
			}
			.extra-top-padding {
				top: calc(2.2 * var(--spacing--sm));
			}
		}
	}
}

.parameter-item:first-of-type {
	.parameter-item-wrapper {
		.default-top-padding {
			top: var(--spacing--3xs);
		}
		.extra-top-padding {
			top: var(--spacing--lg);
		}
	}
}

.border-top-dashed {
	border-top: 1px dashed #999;
}

.no-items-exist {
	margin: var(--spacing--xs) 0;
}
.ghost,
.dragging {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
}
.ghost {
	background-color: var(--color--background);
	opacity: 0.5;
}
.dragging {
	background-color: var(--color--background--light-3);
	.parameter-item-wrapper {
		border: none;
	}
	opacity: 0.7;
}
</style>
