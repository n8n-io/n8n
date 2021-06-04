<template functional>
	<div
		:class="{
			container: true,
			[props.item.type]: true,
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

Vue.component("CategoryItem", CategoryItem);
Vue.component("SubcategoryItem", SubcategoryItem);
Vue.component("NodeItem", NodeItem);

export default {
	props: ['item', 'active', 'clickable', 'lastNode'],
};

</script>

<style lang="scss" scoped>
.container {
	border-left: 1px solid transparent;

	&:hover {
		border-left: 1px solid $--node-creator-item-hover-border-color;
		background-color: $--node-creator-item-hover-background-color;
	}

	&.active {
		border-left: 1px solid $--color-primary !important;
	}
}

.subcategory > div {
	display: flex;
	padding: 11px 16px 11px 30px;

	.details {
		flex-grow: 1;
	}

	.title {
		font-size: 14px;
		font-weight: bold;
		letter-spacing: 0;
		line-height: 16px;
		margin-bottom: 3px;
	}

	.description {
		font-size: 11px;
		letter-spacing: 0;
		line-height: 15px;
		font-weight: 400;
	}

	.action {
		display: flex;
		align-items: center;
	}
}

.subcategory + .category,
.node + .category {
	margin-top: 15px;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: #8d939c;
}

</style>