<template>
	<div class="container">
		<div class="category">
			<span>{{ name }}</span>
		</div>
		<NodeCreateIterator v-if="hasOneSubcategory && expanded" :nodeTypes="firstSubcategoryNodes"/>
		<div v-else>
			<div class="subcategory" v-for="subcategory in subcategoryNames" :key="subcategory">
				<div class="title">{{subcategory}}</div>
				<div class="description">Lorem ipsum testlkjre dfkl jsdf </div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { ICategorizedNodes, INodeTypeTemp, ISubCategorizedNodes } from '@/Interface';
import NodeCreateIterator from './NodeCreateIterator.vue';

export default Vue.extend({
	name: 'NodeCreateCategory',
	components: {
		NodeCreateIterator
	},
	props: [
		'name',
		'subcategories',
		'expanded',
	],
	computed: {
		hasOneSubcategory(): boolean {
			return Object.keys(this.subcategories).length === 1;
		},
		firstSubcategoryNodes(): INodeTypeTemp[] {
			return (this.subcategories as ISubCategorizedNodes)[Object.keys(this.subcategories)[0]];
		},
		subcategoryNames(): string[] {
			const subcategories = Object.keys(this.subcategories);
			subcategories.sort();

			return subcategories;
		},
	},
});
</script>

<style lang="scss" scoped>
.container {
	margin-bottom: 15px;
}

.category {
	border-bottom: 1px solid $--node-creator-border-color;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  line-height: 11px;
	padding: 10px 12px;
}

.subcategory {
	padding: 11px 16px 11px 30px;

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
	}
}
</style>
