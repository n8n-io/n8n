<template>
	<div
		:class="{
			container: true,
			clickable: clickable,
			active: active,
		}"
		v-on="$listeners"
	>
		<category-item
			v-if="item.type === 'category'"
			:item="item"
		/>

		<subcategory-item
			v-else-if="item.type === 'subcategory'"
			:item="item"
		/>

		<node-item
			v-else-if="item.type === 'node'"
			:nodeType="item.properties.nodeType"
			@dragstart="$listeners.dragstart"
			@dragend="$listeners.dragend"
		/>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { INodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';

export default Vue.extend({
	name: 'CreatorItem',
	components: {
		CategoryItem,
		SubcategoryItem,
		NodeItem,
	},
	props: {
		item: {
			type: Object as PropType<INodeCreateElement>,
		},
		active: {
			type: Boolean,
		},
		clickable: {
			type: Boolean,
		},
		lastNode: {
			type: Boolean,
		},
	},
});
</script>

<style lang="scss" scoped>
.container {
	position: relative;
	border-left: 2px solid transparent;

	&:hover {
		border-color: $node-creator-item-hover-border-color;
	}

	&.active  {
		border-color: $color-primary !important;
	}
}

</style>
