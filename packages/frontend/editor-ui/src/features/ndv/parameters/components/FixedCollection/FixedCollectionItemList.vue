<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';
import type { INodeParameters, INodeProperties, INodePropertyCollection } from 'n8n-workflow';
import { computed, ref } from 'vue';
import Draggable from 'vuedraggable';
import FixedCollectionItem from './FixedCollectionItem.vue';
import type { useFixedCollectionItemState } from '@/app/composables/useFixedCollectionItemState';
import { refDebounced } from '@vueuse/core';

export type Props = {
	property: INodePropertyCollection;
	values: INodeParameters[];
	nodeValues: INodeParameters;
	getPropertyPath: (name: string, index?: number) => string;
	itemState: ReturnType<typeof useFixedCollectionItemState>;
	isReadOnly: boolean;
	sortable: boolean;
	titleTemplate?: string;
	getVisiblePropertyValues: (
		property: INodePropertyCollection,
		index?: number,
	) => INodeProperties[];
	getPickerPropertyValues: (property: INodePropertyCollection, index?: number) => INodeProperties[];
	isOptionalValueAdded: (propertyName: string, valueName: string, index?: number) => boolean;
	addOptionalFieldButtonText: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
	delete: [optionName: string, index: number];
	dragChange: [optionName: string, event: { moved?: { oldIndex: number; newIndex: number } }];
	toggleOptionalValue: [propertyName: string, valueName: string, index: number];
}>();

const isDragging = ref(false);
const DRAG_DEBOUNCE_MS = 400;

const disableAnimation = refDebounced(
	isDragging,
	computed(() => (isDragging.value ? 0 : DRAG_DEBOUNCE_MS)),
);

const getItemKey = (item: INodeParameters): string =>
	props.itemState.getItemId(
		props.property.name,
		props.values.findIndex((v) => v === item),
	);

const setDragging = (value: boolean) => {
	isDragging.value = value;
};

const onDragChange = (event: { moved?: { oldIndex: number; newIndex: number } }) =>
	emit('dragChange', props.property.name, event);

const onValueChanged = (parameterData: IUpdateInformation) => emit('valueChanged', parameterData);

const onDelete = (index: number) => emit('delete', props.property.name, index);

const onToggleOptionalValue = (index: number, valueName: string) =>
	emit('toggleOptionalValue', props.property.name, valueName, index);

const getIsOptionalValueAdded = (index: number) => (valueName: string) =>
	props.isOptionalValueAdded(props.property.name, valueName, index);
</script>

<template>
	<Draggable
		:model-value="values"
		:item-key="getItemKey"
		handle=".drag-handle"
		:drag-class="$style.dragging"
		:ghost-class="$style.ghost"
		@start="setDragging(true)"
		@end="setDragging(false)"
		@change="onDragChange"
	>
		<template #item="{ index }">
			<FixedCollectionItem
				:key="itemState.getItemId(property.name, index)"
				:item-id="itemState.getItemId(property.name, index)"
				:property="property"
				:item-data="values[index]"
				:item-index="index"
				:stable-index="itemState.getItemStableIndex(property.name, index)"
				:node-values="nodeValues"
				:property-path="getPropertyPath(property.name, index)"
				:is-read-only="isReadOnly"
				:is-expanded="itemState.getExpandedState(property.name, index)"
				:is-dragging="isDragging"
				:sortable="sortable"
				:disable-animation="disableAnimation"
				:title-template="titleTemplate"
				:visible-property-values="getVisiblePropertyValues(property, index)"
				:picker-property-values="getPickerPropertyValues(property, index)"
				:add-optional-field-button-text="addOptionalFieldButtonText"
				:is-optional-value-added="getIsOptionalValueAdded(index)"
				@update:is-expanded="itemState.setExpandedState(property.name, index, $event)"
				@value-changed="onValueChanged"
				@delete="onDelete(index)"
				@toggle-optional-value="onToggleOptionalValue(index, $event)"
			/>
		</template>
	</Draggable>
</template>

<style module lang="scss">
.ghost,
.dragging {
	border-radius: var(--radius);
	cursor: grabbing;
}

.ghost {
	background-color: var(--color--background);
	opacity: 0.5;
}

.dragging {
	background-color: var(--color--background--light-3);
	opacity: 0.7;
}
</style>
