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
import FixedCollectionItem from './FixedCollectionItem.vue';
import Draggable from 'vuedraggable';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/features/nodes/ndv/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import { storeToRefs } from 'pinia';
import { useFixedCollectionItemState } from '@/composables/useFixedCollectionItemState';

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
import { refDebounced } from '@vueuse/core';

const locale = useI18n();

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[]>;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	isReadOnly: false,
	isNewlyAdded: false,
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
}>();

const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const { activeNode } = storeToRefs(ndvStore);

const mutableValues = ref({} as Record<string, INodeParameters[]>);
const selectedOption = ref<string | undefined>(undefined);
const isDragging = ref(false);

// Set a debounce delay to avoid panel animating shortly after drag end
const disableAnimation = refDebounced(
	isDragging,
	computed(() => (isDragging.value ? 0 : 300)),
);

// Create a unique key for session storage by combining node ID and parameter path
const storageKey = computed(() => `${activeNode.value?.id ?? 'unknown'}-${props.path}`);
const itemState = useFixedCollectionItemState(storageKey);

const getOptionProperties = (optionName: string): INodePropertyCollection | undefined => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return undefined;
	return props.parameter.options.find((option) => option.name === optionName);
};

const getPropertyPath = (name: string, index?: number): string => {
	return `${props.path}.${name}${index !== undefined ? `[${index}]` : ''}`;
};

const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);
const sortable = computed(() => true);

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

const dropdownOptions = computed((): Array<RekaSelectOption<string>> => {
	return parameterOptions.value.map((option) => ({
		label: locale
			.nodeText(activeNode.value?.type)
			.collectionOptionDisplayName(props.parameter, option, props.path),
		value: option.name,
	}));
});

const isTopLevelMultiple = computed(() => !props.isNested && multipleValues.value);

const isNestedMultipleWrapper = computed(() => props.isNested && multipleValues.value);

const isNestedSingle = computed(() => props.isNested && !multipleValues.value);

const showWrapper = computed(() => isNestedMultipleWrapper.value);

// Computed property for wrapper expanded state with proper type
const isWrapperExpanded = computed({
	get: () => {
		const value = itemState.wrapperExpanded.value;
		// If not set yet, use default based on props
		if (value === null) {
			return !props.isNested || props.isNewlyAdded;
		}
		return value;
	},
	set: (value: boolean) => {
		itemState.setWrapperExpanded(value);
	},
});

const initExpandedState = () => {
	Object.entries(mutableValues.value).forEach(([propertyName, items]) => {
		const itemsArray = Array.isArray(items) ? items : [items];
		itemState.initExpandedState(propertyName, itemsArray, multipleValues.value);
	});
};

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[]>) => {
		mutableValues.value = deepCopy(newValues);

		Object.entries(mutableValues.value).forEach(([propertyName, items]) => {
			const itemsArray = Array.isArray(items) ? items : [items];
			itemState.trimArrays(propertyName, itemsArray.length);
		});

		initExpandedState();
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
	initExpandedState();
});

const deleteOption = (optionName: string, index?: number) => {
	const currentOptionsOfSameType = mutableValues.value[optionName];

	// Clean up item state if deleting a specific item
	if (index !== undefined) {
		itemState.cleanupItem(optionName, index);
	}

	// Determine what to delete
	if (!currentOptionsOfSameType || currentOptionsOfSameType.length > 1) {
		// Delete single item in array
		emit('valueChanged', {
			name: getPropertyPath(optionName, index),
			value: undefined,
		});
	} else {
		// Delete entire collection
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

		// Clean up all tracking data for this option
		itemState.cleanupProperty(optionName);
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

const optionSelected = (optionName: string | number) => {
	if (typeof optionName !== 'string') return;

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

	// Expand newly added item
	itemState.setExpandedState(option.name, existingValues.length, true);

	selectedOption.value = undefined;
};

const onAddButtonClick = (optionName: string) => {
	optionSelected(optionName);
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

const onDragStart = () => {
	isDragging.value = true;
};

const onDragEnd = () => {
	isDragging.value = false;
};

const onDragChange = (
	optionName: string,
	event: { moved?: { oldIndex: number; newIndex: number } },
) => {
	if (event.moved) {
		itemState.reorderItems(optionName, event.moved.oldIndex, event.moved.newIndex);
	}

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
	const index = mutableValues.value[property.name]?.indexOf(item) ?? -1;
	if (index === -1) return -1;
	return itemState.getItemId(property.name, index);
}
</script>

<template>
	<div
		:class="[$style.fixedCollectionParameter, { [$style.empty]: getProperties.length === 0 }]"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<!-- Top-level multiple: Section header with add button -->
		<N8nSectionHeader
			v-if="isTopLevelMultiple && parameter.displayName !== ''"
			:title="locale.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:bordered="getProperties.length === 0"
			:class="$style.fixedCollectionSectionHeader"
		>
			<template v-if="!isReadOnly" #actions>
				<N8nTooltip :show-after="TOOLTIP_DELAY_MS">
					<template #content>
						{{
							locale.baseText('fixedCollectionParameter.addParameter', {
								interpolate: {
									parameter: locale
										.nodeText(activeNode?.type)
										.inputLabelDisplayName(parameter, path),
								},
							})
						}}
					</template>
					<N8nIconButton
						type="secondary"
						text
						size="small"
						icon="plus"
						icon-size="large"
						:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
						data-test-id="fixed-collection-add-header"
						@click="onAddButtonClick(getProperties[0].name)"
					/>
				</N8nTooltip>
			</template>
		</N8nSectionHeader>

		<!-- Nested multiple: Collapsible wrapper with add button -->
		<N8nCollapsiblePanel
			v-if="showWrapper && parameter.displayName !== ''"
			v-model="isWrapperExpanded"
			:title="locale.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:show-actions-on-hover="false"
		>
			<template #actions>
				<N8nTooltip
					v-if="!isReadOnly && parameterOptions.length > 0"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<template #content>
						{{
							locale.baseText('fixedCollectionParameter.addParameter', {
								interpolate: {
									parameter: locale
										.nodeText(activeNode?.type)
										.inputLabelDisplayName(parameter, path),
								},
							})
						}}
					</template>
					<N8nIconButton
						type="secondary"
						text
						size="small"
						icon="plus"
						icon-size="large"
						:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
						data-test-id="fixed-collection-add-header-nested"
						@click="onAddButtonClick(parameterOptions[0].name)"
					/>
				</N8nTooltip>
			</template>

			<div>
				<div
					v-for="property in getProperties"
					:key="property.name"
					:class="$style.fixedCollectionParameterProperty"
				>
					<div>
						<Draggable
							v-model="mutableValues[property.name]"
							:item-key="(item: INodeParameters) => getItemKey(item, property)"
							handle=".drag-handle"
							drag-class="dragging"
							ghost-class="ghost"
							chosen-class="chosen"
							@start="onDragStart"
							@end="onDragEnd"
							@change="onDragChange(property.name, $event)"
						>
							<template #item="{ index }">
								<FixedCollectionItem
									:key="itemState.getItemId(property.name, index)"
									:item-id="itemState.getItemId(property.name, index)"
									:property="property"
									:item-data="mutableValues[property.name][index]"
									:item-index="index"
									:stable-index="itemState.getItemStableIndex(property.name, index)"
									:node-values="nodeValues"
									:property-path="getPropertyPath(property.name, index)"
									:is-read-only="isReadOnly"
									:is-expanded="itemState.getExpandedState(property.name, index)"
									:sortable="sortable"
									:disable-animation="disableAnimation"
									:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
									@update:is-expanded="itemState.setExpandedState(property.name, index, $event)"
									@value-changed="valueChanged"
									@delete="deleteOption(property.name, index)"
								/>
							</template>
						</Draggable>
					</div>
				</div>

				<!-- Add control inside wrapper -->
				<div v-if="parameterOptions.length > 0 && !isReadOnly" :class="$style.controls">
					<N8nButton
						v-if="parameter.options && parameter.options.length === 1"
						type="secondary"
						icon="plus"
						data-test-id="fixed-collection-add-nested"
						:label="getPlaceholderText"
						@click="onAddButtonClick(parameter.options[0].name)"
					/>
					<N8nRekaSelect
						v-else
						v-model="selectedOption"
						:options="dropdownOptions"
						:class="$style.addDropdown"
						data-test-id="fixed-collection-add-dropdown-nested"
						@update:model-value="optionSelected"
					>
						<template #trigger>
							<N8nButton type="secondary" icon="plus" :label="getPlaceholderText" />
						</template>
					</N8nRekaSelect>
				</div>
			</div>
		</N8nCollapsiblePanel>

		<!-- Top-level multiple or nested single (no wrapper) -->
		<div
			v-for="property in getProperties"
			v-else
			:key="property.name"
			:class="$style.fixedCollectionParameterProperty"
		>
			<!-- Top-level multiple: Draggable list of items -->
			<template v-if="isTopLevelMultiple">
				<Draggable
					v-model="mutableValues[property.name]"
					:item-key="(item: INodeParameters) => getItemKey(item, property)"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@start="onDragStart"
					@end="onDragEnd"
					@change="onDragChange(property.name, $event)"
				>
					<template #item="{ index }">
						<FixedCollectionItem
							:key="itemState.getItemId(property.name, index)"
							:item-id="itemState.getItemId(property.name, index)"
							:property="property"
							:item-data="mutableValues[property.name][index]"
							:item-index="index"
							:stable-index="itemState.getItemStableIndex(property.name, index)"
							:node-values="nodeValues"
							:property-path="getPropertyPath(property.name, index)"
							:is-read-only="isReadOnly"
							:is-expanded="itemState.getExpandedState(property.name, index)"
							:sortable="sortable"
							:disable-animation="disableAnimation"
							:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
							@update:is-expanded="itemState.setExpandedState(property.name, index, $event)"
							@value-changed="valueChanged"
							@delete="deleteOption(property.name, index)"
						/>
					</template>
				</Draggable>
			</template>

			<!-- Nested single: Collapsible panel with delete -->
			<N8nCollapsiblePanel
				v-else-if="isNestedSingle"
				v-model="isWrapperExpanded"
				:title="property.displayName"
				:data-item-key="property.name"
			>
				<template v-if="!isReadOnly" #actions>
					<N8nHeaderAction
						icon="trash-2"
						:label="locale.baseText('fixedCollectionParameter.deleteItem')"
						danger
						@click="deleteOption(property.name)"
					/>
				</template>

				<Suspense>
					<ParameterInputList
						hide-delete
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						:is-nested="true"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						@value-changed="valueChanged"
					/>
				</Suspense>
			</N8nCollapsiblePanel>
		</div>

		<!-- Add control at bottom (for non-wrapper cases) -->
		<div v-if="parameterOptions.length > 0 && !isReadOnly && !showWrapper" :class="$style.controls">
			<N8nButton
				v-if="parameter.options && parameter.options.length === 1"
				type="secondary"
				icon="plus"
				data-test-id="fixed-collection-add"
				:label="getPlaceholderText"
				@click="onAddButtonClick(parameter.options[0].name)"
			/>
			<N8nRekaSelect
				v-else
				v-model="selectedOption"
				:options="dropdownOptions"
				:class="$style.addDropdown"
				data-test-id="fixed-collection-add-dropdown"
				@update:model-value="optionSelected"
			>
				<template #trigger>
					<N8nButton type="secondary" icon="plus" :label="getPlaceholderText" />
				</template>
			</N8nRekaSelect>
		</div>
	</div>
</template>

<style lang="scss" module>
.fixedCollectionParameter {
	padding-left: 0;
}

.empty .fixedCollectionSectionHeader {
	margin-bottom: var(--spacing--xs);
}

.fixedCollectionParameter .controls {
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
}
</style>
