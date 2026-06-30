<script setup lang="ts">
import { TreeItem as RekaTreeItem } from 'reka-ui';
import type { Component } from 'vue';
import { computed, useCssModule } from 'vue';

import type { TreeDefaultSlotProps, TreeGetNodeProps, TreeNodeDefaultSlots } from './Tree.types';
import treeVariables from './Tree.variables.module.css';
import TreeNodeDefault from './TreeNodeDefault.vue';

const $style = useCssModule();

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
	};
}
</script>

<template>
	<RekaTreeItem
		v-bind="flattenedItem.bind"
		:disabled="isItemDisabled"
		v-slot="{ handleToggle, handleSelect, isExpanded, isSelected }"
	>
		<div
			:class="[treeVariables.root, $style.treeItemRow]"
			:style="{ '--tree-indent': indentLevel }"
		>
			<template v-if="indentLevel > 0">
				<div
					v-for="n in indentLevel"
					:key="n"
					:class="$style.trackline"
					:style="{ '--indent': n - 1 }"
					aria-hidden="true"
				/>
			</template>

			<div
				:class="[$style.treeItemContent]"
				data-test-id="tree-node"
				:data-selected="isSelected ? '' : undefined"
				:data-disabled="isItemDisabled ? '' : undefined"
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
			</div>
		</div>
	</RekaTreeItem>
</template>

<style module>
.treeItemRow {
	position: relative;
	width: 100%;
}

.trackline {
	position: absolute;
	top: 0;
	bottom: 0;
	left: calc(
		var(--tree-item-padding-inline) + var(--tree-indent-unit) * var(--indent) +
			var(--tree-icon-size) / 2
	);
	z-index: 1;
	width: 1px;
	background-color: var(--border-color--subtle);
	pointer-events: none;
}

.treeItemContent {
	position: relative;
	z-index: 0;
	width: 100%;
	min-width: 0;
}

:global([role='treeitem']) {
	display: block;
	width: 100%;
	list-style: none;
	outline: none;
	margin: 0;
	padding: 0;
	margin-bottom: var(--tree-item-gap);
}
</style>
