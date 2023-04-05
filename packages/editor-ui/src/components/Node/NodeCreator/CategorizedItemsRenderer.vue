<script setup lang="ts">
import { INodeCreateElement, NodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';
import LabelItem from './LabelItem.vue';
import ActionItem from './ActionItem.vue';
import ViewItem from './ViewItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted, ref } from 'vue';
import { DynamicScroller, RecycleScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ItemsRenderer from './ItemsRenderer.vue';

export interface Props {
	elements: INodeCreateElement[];
	category: string;
	disabled?: boolean;
	activeIndex?: number;
	isTriggerCategory?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const expanded = ref(true);
function onClick() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<div :class="$style.categorizedItemsRenderer" :data-category-collapsed="!expanded">
		<CategoryItem
			:name="category"
			:disabled="disabled"
			:active="activeIndex === 0"
			:count="elements.length"
			:expanded="expanded"
			:isTrigger="isTriggerCategory || false"
			@click="onClick"
		/>
		<div :class="$style.contentSlot" v-if="expanded && elements.length > 0 && $slots.default">
			<slot />
		</div>
		<!-- Pass through listeners & empty slot to ItemsRenderer -->
		<ItemsRenderer
			v-if="expanded"
			:elements="elements"
			v-on="$listeners"
			:isTrigger="isTriggerCategory || false"
		>
			<template #default> </template>
			<template #empty>
				<slot name="empty" v-bind="{ elements }" />
			</template>
		</ItemsRenderer>
	</div>
</template>

<style lang="scss" module>
.contentSlot {
	padding: var(--spacing-xs) var(--spacing-s) var(--spacing-3xs);
}
</style>
