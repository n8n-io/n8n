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
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const expanded = ref(true);
function onClick() {
	console.log(
		'🚀 ~ file: CategorizedItemsRenderer.vue:27 ~ onClick ~ 	expanded.value:',
		expanded.value,
	);
	expanded.value = !expanded.value;
}
</script>

<template>
	<div class="categorizedItemsRenderer">
		<CategoryItem
			:name="category"
			:disabled="disabled"
			:active="activeIndex === 0"
			:count="elements.length"
			:expanded="expanded"
			@click="onClick"
		/>
		<!-- Pass all listeners to ItemsRenderer -->
		<ItemsRenderer :elements="elements" v-on="$listeners" v-if="expanded" />
	</div>
</template>

<style lang="scss" module></style>
