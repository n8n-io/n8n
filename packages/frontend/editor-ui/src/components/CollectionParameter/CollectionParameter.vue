<script lang="ts" setup>
import ParameterInputList from '@/components/ParameterInputList.vue';
import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import type { IUpdateInformation } from '@/Interface';
import { computed, ref } from 'vue';

import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import get from 'lodash/get';

import { useNDVStore } from '@/features/nodes/ndv/ndv.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import { getOptionParameterData } from './utils';

const selectedOption = ref<string | undefined>(undefined);
export interface Props {
	hideDelete?: boolean;
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values: INodeParameters;
	isReadOnly?: boolean;
}
const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<Props>();
const ndvStore = useNDVStore();
const i18n = useI18n();
const nodeHelpers = useNodeHelpers();

const { activeNode } = storeToRefs(ndvStore);

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

function getOptionProperties(optionName: string) {
	const properties = [];
	for (const option of props.parameter.options ?? []) {
		if (option.name === optionName) {
			properties.push(option);
		}
	}

	return properties;
}
const propertyNames = computed<string[]>(() => {
	if (props.values) {
		return Object.keys(props.values);
	}
	return [];
});
const getProperties = computed(() => {
	const returnProperties = [];
	let tempProperties;
	for (const name of propertyNames.value) {
		tempProperties = getOptionProperties(name) as INodeProperties[];
		if (tempProperties !== undefined) {
			returnProperties.push(...tempProperties);
		}
	}
	return returnProperties;
});
const filteredOptions = computed<Array<INodePropertyOptions | INodeProperties>>(() => {
	return (props.parameter.options as Array<INodePropertyOptions | INodeProperties>).filter(
		(option) => {
			return displayNodeParameter(option as INodeProperties);
		},
	);
});
const parameterOptions = computed(() => {
	return filteredOptions.value.filter((option) => {
		return !propertyNames.value.includes(option.name);
	});
});

async function optionSelected(optionName: string) {
	const options = getOptionProperties(optionName);
	if (options.length === 0) {
		return;
	}

	const option = options[0];
	const name = `${props.path}.${option.name}`;

	const parameterData = getOptionParameterData(name, option);
	emit('valueChanged', parameterData);
	selectedOption.value = undefined;
}
function valueChanged(parameterData: IUpdateInformation) {
	emit('valueChanged', parameterData);
}
</script>

<template>
	<div class="collection-parameter" @keydown.stop>
		<div class="collection-parameter-wrapper">
			<div v-if="getProperties.length === 0" class="no-items-exist">
				<N8nText size="small">{{ i18n.baseText('collectionParameter.noProperties') }}</N8nText>
			</div>

			<Suspense>
				<ParameterInputList
					:parameters="getProperties"
					:node-values="nodeValues"
					:path="path"
					:hide-delete="hideDelete"
					:indent="true"
					:is-read-only="isReadOnly"
					@value-changed="valueChanged"
				/>
			</Suspense>

			<div v-if="parameterOptions.length > 0 && !isReadOnly" class="param-options">
				<N8nButton
					v-if="(parameter.options ?? []).length === 1"
					type="tertiary"
					block
					:label="getPlaceholderText"
					@click="optionSelected((parameter.options ?? [])[0].name)"
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

<style lang="scss">
.collection-parameter {
	padding-left: var(--spacing--sm);

	.param-options {
		margin-top: var(--spacing--xs);

		.button {
			color: var(--color--text--shade-1);
			font-weight: var(--font-weight-normal);
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

	.no-items-exist {
		margin: var(--spacing--xs) 0;
	}
	.option {
		position: relative;
		padding: 0.25em 0 0.25em 1em;
	}
}
</style>
