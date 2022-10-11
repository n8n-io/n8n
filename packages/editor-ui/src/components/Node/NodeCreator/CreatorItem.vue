<template>
	<div
		:class="{
			container: true,
			clickable: clickable,
			active: active,
		}"
		v-on="$listeners"
	>
		<CategoryItem
			v-if="item.type === 'category'"
			:item="item"
		/>

		<SubcategoryItem
			v-else-if="item.type === 'subcategory'"
			:item="item"
		/>

		<NodeItem
			v-else-if="item.type === 'node'"
			:nodeType="item.properties.nodeType"
			:bordered="!lastNode"
			@dragstart="$listeners.dragstart"
			@dragend="$listeners.dragend"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import NodeItem from './NodeItem.vue';
import CategoryItem from './CategoryItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';

export default Vue.extend({
	name: 'CreatorItem',
	components: {
		CategoryItem,
		SubcategoryItem,
		NodeItem,
	},
	props: ['item', 'active', 'clickable', 'lastNode'],
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
