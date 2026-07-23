<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { TreeRoot, TreeVirtualizer, useForwardPropsEmits } from 'reka-ui';
import type { FlattenedItem } from 'reka-ui';
import { computed, useAttrs, useCssModule } from 'vue';

import type {
	TreeBranch,
	TreeDefaultNodeProps,
	TreeDefaultSlotProps,
	TreeEmits,
	TreeProps,
	TreeSlots,
} from './Tree.types';
import treeVariables from './Tree.variables.module.css';
import TreeNode from './TreeNode.vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const $style = useCssModule();

const props = withDefaults(defineProps<TreeProps>(), {
	disabled: false,
	multiple: false,
	showExpandArrow: true,
	virtualized: false,
	estimateSize: 32,
});

const emit = defineEmits<TreeEmits>();
defineSlots<TreeSlots>();

function resolvedGetKey(item: TreeBranch) {
	if (props.getKey) {
		return props.getKey(item);
	}

	return item.id;
}

function resolvedGetChildren(item: TreeBranch) {
	if (props.getChildren) {
		return props.getChildren(item);
	}

	return item.children;
}

function findItemsByKeys(items: TreeBranch[], keys: readonly string[]): TreeBranch[] {
	if (keys.length === 0) return [];

	const keySet = new Set(keys);
	const result: TreeBranch[] = [];

	function walk(nodes: readonly TreeBranch[]) {
		for (const node of nodes) {
			const key = resolvedGetKey(node);
			if (keySet.has(key)) {
				result.push(node);
			}

			const children = resolvedGetChildren(node);
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
	(event, ...args) => {
		if (event === 'update:modelValue') {
			return;
		}

		emit(event as 'update:expanded', ...(args as TreeEmits['update:expanded']));
	},
);

function handleModelValueUpdate(value: TreeBranch | TreeBranch[] | undefined) {
	const selectedItems = value === undefined ? [] : Array.isArray(value) ? value : [value];
	emit(
		'update:modelValue',
		selectedItems.map((item) => resolvedGetKey(item)),
	);
}

function getDefaultNodeProps(context: TreeDefaultSlotProps): TreeDefaultNodeProps {
	const item = context.item.value;
	if ('label' in item && typeof item.label === 'string') {
		return { label: item.label };
	}

	return { label: resolvedGetKey(item) };
}

function resolvedGetNodeProps(context: TreeDefaultSlotProps): TreeDefaultNodeProps {
	return (props.getNodeProps ?? getDefaultNodeProps)(context);
}

function getSharedTreeNodeProps() {
	return {
		disabled: props.disabled,
		showExpandArrow: props.showExpandArrow,
		getNodeProps: resolvedGetNodeProps,
		node: props.node,
	};
}

function defaultTextContent(item: TreeBranch): string {
	if ('label' in item && typeof item.label === 'string') {
		return item.label;
	}

	return resolvedGetKey(item);
}

function resolvedTextContent(item: TreeBranch): string {
	return (props.textContent ?? defaultTextContent)(item);
}

function isTreeBranch(value: unknown): value is TreeBranch {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'label' in value &&
		typeof value.label === 'string'
	);
}

function virtualTextContent(item: Record<string, unknown>): string {
	if (!isTreeBranch(item)) {
		return '';
	}

	return resolvedTextContent(item);
}

function mapVirtualFlattenedItem(
	item: FlattenedItem<Record<string, unknown>>,
): FlattenedItem<TreeBranch> {
	if (!isTreeBranch(item.value)) {
		throw new Error('Tree received an invalid virtualized item');
	}

	const parentItem = item.parentItem && isTreeBranch(item.parentItem) ? item.parentItem : undefined;

	return {
		...item,
		value: item.value,
		parentItem,
		bind: {
			...item.bind,
			value: item.value,
		},
	};
}
</script>

<template>
	<TreeRoot
		v-slot="{ flattenItems }"
		data-test-id="tree"
		v-bind="{ ...rootProps, ...rootAttrs }"
		:class="[treeVariables.root, rootClass, { [$style.virtualized]: virtualized }]"
		:items="items"
		:get-key="resolvedGetKey"
		:get-children="resolvedGetChildren"
		:model-value="rekaModelValue"
		:default-value="rekaDefaultValue"
		@update:model-value="handleModelValueUpdate"
	>
		<TreeVirtualizer
			v-if="virtualized"
			:estimate-size="estimateSize"
			:overscan="overscan"
			:text-content="virtualTextContent"
			v-slot="{ item: flattenedItem }"
		>
			<TreeNode
				:key="flattenedItem._id"
				:flattened-item="mapVirtualFlattenedItem(flattenedItem)"
				v-bind="getSharedTreeNodeProps()"
			>
				<template v-if="$slots.default" #default="slotProps">
					<slot v-bind="slotProps" />
				</template>
				<template v-if="$slots.icon" #icon="iconProps">
					<slot name="icon" v-bind="iconProps" />
				</template>
				<template v-if="$slots.label" #label="labelProps">
					<slot name="label" v-bind="labelProps" />
				</template>
				<template v-if="$slots.toggle" #toggle="toggleProps">
					<slot name="toggle" v-bind="toggleProps" />
				</template>
			</TreeNode>
		</TreeVirtualizer>

		<template v-else>
			<TreeNode
				v-for="flattenedItem in flattenItems"
				:key="flattenedItem._id"
				:flattened-item="flattenedItem"
				v-bind="getSharedTreeNodeProps()"
			>
				<template v-if="$slots.default" #default="slotProps">
					<slot v-bind="slotProps" />
				</template>
				<template v-if="$slots.icon" #icon="iconProps">
					<slot name="icon" v-bind="iconProps" />
				</template>
				<template v-if="$slots.label" #label="labelProps">
					<slot name="label" v-bind="labelProps" />
				</template>
				<template v-if="$slots.toggle" #toggle="toggleProps">
					<slot name="toggle" v-bind="toggleProps" />
				</template>
			</TreeNode>
		</template>
	</TreeRoot>
</template>

<style module>
.virtualized {
	overflow: auto;
	height: 100%;
}
</style>
