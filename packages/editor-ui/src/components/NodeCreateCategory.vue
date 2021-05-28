<template>
	<div class="container">
		<div :class="{category: true, active: activeIndex === -1}">
			<span class="name">{{ name }}</span>
			<font-awesome-icon class="arrow" icon="chevron-down" v-if="expanded" />
			<font-awesome-icon class="arrow" icon="chevron-up" v-else />
		</div>
		<div v-if="hasSubcategories && expanded">
			<div 
				v-for="(subcategory, index) in subcategoryNames"
				:class="{subcategory, active: index === activeIndex}"
				:key="subcategory">
				<div class="details">
					<div class="title">{{subcategory}}</div>
					<div class="description">Lorem ipsum testlkjre dfkl jsdf </div>
				</div>
				<div class="action">
					<font-awesome-icon class="arrow" icon="arrow-right" />
				</div>
			</div>
		</div>
		<NodeCreateIterator v-else-if="expanded" :nodeTypes="firstSubcategoryNodes"/>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { INodeTypeTemp  } from '@/Interface';
import NodeCreateIterator from './NodeCreateIterator.vue';

export default Vue.extend({
	name: 'NodeCreateCategory',
	components: {
		NodeCreateIterator,
	},
	props: [
		'name',
		'subcategories',
		'expanded',
		'activeIndex',
	],
	computed: {
		hasSubcategories(): boolean {
			return this.subcategories && Object.keys(this.subcategories).length > 1;
		},
		firstSubcategoryNodes(): INodeTypeTemp[] {
			return this.subcategories && (this.subcategories as ISubCategorizedNodes)[Object.keys(this.subcategories)[0]];
		},
		subcategoryNames(): string[] {
			const subcategories = (this.subcategories && Object.keys(this.subcategories)) || [];
			subcategories.sort();

			return subcategories;
		},
	},
});
</script>

<style lang="scss" scoped>
.category {
	border-bottom: 1px solid $--node-creator-border-color;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  line-height: 11px;
	padding: 10px 12px;
	border-left: 1px solid $--node-creator-border-color;
	padding-top: 15px;
	display: flex;

	.name {
		flex-grow: 1;
	}
}

.subcategory {
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
	}

	.action {
		display: flex;
		align-items: center;
	}
}

.category, .subcategory {
	cursor: pointer;
	border-left: 1px solid $--node-creator-border-color;

	&.active {
		border-left: 1px solid $--color-primary; 
	}

	&:hover {
		border-left: 1px solid $--node-creator-item-hover-border-color;
		background-color: $--node-creator-item-hover-background-color;
	}
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: #8D939C;
}
</style>
