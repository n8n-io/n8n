<script setup lang="ts">
import { TreeRoot, TreeVirtualizer, useForwardPropsEmits, TreeItem } from 'reka-ui';

import type { N8nTreeProps, N8nTreeEmits } from '.';

defineOptions({ name: 'Tree' });

const props = withDefaults(defineProps<N8nTreeProps>(), {
	estimateSize: 32,
});

const emit = defineEmits<N8nTreeEmits>();
const forwarded = useForwardPropsEmits(props, emit);

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
				v-slot="{ handleToggle }"
				v-bind="item.bind"
				:key="item.value.id"
				:class="$style.TreeItem"
			>
				<span
					v-for="level in getLevelIndentation(item.level)"
					:key="level"
					:class="$style.TreeItemIdent"
				/>
				<slot name="item" :item="item.value" :handle-toggle="handleToggle">
					{{ item.value.label }}
				</slot>
			</TreeItem>
		</TreeVirtualizer>
	</TreeRoot>
</template>

<style module>
.TreeItem {
	position: relative;
	display: flex;
	align-items: center;
	height: 32px;
}

.TreeItemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 0.75rem;
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
