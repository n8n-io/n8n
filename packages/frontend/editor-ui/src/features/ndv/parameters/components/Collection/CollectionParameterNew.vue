<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import ParameterInputList from '../ParameterInputList.vue';
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

import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nHeaderAction,
	N8nDropdown,
	N8nSectionHeader,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type { N8nDropdownOption } from '@n8n/design-system';
import { isPresent } from '@/app/utils/typesUtils';

export interface Props {
	hideDelete?: boolean;
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: INodeParameters;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
}
const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
	delete: [];
}>();

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
	isNested: false,
	isNewlyAdded: false,
});
const ndvStore = useNDVStore();
const i18n = useI18n();
const nodeHelpers = useNodeHelpers();

const { activeNode } = storeToRefs(ndvStore);

const storageKey = computed(() => {
	return `n8n-collection-parameter-expanded-${activeNode.value?.id ?? 'unknown'}-${props.path}`;
});
const isExpanded = ref(props.isNewlyAdded);
const newlyAddedParameters = ref<Set<string>>(new Set());
const isDropdownOpen = ref(false);

const placeholder = computed(() => {
	return (
		i18n.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) ||
		i18n.baseText('collectionParameter.addItem')
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

const dropdownOptions = computed((): Array<N8nDropdownOption<string>> => {
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

watch(
	storageKey,
	(newKey) => {
		const storedValue = sessionStorage.getItem(newKey);
		isExpanded.value = isExpanded.value || storedValue === 'true';
	},
	{ immediate: true },
);

watch(isExpanded, (newValue) => {
	sessionStorage.setItem(storageKey.value, newValue.toString());
});

async function optionSelected(optionName: string) {
	// Expand the collection if it's collapsed
	if (!isExpanded.value) {
		isExpanded.value = true;
		await nextTick();
	}

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

	newlyAddedParameters.value.add(option.name);
}
function valueChanged(parameterData: IUpdateInformation) {
	emit('valueChanged', parameterData);
}
</script>

<template>
	<N8nCollapsiblePanel
		v-if="isNested"
		v-model="isExpanded"
		:title="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
		:show-actions-on-hover="!isDropdownOpen"
		@keydown.stop
	>
		<template v-if="!isReadOnly" #actions>
			<N8nDropdown
				:options="dropdownOptions"
				:disabled="isAddDisabled"
				data-test-id="collection-parameter-add-header"
				@select="optionSelected"
				@update:open="isDropdownOpen = $event"
			>
				<template #trigger>
					<N8nHeaderAction icon="plus" :label="placeholder" :disabled="isAddDisabled" />
				</template>
			</N8nDropdown>
			<N8nHeaderAction
				v-if="!hideDelete"
				icon="trash-2"
				:label="i18n.baseText('collectionParameter.deleteItem')"
				danger
				@click="emit('delete')"
			/>
		</template>

		<div>
			<Suspense v-if="getFlattenedProperties.length > 0">
				<ParameterInputList
					:class="$style.parameterList"
					:parameters="getFlattenedProperties"
					:node-values="nodeValues"
					:path="path"
					:is-read-only="isReadOnly"
					:is-nested="true"
					:newly-added-parameters="newlyAddedParameters"
					@value-changed="valueChanged"
				/>
			</Suspense>

			<div v-if="!isReadOnly && !isAddDisabled" :class="$style.paramOptions">
				<N8nDropdown
					ref="addDropdownRef"
					:options="dropdownOptions"
					:class="$style.addDropdown"
					data-test-id="collection-parameter-add-dropdown"
					@select="optionSelected"
				>
					<template #trigger>
						<N8nButton
							class="n8n-button--highlightFill"
							variant="subtle"
							icon="plus"
							:label="placeholder"
						/>
					</template>
				</N8nDropdown>
			</div>
		</div>
	</N8nCollapsiblePanel>

	<div
		v-else
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
				:title="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
				:bordered="showHeaderDivider"
				:class="$style.collectionSectionHeader"
			>
				<template v-if="!isReadOnly" #actions>
					<N8nTooltip :disabled="!isAddDisabled" :show-after="TOOLTIP_DELAY_MS">
						<template #content>{{ addTooltipText }}</template>
						<N8nDropdown
							:options="dropdownOptions"
							:disabled="isAddDisabled"
							data-test-id="collection-parameter-add-header"
							@select="optionSelected"
						>
							<template #trigger>
								<N8nHeaderAction icon="plus" :label="placeholder" :disabled="isAddDisabled" />
							</template>
						</N8nDropdown>
					</N8nTooltip>
				</template>
			</N8nSectionHeader>

			<Suspense v-if="getFlattenedProperties.length > 0">
				<ParameterInputList
					:class="$style.parameterList"
					:parameters="getFlattenedProperties"
					:node-values="nodeValues"
					:path="path"
					:is-read-only="isReadOnly"
					:is-nested="true"
					:newly-added-parameters="newlyAddedParameters"
					@value-changed="valueChanged"
				/>
			</Suspense>

			<div v-if="!isReadOnly && !isAddDisabled" :class="$style.paramOptions">
				<N8nDropdown
					ref="addDropdownRef"
					:options="dropdownOptions"
					:class="$style.addDropdown"
					data-test-id="collection-parameter-add-dropdown"
					@select="optionSelected"
				>
					<template #trigger>
						<N8nButton
							class="n8n-button--highlightFill"
							variant="subtle"
							icon="plus"
							:label="placeholder"
						/>
					</template>
				</N8nDropdown>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.parameterList {
	& > div:first-child {
		:global(.multi-parameter),
		:global(.parameter-item) {
			margin-top: 0;
		}
	}

	& > div:last-child {
		:global(.multi-parameter),
		:global(.parameter-item) {
			margin-top: 0;
		}
	}
}

.showHeaderDivider .collectionSectionHeader {
	margin-bottom: var(--spacing--xs);
}

.collectionParameter .paramOptions {
	margin-top: var(--spacing--xs);
}

.addDropdown {
	display: inline-flex;
}
</style>
