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
import ParameterInputList from '../ParameterInputList.vue';
import Draggable from 'vuedraggable';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

const locale = useI18n();

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[] | INodeParameters>;
	isReadOnly?: boolean;
	isNested?: boolean;
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	isReadOnly: false,
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
}>();

const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const { activeNode } = storeToRefs(ndvStore);

const mutableValues = ref({} as Record<string, INodeParameters[] | INodeParameters>);
const selectedOption = ref<string | null | undefined>(null);

const getOptionProperties = (optionName: string): INodePropertyCollection | undefined => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return undefined;
	return props.parameter.options.find((option) => option.name === optionName);
};

const getPropertyPath = (name: string, index?: number): string => {
	return `${props.path}.${name}${index !== undefined ? `[${index}]` : ''}`;
};

const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);
const sortable = computed(() => !!props.parameter.typeOptions?.sortable);

const getPlaceholderText = computed(() => {
	const placeholder = locale
		.nodeText(activeNode.value?.type)
		.placeholder(props.parameter, props.path);
	return placeholder || locale.baseText('fixedCollectionParameter.choose');
});

const propertyNames = computed(() => new Set(Object.keys(mutableValues.value || {})));

const getProperties = computed(() => {
	const properties: INodePropertyCollection[] = [];
	for (const name of propertyNames.value) {
		const prop = getOptionProperties(name);
		if (prop) properties.push(prop);
	}
	return properties;
});

const parameterOptions = computed(() => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return [];
	if (multipleValues.value) return props.parameter.options;
	return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
});

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[] | INodeParameters>) => {
		mutableValues.value = deepCopy(newValues);
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
});

const deleteOption = (optionName: string, index?: number) => {
	const currentOptionsOfSameType = mutableValues.value[optionName];
	const isArray = Array.isArray(currentOptionsOfSameType);

	if (!currentOptionsOfSameType || (isArray && currentOptionsOfSameType.length > 1)) {
		emit('valueChanged', {
			name: getPropertyPath(optionName, index),
			value: undefined,
		});
	} else {
		if (!multipleValues.value && props.isNested) {
			const pathParts = props.path.split('.');
			const parentPath = pathParts.slice(0, -1).join('.');
			const parentPropertyName = pathParts[pathParts.length - 1];
			emit('valueChanged', {
				name: parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName,
				value: undefined,
			});
		} else {
			emit('valueChanged', {
				name: getPropertyPath(optionName),
				value: undefined,
			});
		}
	}
};

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

	const newItems = Array.isArray(defaultValue)
		? deepCopy(defaultValue)
		: defaultValue !== '' && typeof defaultValue !== 'object'
			? [deepCopy(defaultValue)]
			: [];

	return existingArray.concat(newItems);
};

const optionSelected = async (optionName: string) => {
	const option = getOptionProperties(optionName);
	if (!option) return;

	const name = `${props.path}.${option.name}`;

	const newParameterValue = option.values.reduce<INodeParameters>((acc, optionParameter) => {
		acc[optionParameter.name] = initializeParameterValue(optionParameter);
		return acc;
	}, {});

	const existingValues = get(props.nodeValues, name, []) as INodeParameters[];
	const newValue: NodeParameterValueType = multipleValues.value
		? [...existingValues, newParameterValue]
		: newParameterValue;

	emit('valueChanged', { name, value: newValue });
	selectedOption.value = undefined;
};

const onAddButtonClick = async (optionName: string) => {
	await optionSelected(optionName);
	if (props.parameter.name === 'workflowInputs') {
		trackWorkflowInputFieldAdded();
	}
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

function getItemKey(_item: INodeParameters, index: number) {
	return index;
}
</script>

<template>
	<div
		:class="$style.fixedCollectionParameter"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<div v-if="getProperties.length === 0" :class="$style.noItemsExist">
			<N8nText size="small">{{
				locale.baseText('fixedCollectionParameter.currentlyNoItemsExist')
			}}</N8nText>
		</div>

		<div
			v-for="property in getProperties"
			:key="property.name"
			:class="$style.fixedCollectionParameterProperty"
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
					v-model="mutableValues[property.name] as INodeParameters[]"
					:item-key="getItemKey"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@change="onDragChange(property.name)"
				>
					<template #item="{ index }">
						<div :key="property.name + '-' + index" :class="$style.parameterItem">
							<div :class="[$style.parameterItemWrapper, { [$style.borderTopDashed]: index }]">
								<div v-if="!isReadOnly" :class="[$style.iconButton, $style.defaultTopPadding]">
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
								<div v-if="!isReadOnly" :class="[$style.iconButton, $style.extraTopPadding]">
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
										:parameters="property.values"
										:node-values="nodeValues"
										:path="getPropertyPath(property.name, index)"
										:is-read-only="isReadOnly"
										:is-nested="isNested"
										:hide-delete="true"
										@value-changed="valueChanged"
									/>
								</Suspense>
							</div>
						</div>
					</template>
				</Draggable>
			</div>

			<div v-else :class="$style.parameterItem">
				<div :class="$style.parameterItemWrapper">
					<div v-if="!isReadOnly" :class="$style.iconButton">
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
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						:is-nested="isNested"
						:hide-delete="true"
						:class="$style.parameterItem"
						@value-changed="valueChanged"
					/>
				</div>
			</div>
		</div>

		<div v-if="parameterOptions.length > 0 && !isReadOnly" :class="$style.controls">
			<N8nButton
				v-if="parameter.options && parameter.options.length === 1"
				type="tertiary"
				block
				data-test-id="fixed-collection-add"
				:label="getPlaceholderText"
				@click="onAddButtonClick(parameter.options[0].name)"
			/>
			<div v-else :class="$style.addOption">
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

<style lang="scss" module>
.fixedCollectionParameter {
	padding-left: var(--spacing--sm);
}

.fixedCollectionParameterProperty {
	margin: var(--spacing--xs) 0;
	margin-bottom: 0;
}

.iconButton {
	display: flex;
	flex-direction: column;
	position: absolute;
	opacity: 0;
	top: -3px;
	left: calc(-0.5 * var(--spacing--xs));
	transition: opacity 100ms ease-in;
}

.controls {
	:global(.button) {
		font-weight: var(--font-weight-normal);
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

.parameterItem {
	position: relative;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);

	&:hover > .parameterItemWrapper > .iconButton {
		opacity: 1;
	}

	+ .parameterItem {
		.parameterItemWrapper {
			.defaultTopPadding {
				top: calc(1.2 * var(--spacing--sm));
			}
			.extraTopPadding {
				top: calc(2.2 * var(--spacing--sm));
			}
		}
	}

	&:first-of-type {
		.parameterItemWrapper {
			.defaultTopPadding {
				top: var(--spacing--3xs);
			}
			.extraTopPadding {
				top: var(--spacing--lg);
			}
		}
	}
}

.borderTopDashed {
	border-top: var(--border-width) dashed var(--color--foreground--shade-1);
}

.noItemsExist {
	margin: var(--spacing--xs) 0;
}

:global(.ghost),
:global(.dragging) {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
}

:global(.ghost) {
	background-color: var(--color--background);
	opacity: 0.5;
}

:global(.dragging) {
	background-color: var(--color--background--light-3);
	opacity: 0.7;

	.parameterItemWrapper {
		border: none;
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
</style>
