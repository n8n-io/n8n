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

const showRequiredOnly = computed(() => {
	return !!props.parameter.typeOptions?.showRequiredOnly;
});

const showRequiredOnlyButtonText = computed(() => {
	if (!props.parameter.typeOptions?.showRequiredOnlyButtonText) {
		return locale.baseText('fixedCollectionParameter.addProperty');
	}
	return locale.nodeText(activeNode.value?.type).showRequiredOnlyButtonText(props.parameter);
});

const addedOptionalProperties = ref(new Map<string, Set<string>>());

const getOptionalPropertiesKey = (propertyName: string, index?: number): string => {
	return index !== undefined ? `${propertyName}-${index}` : propertyName;
};

const hasNonDefaultValue = (
	propertyDef: INodeProperties,
	itemValues: INodeParameters | undefined,
): boolean => {
	if (!itemValues) return false;
	const value = itemValues[propertyDef.name];
	if (value === undefined || value === null) return false;
	if (value === propertyDef.default) return false;
	if (typeof value === 'string' && value === '') return false;
	return true;
};

const initializeAddedPropertiesFromValues = () => {
	if (!showRequiredOnly.value) return;
	if (!isINodePropertyCollectionList(props.parameter.options)) return;

	addedOptionalProperties.value.clear();

	for (const option of props.parameter.options) {
		const optionPath = `${props.path}.${option.name}`;
		const optionValues = get(props.nodeValues, optionPath) as
			| INodeParameters[]
			| INodeParameters
			| undefined;

		if (!optionValues) continue;

		const optionalPropertyDefs = option.values.filter(
			(f) => f.required !== true && f.type !== 'notice',
		);

		if (multipleValues.value && Array.isArray(optionValues)) {
			optionValues.forEach((itemValues, index) => {
				const key = getOptionalPropertiesKey(option.name, index);
				const addedProps = new Set<string>();

				for (const propDef of optionalPropertyDefs) {
					if (hasNonDefaultValue(propDef, itemValues)) {
						addedProps.add(propDef.name);
					}
				}

				if (addedProps.size > 0) {
					addedOptionalProperties.value.set(key, addedProps);
				}
			});
		} else if (typeof optionValues === 'object' && !Array.isArray(optionValues)) {
			const key = getOptionalPropertiesKey(option.name);
			const addedProps = new Set<string>();

			for (const propDef of optionalPropertyDefs) {
				if (hasNonDefaultValue(propDef, optionValues)) {
					addedProps.add(propDef.name);
				}
			}

			if (addedProps.size > 0) {
				addedOptionalProperties.value.set(key, addedProps);
			}
		}
	}
};

const isOptionalPropertyAdded = (
	propertyName: string,
	propName: string,
	index?: number,
): boolean => {
	const key = getOptionalPropertiesKey(propertyName, index);
	return addedOptionalProperties.value.get(key)?.has(propName) ?? false;
};

const getVisibleProperties = (
	property: INodePropertyCollection,
	index?: number,
): INodeProperties[] => {
	if (!showRequiredOnly.value) {
		return property.values;
	}

	const key = getOptionalPropertiesKey(property.name, index);
	const addedProps = addedOptionalProperties.value.get(key);

	return property.values.filter((prop) => {
		// Always show required properties
		if (prop.required === true) {
			return true;
		}

		// Always show notice properties - they're informational, not input properties
		if (prop.type === 'notice') {
			return true;
		}

		// Show optional properties only if explicitly added
		return addedProps?.has(prop.name) ?? false;
	});
};

const getPickerProperties = (
	property: INodePropertyCollection,
	index?: number,
): INodeProperties[] => {
	if (!showRequiredOnly.value) {
		return [];
	}

	const itemPath = getPropertyPath(property.name, index);

	return property.values.filter((prop) => {
		// Only include non-required properties
		if (prop.required === true) {
			return false;
		}

		// Exclude notice types - they're just display messages, not input properties
		if (prop.type === 'notice') {
			return false;
		}

		// Use the existing displayParameter helper from node-helpers to check visibility
		return nodeHelpers.displayParameter(props.nodeValues, prop, itemPath, activeNode.value);
	});
};

const toggleOptionalProperty = (
	property: INodePropertyCollection,
	propName: string,
	index?: number,
) => {
	const key = getOptionalPropertiesKey(property.name, index);
	let propSet = addedOptionalProperties.value.get(key);

	if (!propSet) {
		propSet = new Set();
		addedOptionalProperties.value.set(key, propSet);
	}

	const propDef = property.values.find((p) => p.name === propName);
	if (!propDef) return;

	const isCurrentlyAdded = propSet.has(propName);

	if (isCurrentlyAdded) {
		// Remove the property - clear its value
		propSet.delete(propName);
		const path = getPropertyPath(property.name, index) + `.${propName}`;

		emit('valueChanged', {
			name: path,
			value: undefined,
		});
	} else {
		// Add the property - set default value
		propSet.add(propName);
		const path = getPropertyPath(property.name, index) + `.${propName}`;

		emit('valueChanged', {
			name: path,
			value: deepCopy(propDef.default),
		});
	}
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
	initializeAddedPropertiesFromValues();
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
										:parameters="getVisibleProperties(property, index)"
										:node-values="nodeValues"
										:path="getPropertyPath(property.name, index)"
										:hide-delete="true"
										:is-read-only="isReadOnly"
										:hidden-issues-inputs="hiddenIssuesInputs"
										@value-changed="valueChanged"
									/>
								</Suspense>
								<div
									v-if="getPickerProperties(property, index).length > 0 && !isReadOnly"
									class="attribute-picker add-option"
								>
									<N8nSelect
										:placeholder="showRequiredOnlyButtonText"
										size="small"
										filterable
										:model-value="null"
										@update:model-value="
											(fieldName: string) => toggleOptionalProperty(property, fieldName, index)
										"
									>
										<N8nOption
											v-for="field in getPickerProperties(property, index)"
											:key="field.name"
											:label="field.displayName || field.name"
											:value="field.name"
										>
											<div class="attribute-option">
												<span>{{ field.displayName || field.name }}</span>
												<N8nIcon
													v-if="isOptionalPropertyAdded(property.name, field.name, index)"
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
						:parameters="getVisibleProperties(property)"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						class="parameter-item"
						:hide-delete="true"
						:hidden-issues-inputs="hiddenIssuesInputs"
						@value-changed="valueChanged"
					/>
					<div
						v-if="getPickerProperties(property).length > 0 && !isReadOnly"
						class="attribute-picker add-option"
					>
						<N8nSelect
							:placeholder="showRequiredOnlyButtonText"
							size="small"
							filterable
							:model-value="null"
							@update:model-value="
								(fieldName: string) => toggleOptionalProperty(property, fieldName)
							"
						>
							<N8nOption
								v-for="field in getPickerProperties(property)"
								:key="field.name"
								:label="field.displayName || field.name"
								:value="field.name"
							>
								<div class="attribute-option">
									<span>{{ field.displayName || field.name }}</span>
									<N8nIcon
										v-if="isOptionalPropertyAdded(property.name, field.name)"
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

	.attribute-picker {
		margin-top: var(--spacing--xs);
		margin-bottom: var(--spacing--xs);
	}

	:global(.attribute-option) {
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
