<script lang="ts" setup>
import { useFixedCollectionItemState } from '@/app/composables/useFixedCollectionItemState';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { telemetry } from '@/app/plugins/telemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { IUpdateInformation } from '@/Interface';
import type { N8nDropdownOption } from '@n8n/design-system';
import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nDropdown,
	N8nHeaderAction,
	N8nSectionHeader,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';
import { deepCopy, isINodePropertyCollectionList } from 'n8n-workflow';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeMount, ref, useTemplateRef, watch } from 'vue';
import ParameterInputList from '../ParameterInputList.vue';
import FixedCollectionItemList from './FixedCollectionItemList.vue';

const locale = useI18n();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const nodeHelpers = useNodeHelpers();
const { activeNode } = storeToRefs(ndvStore);

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[] | INodeParameters>;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
	canDelete?: boolean;
	hiddenIssuesInputs?: string[];
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	hiddenIssuesInputs: () => [],
	isReadOnly: false,
	isNewlyAdded: false,
	canDelete: false,
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
	delete: [];
}>();

const mutableValues = ref({} as Record<string, INodeParameters[] | INodeParameters>);
const rootEl = useTemplateRef<HTMLElement>('rootEl');
const isDropdownOpen = ref(false);
const addedOptionalValues = ref(new Map<string, Set<string>>());

const storageKey = computed(() => `${activeNode.value?.id ?? 'unknown'}-${props.path}`);

const hasSingleItem = computed(() => {
	const entries = Object.entries(props.values);
	if (entries.length !== 1) return false;
	const [, items] = entries[0];
	if (Array.isArray(items)) return items.length === 1;
	return Object.keys(items).length > 0;
});

const itemState = useFixedCollectionItemState(storageKey, {
	defaultWrapperExpanded: props.isNewlyAdded || hasSingleItem.value,
});

const isWrapperExpanded = itemState.wrapperExpanded;

const getOptionProperties = (optionName: string): INodePropertyCollection | undefined => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return undefined;
	return props.parameter.options.find((option) => option.name === optionName);
};

const getPropertyPath = (name: string, index?: number): string => {
	return `${props.path}.${name}${index !== undefined ? `[${index}]` : ''}`;
};

const isArrayValue = (propertyName: string): boolean => {
	return Array.isArray(mutableValues.value[propertyName]);
};

const getArrayValues = (propertyName: string): INodeParameters[] => {
	const value = mutableValues.value[propertyName];
	return Array.isArray(value) ? value : [];
};

const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);

const sortable = computed(() => !!props.parameter.typeOptions?.sortable);

const propertyNames = computed(() => new Set(Object.keys(mutableValues.value ?? {})));

const properties = computed(() =>
	Array.from(propertyNames.value)
		.map(getOptionProperties)
		.filter((prop): prop is INodePropertyCollection => prop !== undefined),
);

const parameterOptions = computed(() => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return [];
	if (multipleValues.value) return props.parameter.options;
	return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
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

const onToggleOptionalValue = (propertyName: string, valueName: string, index?: number) => {
	const property = getOptionProperties(propertyName);
	if (property) {
		toggleOptionalValue(property, valueName, index);
	}
};

const displayName = computed(() =>
	locale.nodeText(activeNode.value?.type).inputLabelDisplayName(props.parameter, props.path),
);

const isAddDisabled = computed(() => parameterOptions.value.length === 0);

const placeholder = computed(
	() =>
		locale.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) ||
		locale.baseText('fixedCollectionParameter.addItem'),
);

const addTooltipText = computed(() =>
	isAddDisabled.value
		? locale.baseText('fixedCollectionParameter.allOptionsAdded')
		: locale.baseText('fixedCollectionParameter.addParameter', {
				interpolate: {
					parameter: displayName.value,
				},
			}),
);

const dropdownOptions = computed(
	() =>
		parameterOptions.value.map((option) => ({
			label: locale
				.nodeText(activeNode.value?.type)
				.collectionOptionDisplayName(props.parameter, option, props.path),
			value: option.name,
		})) as Array<N8nDropdownOption<string>>,
);

const shouldShowSectionHeader = computed(
	() => !props.isNested && props.parameter.displayName !== '',
);

const shouldWrapInCollapsible = computed(() => props.isNested);

const shouldShowAddControl = computed(() => parameterOptions.value.length > 0 && !props.isReadOnly);

const shouldShowAddInHeader = computed(() => shouldShowSectionHeader.value && !props.isReadOnly);

const shouldShowAddAtBottom = computed(
	() =>
		shouldShowAddControl.value &&
		(shouldShowSectionHeader.value || (shouldWrapInCollapsible.value && multipleValues.value)),
);

const shouldShowAddInCollapsibleActions = computed(
	() => shouldWrapInCollapsible.value && shouldShowAddControl.value,
);

const isEmpty = computed(() =>
	Object.values(mutableValues.value).every((value) => {
		if (Array.isArray(value)) return value.length === 0;
		return Object.keys(value).length === 0;
	}),
);

const hasSingleOption = computed(() => dropdownOptions.value.length === 1);
const hasMultipleOptions = computed(() => dropdownOptions.value.length > 1);

const shouldDeleteEntireCollection = (optionName: string, index?: number): boolean => {
	if (index !== undefined) return false;
	const items = mutableValues.value[optionName];
	return !items || !Array.isArray(items) || items.length <= 1;
};

const getParentPath = (): string => {
	const pathParts = props.path.split('.');
	const parentPropertyName = pathParts.at(-1) ?? '';
	const parentPath = pathParts.slice(0, -1).join('.');
	return parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName;
};

const getDeletionPath = (optionName: string, index?: number): string => {
	if (index !== undefined) return getPropertyPath(optionName, index);
	if (!multipleValues.value && props.isNested) return getParentPath();
	return getPropertyPath(optionName);
};

const handleDelete = (optionName: string, index?: number) => {
	if (index !== undefined) {
		itemState.cleanupItem(optionName, index);
	} else if (shouldDeleteEntireCollection(optionName, index)) {
		itemState.cleanupProperty(optionName);
	}

	emit('valueChanged', { name: getDeletionPath(optionName, index), value: undefined });
};

const trackFieldAdded = () => {
	telemetry.track('User added workflow input field', {
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const trackFieldTypeChange = (parameterData: IUpdateInformation) => {
	telemetry.track('User changed workflow input field type', {
		type: parameterData.value,
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const normalizeToArray = (items: INodeParameters[] | INodeParameters): INodeParameters[] =>
	Array.isArray(items) ? items : [items];

const initExpandedState = () => {
	Object.entries(mutableValues.value).forEach(([propertyName, items]) =>
		itemState.initExpandedState(propertyName, normalizeToArray(items), multipleValues.value),
	);
};

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[] | INodeParameters>) => {
		mutableValues.value = deepCopy(newValues);

		Object.entries(mutableValues.value).forEach(([propertyName, items]) =>
			itemState.trimArrays(propertyName, normalizeToArray(items).length),
		);

		initExpandedState();
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
	initExpandedState();
	initializeAddedOptionalValues();

	if (hasSingleItem.value) {
		const firstProperty = properties.value[0];
		if (firstProperty && multipleValues.value) {
			const items = mutableValues.value[firstProperty.name];
			if (Array.isArray(items) && items.length > 0) {
				itemState.setExpandedState(firstProperty.name, 0, true);
			}
		}
	}
});

const initializeParameterValue = (optionParameter: INodeProperties): NodeParameterValueType => {
	const hasMultipleValues = optionParameter.typeOptions?.multipleValues === true;

	if (!hasMultipleValues) {
		return deepCopy(optionParameter.default);
	}

	if (optionParameter.type === 'fixedCollection') {
		return {};
	}

	const existingArray = get(props.nodeValues, [props.path, optionParameter.name], []);
	const defaultValue = optionParameter.default;

	const normalizeDefault = (value: typeof defaultValue) => {
		if (Array.isArray(value)) return deepCopy(value);
		if (value !== '' && typeof value !== 'object') return [deepCopy(value)];
		return [];
	};

	return [...existingArray, ...normalizeDefault(defaultValue)];
};

const scrollToNewItem = async (optionName: string, itemIndex: number) => {
	await nextTick();
	const itemId = itemState.getItemId(optionName, itemIndex);
	const element = rootEl.value?.querySelector(`[data-item-key="${itemId}"]`);
	element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const optionSelected = (optionName: string) => {
	const option = getOptionProperties(optionName);
	if (!option) return;

	const name = `${props.path}.${option.name}`;

	const newParameterValue = Object.fromEntries(
		option.values.map((optionParameter) => [
			optionParameter.name,
			initializeParameterValue(optionParameter),
		]),
	);

	const existingValues = get(props.nodeValues, name, []) as INodeParameters[];
	const newValue: NodeParameterValueType = multipleValues.value
		? [...existingValues, newParameterValue]
		: newParameterValue;

	emit('valueChanged', { name, value: newValue });

	const newItemIndex = existingValues.length;
	itemState.setExpandedState(option.name, newItemIndex, true);

	if (multipleValues.value) {
		void scrollToNewItem(option.name, newItemIndex);
	}

	if (props.parameter.name === 'workflowInputs') {
		trackFieldAdded();
	}
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
	if (props.parameter.name === 'workflowInputs') {
		trackFieldTypeChange(parameterData);
	}
};

const onDragChange = (
	optionName: string,
	event: { moved?: { oldIndex: number; newIndex: number } },
) => {
	if (event.moved) {
		itemState.reorderItems(optionName, event.moved.oldIndex, event.moved.newIndex);

		const items = mutableValues.value[optionName];
		if (Array.isArray(items)) {
			const reorderedItems = [...items];
			const [movedItem] = reorderedItems.splice(event.moved.oldIndex, 1);
			reorderedItems.splice(event.moved.newIndex, 0, movedItem);
			mutableValues.value[optionName] = reorderedItems;
		}

		const parameterData: ValueChangedEvent = {
			name: getPropertyPath(optionName),
			value: mutableValues.value[optionName],
			type: 'optionsOrderChanged',
		};

		emit('valueChanged', parameterData);
	}
};

const onHeaderAddClick = async () => {
	if (!isWrapperExpanded.value) {
		isWrapperExpanded.value = true;
		await nextTick();
	}

	if (hasSingleOption.value && dropdownOptions.value[0]) {
		optionSelected(dropdownOptions.value[0].value);
	}
};

const onAddButtonClick = () => {
	if (hasSingleOption.value && dropdownOptions.value[0]) {
		optionSelected(dropdownOptions.value[0].value);
	}
};
</script>

<template>
	<div
		ref="rootEl"
		:class="[$style.fixedCollectionParameter, { [$style.empty]: properties.length === 0 }]"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<template v-if="shouldShowSectionHeader">
			<N8nSectionHeader :title="displayName" :bordered="isEmpty" :class="$style.sectionHeader">
				<template v-if="shouldShowAddInHeader" #actions>
					<N8nTooltip :disabled="!isAddDisabled" :show-after="TOOLTIP_DELAY_MS">
						<template #content>{{ addTooltipText }}</template>
						<N8nDropdown
							v-if="hasMultipleOptions"
							:options="dropdownOptions"
							:disabled="isAddDisabled"
							data-test-id="fixed-collection-add-header"
							@select="optionSelected"
						>
							<template #trigger>
								<N8nHeaderAction icon="plus" :label="placeholder" :disabled="isAddDisabled" />
							</template>
						</N8nDropdown>
						<N8nHeaderAction
							v-else
							icon="plus"
							:label="placeholder"
							:disabled="isAddDisabled"
							data-test-id="fixed-collection-add-header"
							@click="onHeaderAddClick"
						/>
					</N8nTooltip>
				</template>
			</N8nSectionHeader>

			<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
				<template v-if="multipleValues && isArrayValue(property.name)">
					<FixedCollectionItemList
						:property="property"
						:values="getArrayValues(property.name)"
						:node-values="nodeValues"
						:get-property-path="getPropertyPath"
						:item-state="itemState"
						:is-read-only="!!isReadOnly"
						:sortable="sortable"
						:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
						:get-visible-property-values="getVisiblePropertyValues"
						:get-picker-property-values="getPickerPropertyValues"
						:is-optional-value-added="isOptionalValueAdded"
						:add-optional-field-button-text="addOptionalFieldButtonText"
						@value-changed="valueChanged"
						@delete="handleDelete"
						@drag-change="onDragChange"
						@toggle-optional-value="onToggleOptionalValue"
					/>
				</template>

				<N8nCollapsiblePanel
					v-else
					:model-value="itemState.getExpandedState(property.name, 0)"
					:title="property.displayName"
					:data-item-key="property.name"
					@update:model-value="itemState.setExpandedState(property.name, 0, $event)"
				>
					<template v-if="!isReadOnly" #actions>
						<N8nHeaderAction
							icon="trash-2"
							:label="locale.baseText('fixedCollectionParameter.deleteItem')"
							danger
							@click="handleDelete(property.name)"
						/>
					</template>

					<ParameterInputList
						hide-delete
						:parameters="getVisiblePropertyValues(property)"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name, 0)"
						:is-read-only="!!isReadOnly"
						:is-nested="false"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						:hidden-issues-inputs="hiddenIssuesInputs"
						@value-changed="valueChanged"
					/>
				</N8nCollapsiblePanel>
			</div>

			<div v-if="shouldShowAddAtBottom" :class="$style.controls">
				<N8nButton
					v-if="hasSingleOption"
					type="highlightFill"
					icon="plus"
					:data-test-id="`fixed-collection-add-top-level-button`"
					:label="placeholder"
					:disabled="isAddDisabled"
					@click="onAddButtonClick"
				/>
				<N8nDropdown
					v-else-if="hasMultipleOptions"
					:options="dropdownOptions"
					:class="$style.dropdown"
					:data-test-id="`fixed-collection-add-top-level-dropdown`"
					:disabled="isAddDisabled"
					@select="optionSelected"
				>
					<template #trigger>
						<N8nButton
							type="highlightFill"
							icon="plus"
							:label="placeholder"
							:disabled="isAddDisabled"
						/>
					</template>
				</N8nDropdown>
			</div>
		</template>

		<N8nCollapsiblePanel
			v-else-if="shouldWrapInCollapsible"
			v-model="isWrapperExpanded"
			:title="displayName"
			:show-actions-on-hover="!isDropdownOpen"
		>
			<template #actions>
				<N8nTooltip v-if="shouldShowAddInCollapsibleActions" :show-after="TOOLTIP_DELAY_MS">
					<template #content>{{ addTooltipText }}</template>
					<N8nDropdown
						v-if="hasMultipleOptions"
						:options="dropdownOptions"
						:disabled="isAddDisabled"
						data-test-id="fixed-collection-add-header"
						@select="optionSelected"
						@update:open="isDropdownOpen = $event"
					>
						<template #trigger>
							<N8nHeaderAction icon="plus" :label="placeholder" :disabled="isAddDisabled" />
						</template>
					</N8nDropdown>
					<N8nHeaderAction
						v-else
						icon="plus"
						:label="placeholder"
						:disabled="isAddDisabled"
						data-test-id="fixed-collection-add-header-nested"
						@click="onHeaderAddClick"
					/>
				</N8nTooltip>
				<N8nHeaderAction
					v-if="canDelete && !isReadOnly"
					icon="trash-2"
					:label="locale.baseText('fixedCollectionParameter.deleteItem')"
					danger
					data-test-id="fixed-collection-delete-nested"
					@click="emit('delete')"
				/>
			</template>

			<div>
				<template v-if="multipleValues">
					<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
						<FixedCollectionItemList
							v-if="mutableValues[property.name]"
							:property="property"
							:values="mutableValues[property.name] as INodeParameters[]"
							:node-values="nodeValues"
							:get-property-path="getPropertyPath"
							:item-state="itemState"
							:is-read-only="!!isReadOnly"
							:sortable="sortable"
							:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
							:get-visible-property-values="getVisiblePropertyValues"
							:get-picker-property-values="getPickerPropertyValues"
							:is-optional-value-added="isOptionalValueAdded"
							:add-optional-field-button-text="addOptionalFieldButtonText"
							@value-changed="valueChanged"
							@delete="handleDelete"
							@drag-change="onDragChange"
							@toggle-optional-value="
								(propertyName, valueName, index) =>
									toggleOptionalValue(getOptionProperties(propertyName)!, valueName, index)
							"
						/>
					</div>

					<div v-if="shouldShowAddAtBottom" :class="$style.controls">
						<N8nButton
							v-if="hasSingleOption"
							type="highlightFill"
							icon="plus"
							:data-test-id="`fixed-collection-add-nested-button`"
							:label="placeholder"
							@click="onAddButtonClick"
						/>
						<N8nDropdown
							v-else-if="hasMultipleOptions"
							:options="dropdownOptions"
							:class="$style.dropdown"
							:data-test-id="`fixed-collection-add-nested-dropdown`"
							@select="optionSelected"
						>
							<template #trigger>
								<N8nButton type="highlightFill" icon="plus" :label="placeholder" />
							</template>
						</N8nDropdown>
					</div>
				</template>

				<template v-else>
					<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
						<ParameterInputList
							hide-delete
							:parameters="getVisiblePropertyValues(property)"
							:node-values="nodeValues"
							:path="getPropertyPath(property.name)"
							:is-read-only="!!isReadOnly"
							:is-nested="true"
							:remove-first-parameter-margin="true"
							:remove-last-parameter-margin="true"
							:hidden-issues-inputs="hiddenIssuesInputs"
							@value-changed="valueChanged"
						/>
					</div>
				</template>
			</div>
		</N8nCollapsiblePanel>

		<template v-else>
			<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
				<template v-if="multipleValues && isArrayValue(property.name)">
					<FixedCollectionItemList
						:property="property"
						:values="getArrayValues(property.name)"
						:node-values="nodeValues"
						:get-property-path="getPropertyPath"
						:item-state="itemState"
						:is-read-only="!!isReadOnly"
						:sortable="sortable"
						:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
						:get-visible-property-values="getVisiblePropertyValues"
						:get-picker-property-values="getPickerPropertyValues"
						:is-optional-value-added="isOptionalValueAdded"
						:add-optional-field-button-text="addOptionalFieldButtonText"
						@value-changed="valueChanged"
						@delete="handleDelete"
						@drag-change="onDragChange"
						@toggle-optional-value="onToggleOptionalValue"
					/>
				</template>

				<N8nCollapsiblePanel
					v-else
					:model-value="itemState.getExpandedState(property.name, 0)"
					:title="property.displayName"
					:data-item-key="property.name"
					@update:model-value="itemState.setExpandedState(property.name, 0, $event)"
				>
					<template v-if="!isReadOnly" #actions>
						<N8nHeaderAction
							icon="trash-2"
							:label="locale.baseText('fixedCollectionParameter.deleteItem')"
							danger
							@click="handleDelete(property.name)"
						/>
					</template>

					<ParameterInputList
						hide-delete
						:parameters="getVisiblePropertyValues(property)"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name, 0)"
						:is-read-only="!!isReadOnly"
						:is-nested="false"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						:hidden-issues-inputs="hiddenIssuesInputs"
						@value-changed="valueChanged"
					/>
				</N8nCollapsiblePanel>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.fixedCollectionParameter {
	padding-left: 0;
}

.propertySection {
	margin-bottom: var(--spacing--xs);

	&:last-child {
		margin-bottom: 0;
	}

	& + & {
		padding-top: var(--spacing--xs);
		border-top: var(--border-width) solid var(--color--foreground);
	}
}

.sectionHeader {
	margin-bottom: 0;
}

.controls {
	margin-top: var(--spacing--xs);
}

.dropdown {
	display: inline-flex;
}
</style>
