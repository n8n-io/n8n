<template functional>
	<div
		:class="{
			container: true,
			clickable: props.clickable,
			active: props.active,
		}"
		@click="listeners['click']"
		>
		<CategoryItem
			v-if="props.item.type === 'category'"
			:item="props.item"
		/>

		<SubcategoryItem
			v-else-if="props.item.type === 'subcategory'"
			:item="props.item"
		/>

		<NodeItem
			v-else-if="props.item.type === 'node'"
			:nodeType="props.item.properties.nodeType"
			:bordered="!props.lastNode"
		></NodeItem>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import NodeItem from './NodeItem.vue';
import CategoryItem from './CategoryItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';

Vue.component('CategoryItem', CategoryItem);
Vue.component('SubcategoryItem', SubcategoryItem);
Vue.component('NodeItem', NodeItem);

export default {
	props: ['item', 'active', 'clickable', 'lastNode'],
};
</script>

<style lang="scss" scoped>
.container {
	position: relative;
	border-left: 2px solid transparent;

	&:hover {
		border-color: $--node-creator-item-hover-border-color;
	}

	&.active  {
		border-color: $--color-primary !important;
	}
}

</style>