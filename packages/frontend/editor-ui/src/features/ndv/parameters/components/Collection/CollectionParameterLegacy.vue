<script lang="ts" setup>
import { ref, computed } from 'vue';
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

import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { isPresent } from '@/app/utils/typesUtils';

const selectedOption = ref<string | undefined>(undefined);

export interface Props {
	hideDelete?: boolean;
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: INodeParameters;
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

const getFlattenedProperties = computed((): INodeProperties[] => {
	// For legacy UI: if it's a collection, use its values; otherwise treat as property
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
					value = [...existingArray, deepCopy(defaultValue)];
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

	// Clear selection after emitting to allow adding another item
	selectedOption.value = undefined;
}

function valueChanged(parameterData: IUpdateInformation) {
	emit('valueChanged', parameterData);
}
</script>

<template>
	<div :class="$style.collectionParameter" @keydown.stop>
		<div :class="$style.collectionParameterWrapper">
			<div v-if="getProperties.length === 0 && !isNested" :class="$style.noItemsExist">
				<N8nText size="small">{{ i18n.baseText('collectionParameter.noProperties') }}</N8nText>
			</div>

			<Suspense v-else>
				<ParameterInputList
					:parameters="getFlattenedProperties"
					:node-values="nodeValues"
					:path="path"
					:hide-delete="hideDelete"
					:indent="true"
					:is-read-only="isReadOnly"
					:newly-added-parameters="newlyAddedParameters"
					@value-changed="valueChanged"
				/>
			</Suspense>

			<div v-if="!isReadOnly" :class="$style.paramOptions">
				<N8nButton
					style="width: 100%"
					variant="subtle"
					v-if="parameterOptions.length === 1"
					:label="getPlaceholderText"
					data-test-id="collection-parameter-add"
					@click="optionSelected(parameterOptions[0].name)"
				/>
				<N8nButton
					style="width: 100%"
					variant="subtle"
					v-else-if="(parameter.options ?? []).length === 1"
					:label="getPlaceholderText"
					:disabled="true"
					data-test-id="collection-parameter-add"
				/>
				<div v-else :class="$style.addOption">
					<N8nSelect
						ref="addSelectRef"
						v-model="selectedOption"
						:placeholder="getPlaceholderText"
						size="small"
						filterable
						:disabled="parameterOptions.length === 0"
						data-test-id="collection-parameter-add"
						@update:model-value="optionSelected"
					>
						<N8nOption
							v-for="item in parameterOptions"
							:key="item.name"
							:label="getParameterOptionLabel(item)"
							:value="item.name"
							data-test-id="collection-parameter-option"
						>
						</N8nOption>
					</N8nSelect>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.collectionParameter {
	padding-left: var(--spacing--sm);
}

// Legacy UI: Add margin-top and custom styling for tertiary button to look like input
.collectionParameter .paramOptions {
	margin-top: var(--spacing--xs);

	:global(.button) {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--regular);
		--button--border-color: var(--color--foreground);
		--button--color--background: var(--color--background);

		--button--color--text--hover: var(--button--color--text--secondary);
		--button--border-color--hover: var(--color--foreground);
		--button--color--background--hover: var(--color--background);

		--button--color--text--active: var(--button--color--text--secondary);
		--button--border-color--active: var(--color--foreground);
		--button--color--background--active: var(--color--background);

		--button--color--text--focus: var(--button--color--text--secondary);
		--button--border-color--focus: var(--color--foreground);
		--button--color--background--focus: var(--color--background);

		&:active,
		&.active,
		&:focus {
			outline: none;
		}
	}
}

.addOption {
	> * {
		border: none;
	}

	:global(.el-select .el-input.is-disabled) {
		:global(.el-input__icon) {
			opacity: 1 !important;
			cursor: not-allowed;
			color: var(--color--foreground--shade-1);
		}
		:global(.el-input__inner),
		:global(.el-input__inner::placeholder) {
			opacity: 1;
			color: var(--color--foreground--shade-1);
		}
	}
	:global(.el-select .el-input:not(.is-disabled) .el-input__icon) {
		color: var(--color--text--shade-1);
	}
	:global(.el-input .el-input__inner) {
		text-align: center;
	}
	:global(.el-input:not(.is-disabled) .el-input__inner) {
		&,
		&:hover,
		&:focus {
			padding-left: 35px;
			border-radius: var(--radius);
			color: var(--color--text--shade-1);
			background-color: var(--color--background);
			border-color: var(--color--foreground);
			text-align: center;
		}

		&::placeholder {
			color: var(--color--text--shade-1);
			opacity: 1;
		}
	}
}

.noItemsExist {
	margin: var(--spacing--xs) 0;
}
</style>
