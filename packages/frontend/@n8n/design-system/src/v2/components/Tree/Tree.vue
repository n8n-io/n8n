<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { TreeRoot, useForwardPropsEmits } from 'reka-ui';
import { computed, useAttrs } from 'vue';

import type {
	TreeBranch,
	TreeDefaultNodeProps,
	TreeDefaultSlotProps,
	TreeEmits,
	TreeProps,
	TreeSlots,
} from './Tree.types';
import TreeNode from './TreeNode.vue';
import treeVariables from './Tree.variables.module.css';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const props = withDefaults(defineProps<TreeProps>(), {
	disabled: false,
	multiple: false,
	showExpandArrow: true,
});

const emit = defineEmits<TreeEmits>();
const slots = defineSlots<TreeSlots>();

const resolvedGetKey = computed(() => props.getKey ?? ((item: TreeBranch) => item.id));
const resolvedGetChildren = computed(
	() => props.getChildren ?? ((item: TreeBranch) => item.children),
);

function findItemsByKeys(items: TreeBranch[], keys: readonly string[]): TreeBranch[] {
	if (keys.length === 0) return [];

	const keySet = new Set(keys);
	const result: TreeBranch[] = [];

	function walk(nodes: readonly TreeBranch[]) {
		for (const node of nodes) {
			const key = resolvedGetKey.value(node);
			if (keySet.has(key)) {
				result.push(node);
			}

			const children = resolvedGetChildren.value(node);
			if (children?.length) {
				walk(children);
			}
		}
	}

	walk(items);
	return result;
}

function mapKeysToItems(keys: readonly string[]) {
	const matchedItems = findItemsByKeys(props.items, keys);
	return props.multiple ? matchedItems : matchedItems[0];
}

const rekaModelValue = computed(() => {
	if (props.modelValue === undefined) {
		return undefined;
	}

	return mapKeysToItems(props.modelValue);
});

const rekaDefaultValue = computed(() => {
	if (props.defaultValue === undefined) {
		return undefined;
	}

	return mapKeysToItems(props.defaultValue);
});

const rootProps = useForwardPropsEmits(
	reactivePick(props, 'disabled', 'multiple', 'expanded', 'defaultExpanded'),
	emit,
);

function handleModelValueUpdate(value: TreeBranch | TreeBranch[] | undefined) {
	const selectedItems = value === undefined ? [] : Array.isArray(value) ? value : [value];
	emit(
		'update:modelValue',
		selectedItems.map((item) => resolvedGetKey.value(item)),
	);
}

function getDefaultNodeProps(context: TreeDefaultSlotProps): TreeDefaultNodeProps {
	const item = context.item.value;
	if ('label' in item && typeof item.label === 'string') {
		return { label: item.label };
	}

	return { label: resolvedGetKey.value(item) };
}

const resolvedGetNodeProps = computed(() => props.getNodeProps ?? getDefaultNodeProps);

function getSharedTreeNodeProps() {
	return {
		disabled: props.disabled,
		showExpandArrow: props.showExpandArrow,
		getNodeProps: resolvedGetNodeProps.value,
		node: props.node,
	};
}
</script>

<template>
	<TreeRoot
		v-slot="{ flattenItems }"
		v-bind="{ ...rootProps, ...rootAttrs }"
		:class="['n8n-tree', treeVariables.root, rootClass]"
		:items="items"
		:get-key="resolvedGetKey"
		:get-children="resolvedGetChildren"
		:model-value="rekaModelValue"
		:default-value="rekaDefaultValue"
		@update:model-value="handleModelValueUpdate"
	>
		<TreeNode
			v-for="(flattenedItem, index) in flattenItems"
			:key="flattenedItem._id"
			:flattened-item="flattenedItem"
			v-bind="getSharedTreeNodeProps()"
			:flatten-items="flattenItems"
			:flat-index="index"
		>
			<template v-if="slots.default" #default="slotProps">
				<slot v-bind="slotProps" />
			</template>
			<template v-if="slots.icon" #icon="iconProps">
				<slot name="icon" v-bind="iconProps" />
			</template>
			<template v-if="slots.label" #label="labelProps">
				<slot name="label" v-bind="labelProps" />
			</template>
			<template v-if="slots.toggle" #toggle="toggleProps">
				<slot name="toggle" v-bind="toggleProps" />
			</template>
		</TreeNode>
	</TreeRoot>
</template>
