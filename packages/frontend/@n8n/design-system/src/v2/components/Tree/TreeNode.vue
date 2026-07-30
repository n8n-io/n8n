<script setup lang="ts">
import { TreeItem as RekaTreeItem } from 'reka-ui';
import type { Component } from 'vue';
import { computed } from 'vue';

import type { TreeDefaultSlotProps, TreeGetNodeProps, TreeNodeDefaultSlots } from './Tree.types';
import TreeNodeDefault from './TreeNodeDefault.vue';

const props = withDefaults(
	defineProps<{
		flattenedItem: TreeDefaultSlotProps['item'];
		disabled?: boolean;
		showExpandArrow?: boolean;
		node?: Component;
		getNodeProps: TreeGetNodeProps;
	}>(),
	{
		showExpandArrow: true,
	},
);

const slots = defineSlots<
	TreeNodeDefaultSlots & {
		default?: (props: TreeDefaultSlotProps) => unknown;
	}
>();

const isItemDisabled = computed(() => {
	const item = props.flattenedItem.value;
	return props.disabled || (item && 'disabled' in item && !!item.disabled);
});

const indentLevel = computed(() => Math.max(props.flattenedItem.level - 1, 0));

function buildNodeContext(
	handleToggle: () => void,
	handleSelect: () => void,
	isExpanded: boolean,
): TreeDefaultSlotProps {
	return {
		item: props.flattenedItem,
		handleToggle,
		handleSelect,
		isExpanded,
		hasChildren: props.flattenedItem.hasChildren,
	};
}

function getDefaultNodeBindings(
	handleToggle: () => void,
	handleSelect: () => void,
	isExpanded: boolean,
	isSelected: boolean,
) {
	const context = buildNodeContext(handleToggle, handleSelect, isExpanded);
	const resolved = props.getNodeProps(context);

	return {
		label: typeof resolved.label === 'string' ? resolved.label : '',
		icon: props.flattenedItem.value.icon,
		disabled: isItemDisabled.value,
		isSelected,
		isExpanded,
		hasChildren: props.flattenedItem.hasChildren,
		showExpandArrow: props.showExpandArrow,
		indentLevel: indentLevel.value,
		handleToggle,
		handleSelect,
	};
}

function getCustomNodeProps(
	handleToggle: () => void,
	handleSelect: () => void,
	isExpanded: boolean,
	isSelected: boolean,
) {
	const context = buildNodeContext(handleToggle, handleSelect, isExpanded);

	return {
		...context,
		...props.getNodeProps(context),
		disabled: isItemDisabled.value,
		isSelected,
		showExpandArrow: props.showExpandArrow,
		indentLevel: indentLevel.value,
	};
}
</script>

<template>
	<RekaTreeItem
		as-child
		v-bind="flattenedItem.bind"
		:disabled="isItemDisabled"
		v-slot="{ handleToggle, handleSelect, isExpanded, isSelected }"
	>
		<slot v-bind="buildNodeContext(handleToggle, handleSelect, isExpanded)">
			<component
				v-if="node"
				:is="node"
				v-bind="getCustomNodeProps(handleToggle, handleSelect, isExpanded, isSelected)"
			/>
			<TreeNodeDefault
				v-else
				v-bind="getDefaultNodeBindings(handleToggle, handleSelect, isExpanded, isSelected)"
				:data-disabled="isItemDisabled ? '' : undefined"
				:data-selected="isSelected ? '' : undefined"
			>
				<template v-if="slots.icon" #icon="iconProps">
					<slot name="icon" v-bind="iconProps" />
				</template>
				<template v-if="slots.label" #label="labelProps">
					<slot name="label" v-bind="labelProps" />
				</template>
				<template v-if="slots.toggle" #toggle="toggleProps">
					<slot name="toggle" v-bind="toggleProps" />
				</template>
			</TreeNodeDefault>
		</slot>
	</RekaTreeItem>
</template>
