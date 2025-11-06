<script setup lang="ts" generic="T extends BaseTreeItem = IMenuItem">
import {
	TreeRoot,
	TreeVirtualizer,
	useForwardPropsEmits,
	TreeItem,
	type FlattenedItem,
} from 'reka-ui';

import type { IMenuItem } from '@n8n/design-system/types';

import type { N8nTreeProps, N8nTreeEmits, TreeItem as BaseTreeItem } from '.';

defineOptions({ name: 'Tree' });

const props = withDefaults(defineProps<N8nTreeProps<T>>(), {
	estimateSize: 32,
	getKey: (item: T) => item.id,
});

const emit = defineEmits<N8nTreeEmits>();
const forwarded = useForwardPropsEmits(props, emit);

// Define slots with properly typed generic parameters
defineSlots<{
	default(props: {
		item: FlattenedItem<T>;
		handleToggle: () => void;
		isExpanded: boolean;
		hasChildren: boolean;
	}): void;
}>();

function getLevelIndentation(level: number) {
	return new Array((level || 1) - 1).map((_, i) => i);
}
</script>

<template>
	<TreeRoot v-bind="forwarded">
		<TreeVirtualizer
			v-slot="{ item }"
			:estimate-size="estimateSize"
			:text-content="(opt) => opt.name"
		>
			<TreeItem
				v-slot="{ handleToggle, isExpanded }"
				v-bind="item.bind"
				:key="item.value.id"
				:class="$style.TreeItem"
				@toggle.prevent
			>
				<span
					v-for="level in getLevelIndentation(item.level)"
					:key="level"
					:class="$style.TreeItemIdent"
				/>
				<slot
					:item="item as FlattenedItem<T>"
					:handle-toggle="handleToggle"
					:is-expanded="isExpanded"
					:has-children="item.hasChildren"
				/>
			</TreeItem>
		</TreeVirtualizer>
	</TreeRoot>
</template>

<style module>
.TreeItem {
	position: relative;
	display: flex;
	align-items: center;
	width: 100%;
}

.TreeItemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 1rem;
	border-left: 1px solid var(--color--foreground);
}

.TreeItemIdent:before {
	content: '';
	position: absolute;
	bottom: -1px;
	left: -1px;
	width: 1px;
	height: 1px;
	background-color: var(--color--foreground);
}
</style>
