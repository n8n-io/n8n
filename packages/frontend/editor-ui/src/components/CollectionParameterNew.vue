<script lang="ts" setup>
import { ref, computed, watch, nextTick, onBeforeMount } from 'vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import type { IUpdateInformation } from '@/Interface';

import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { deepCopy, isINodeProperties, isINodePropertyCollection } from 'n8n-workflow';

import get from 'lodash/get';

import { useNDVStore } from '@/features/nodes/ndv/ndv.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nHeaderAction,
	N8nIconButton,
	N8nRekaSelect,
	N8nSectionHeader,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type { RekaSelectOption } from '@n8n/design-system';
import { isPresent } from '@/utils/typesUtils';
import Draggable from 'vuedraggable';
import type { ComponentExposed } from 'vue-component-type-helpers';

const selectedOption = ref<string | undefined>(undefined);
const addDropdownRef = ref<ComponentExposed<typeof N8nRekaSelect>>();

export interface Props {
	hideDelete?: boolean;
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values: INodeParameters;
	isReadOnly?: boolean;
	isNested?: boolean;
}
const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<Props>();
const ndvStore = useNDVStore();
const i18n = useI18n();
const nodeHelpers = useNodeHelpers();

const { activeNode } = storeToRefs(ndvStore);

const expandedItems = ref<Record<string, boolean>>({});
const newlyAddedParameters = ref<Set<string>>(new Set());

const getPlaceholderText = computed(() => {
	return (
		i18n.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) ??
		i18n.baseText('collectionParameter.choose')
	);
});

function isNodePropertyCollection(
	object: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): object is INodePropertyCollection {
	return 'values' in object;
}

function getParameterOptionLabel(
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): string {
	if (isNodePropertyCollection(item)) {
		return i18n
			.nodeText(activeNode.value?.type)
			.collectionOptionDisplayName(props.parameter, item, props.path);
	}

	return 'displayName' in item ? item.displayName : item.name;
}

function displayNodeParameter(parameter: INodeProperties) {
	if (parameter.type === 'hidden') {
		return false;
	}
	if (parameter.displayOptions === undefined) {
		// If it is not defined no need to do a proper check
		return true;
	}
	return nodeHelpers.displayParameter(props.nodeValues, parameter, props.path, ndvStore.activeNode);
}

function getOptionProperties(
	optionName: string,
): INodePropertyCollection | INodeProperties | INodePropertyOptions | undefined {
	const options = props.parameter.options ?? [];
	const matchingOptions = options.filter((option) => option.name === optionName);

	// If there are multiple options with the same name, filter by displayOptions
	if (matchingOptions.length > 1) {
		// Filter by displayOptions - find the one that should be displayed
		const visibleOption = matchingOptions.find((option) => {
			if (isINodeProperties(option)) {
				return displayNodeParameter(option);
			}
			return true; // Collections are always considered visible here
		});
		return visibleOption ?? matchingOptions[0];
	}

	return matchingOptions[0];
}

const propertyNames = computed<string[]>(() => Object.keys(props.values ?? {}));

const getProperties = computed(() => {
	return propertyNames.value.map((name) => getOptionProperties(name)).filter(isPresent);
});

const getCollections = computed(() => {
	return getProperties.value.filter(isINodePropertyCollection);
});

const sortable = computed(() => props.parameter.typeOptions?.sortable);

const mutableCollections = ref<INodePropertyCollection[]>([]);

const getFlattenedProperties = computed((): INodeProperties[] => {
	// For new UI: if it's a collection, use its values; otherwise treat as property
	return getProperties.value.flatMap((option) => {
		if (isINodePropertyCollection(option)) {
			return option.values;
		}
		if (isINodeProperties(option)) {
			return [option];
		}
		return [];
	});
});
const filteredOptions = computed(() => {
	if (!Array.isArray(props.parameter.options)) return [];
	return props.parameter.options.filter((option) => {
		// Accept both INodeProperties and INodePropertyCollection
		if (isINodeProperties(option)) {
			return displayNodeParameter(option);
		}
		if (isINodePropertyCollection(option)) {
			return true; // Collections are always displayed
		}
		return false;
	});
});

const parameterOptions = computed(() => {
	return filteredOptions.value.filter((option) => !propertyNames.value.includes(option.name));
});

const dropdownOptions = computed((): Array<RekaSelectOption<string>> => {
	return parameterOptions.value.map((option) => ({
		label: getParameterOptionLabel(option),
		value: option.name,
	}));
});

const isAddDisabled = computed(() => parameterOptions.value.length === 0);

const showHeaderDivider = computed(() => {
	if (getProperties.value.length === 0) return true;
	const firstProperty = getProperties.value[0];
	return (
		isINodeProperties(firstProperty) &&
		!['collection', 'fixedCollection'].includes(firstProperty.type)
	);
});

const addTooltipText = computed(() => {
	if (!isAddDisabled.value) return '';
	return i18n.baseText('collectionParameter.allOptionsAdded');
});

// Helper functions for new UI
const getPropertyDisplayName = (property: INodePropertyCollection): string => {
	return property.displayName;
};

const deleteProperty = (propertyName: string) => {
	emit('valueChanged', {
		name: `${props.path}.${propertyName}`,
		value: undefined,
	});
};

function optionSelected(optionName: string) {
	const option = getOptionProperties(optionName);
	if (!option) return;

	const name = `${props.path}.${option.name}`;

	let value;

	// Handle INodePropertyCollection (has 'values' property)
	if (isINodePropertyCollection(option)) {
		// Collection: create object with default values from collection.values
		const collectionValue: INodeParameters = {};
		for (const property of option.values) {
			collectionValue[property.name] = deepCopy(property.default);
		}
		value = collectionValue;
	} else if (isINodeProperties(option)) {
		// Handle INodeProperties
		const hasMultipleValues = option.typeOptions?.multipleValues === true;

		if (hasMultipleValues) {
			// Multiple values are allowed
			if (option.type === 'fixedCollection') {
				// fixedCollection stores values as objects with nested arrays
				value = get(props.nodeValues, [props.path, optionName], {});
			} else {
				// Other types store values as arrays
				const defaultValue = option.default;
				const existingArray = get(
					props.nodeValues,
					[props.path, optionName],
					[] as Array<typeof defaultValue>,
				);
				if (Array.isArray(existingArray)) {
					value = existingArray;
					value.push(deepCopy(defaultValue));
				}
			}
		} else {
			// Single value
			value = deepCopy(option.default);
		}
	} else {
		// Fallback for INodePropertyOptions or unknown types
		value = 'default' in option ? deepCopy(option.default as NodeParameterValueType) : null;
	}

	emit('valueChanged', { name, value });

	// For new collections, expand them by default
	if (isINodePropertyCollection(option)) {
		expandedItems.value[option.name] = true;
	}
	newlyAddedParameters.value.add(option.name);

	// Clear selection after emitting to allow adding another item
	void nextTick(() => {
		selectedOption.value = undefined;
	});
}
function valueChanged(parameterData: IUpdateInformation) {
	emit('valueChanged', parameterData);
}

async function onHeaderAddClick() {
	if (addDropdownRef.value) {
		// For new UI, open the dropdown and scroll into view
		addDropdownRef.value.open();
		// Wait for DOM update and scroll the dropdown into view
		await nextTick();
		addDropdownRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
}

const initExpandedState = () => {
	const newState: Record<string, boolean> = {};

	getCollections.value.forEach((collection) => {
		const key = collection.name;
		newState[key] = expandedItems.value[key] ?? false;
	});

	expandedItems.value = newState;
};

watch(
	getCollections,
	(newCollections) => {
		mutableCollections.value = [...newCollections];
		initExpandedState();
	},
	{ immediate: true },
);

onBeforeMount(() => {
	initExpandedState();
});

const onDragChange = () => {
	// Build new values object based on reordered collections
	const newValues: INodeParameters = {};
	for (const collection of mutableCollections.value) {
		const existingValue = props.values[collection.name];
		if (existingValue !== undefined) {
			newValues[collection.name] = existingValue;
		}
	}

	emit('valueChanged', {
		name: props.path,
		value: newValues,
	});
};
</script>

<template>
	<div
		:class="[
			$style.collectionParameter,
			{
				[$style.showHeaderDivider]: showHeaderDivider,
			},
		]"
		@keydown.stop
	>
		<div :class="$style.collectionParameterWrapper">
			<N8nSectionHeader
				v-if="!isNested"
				:title="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
				:bordered="showHeaderDivider"
				:class="$style.collectionSectionHeader"
			>
				<template v-if="!isReadOnly" #actions>
					<N8nTooltip :disabled="!isAddDisabled">
						<template #content>{{ addTooltipText }}</template>
						<N8nIconButton
							type="secondary"
							text
							size="small"
							icon="plus"
							icon-size="large"
							:title="isAddDisabled ? addTooltipText : i18n.baseText('collectionParameter.addItem')"
							:aria-label="i18n.baseText('collectionParameter.addItem')"
							:disabled="isAddDisabled"
							data-test-id="collection-parameter-add-header"
							@click="onHeaderAddClick"
						/>
					</N8nTooltip>
				</template>
			</N8nSectionHeader>

			<div>
				<Draggable
					v-if="mutableCollections.length > 0"
					v-model="mutableCollections"
					:item-key="(item: INodePropertyCollection) => item.name"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@change="onDragChange"
				>
					<template #item="{ element: collection }">
						<N8nCollapsiblePanel
							:key="collection.name"
							v-model="expandedItems[collection.name]"
							:title="getPropertyDisplayName(collection)"
						>
							<template v-if="!isReadOnly && !hideDelete" #actions>
								<N8nHeaderAction
									icon="trash-2"
									:label="i18n.baseText('collectionParameter.deleteItem')"
									danger
									@click="deleteProperty(collection.name)"
								/>
								<N8nHeaderAction
									v-if="sortable && getCollections.length > 1"
									icon="grip-vertical"
									:label="i18n.baseText('collectionParameter.dragItem')"
								/>
							</template>

							<Suspense>
								<ParameterInputList
									:parameters="collection.values"
									:node-values="nodeValues"
									:path="`${path}.${collection.name}`"
									:is-read-only="isReadOnly"
									:is-nested="true"
									:newly-added-parameters="newlyAddedParameters"
									@value-changed="valueChanged"
								/>
							</Suspense>
						</N8nCollapsiblePanel>
					</template>
				</Draggable>

				<Suspense v-if="getFlattenedProperties.length > 0">
					<ParameterInputList
						:parameters="getFlattenedProperties"
						:node-values="nodeValues"
						:path="path"
						:is-read-only="isReadOnly"
						:is-nested="true"
						:newly-added-parameters="newlyAddedParameters"
						@value-changed="valueChanged"
					/>
				</Suspense>
			</div>

			<div v-if="!isReadOnly" :class="$style.paramOptions">
				<N8nTooltip :disabled="!isAddDisabled" :show-after="TOOLTIP_DELAY_MS">
					<template #content>{{ addTooltipText }}</template>
					<N8nRekaSelect
						ref="addDropdownRef"
						v-model="selectedOption"
						:options="dropdownOptions"
						:disabled="isAddDisabled"
						:class="$style.addDropdown"
						data-test-id="collection-parameter-add-dropdown"
						@update:model-value="optionSelected"
					>
						<template #trigger>
							<N8nButton
								type="secondary"
								icon="plus"
								:label="getPlaceholderText"
								:disabled="isAddDisabled"
							/>
						</template>
					</N8nRekaSelect>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.collectionParameter {
	padding-left: 0;
}

.showHeaderDivider .collectionSectionHeader {
	margin-bottom: var(--spacing--xs);
}

// New UI: Custom styling for secondary button
.collectionParameter .paramOptions {
	margin-top: var(--spacing--xs);

	:global(.button) {
		--button--color--background: var(--color--background);
		--button--color--background--hover: var(--color--background);
		--button--color--background--active: var(--color--background);
		--button--color--background--focus: var(--color--background);
		--button--border-color: transparent;
		--button--border-color--hover: transparent;
		--button--border-color--active: transparent;
		--button--border-color--focus: transparent;
		--button--color--text--hover: var(--color--primary);
		--button--color--text--active: var(--color--primary);
		--button--color--text--focus: var(--color--primary);
	}
}

.addDropdown {
	display: inline-flex;
}
</style>
