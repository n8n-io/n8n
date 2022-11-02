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
			:simpleStyle="simpleNodeStyle"
			:allow-actions="allowActions"
			@dragstart="$listeners.dragstart"
			@dragend="$listeners.dragend"
			@nodeTypeSelected="$listeners.nodeTypeSelected"
		/>
	</div>
</template>

<script setup lang="ts">
import { INodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';

export interface Props {
	item: INodeCreateElement;
	active?: boolean;
	simpleNodeStyle?: boolean;
	clickable?: boolean;
	lastNode?: boolean;
	allowActions?: boolean;
}
defineProps<Props>();
</script>

<style lang="scss" scoped>
.container {
	border-left: 2px solid transparent;

	&:hover {
		border-color: $node-creator-item-hover-border-color;
	}

	&.active  {
		border-color: $color-primary !important;
	}
}

</style>
