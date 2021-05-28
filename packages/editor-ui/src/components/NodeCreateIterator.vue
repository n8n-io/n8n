<template>
  <div>
		<div
			v-for="(element, index) in elements"
			:key="index"
			@click="() => selected(element)"
			:class="{container: true, active: activeIndex === index}"
		>
			<div v-if="element.type === 'category'" class="category">
				<span class="name">{{ element.category }}</span>
				<font-awesome-icon class="arrow" icon="chevron-down" v-if="element.expanded" />
				<font-awesome-icon class="arrow" icon="chevron-up" v-else />
			</div>

			<div 
				v-if="element.type === 'subcategory'"
				class="subcategory">
				<div class="details">
					<div class="title">{{element.subcategory}}</div>
					<div class="description">Lorem ipsum testlkjre dfkl jsdf </div>
				</div>
				<div class="action">
					<font-awesome-icon class="arrow" icon="arrow-right" />
				</div>
			</div>

			<NodeCreateItem
				v-if="element.type === 'node'"
				:nodeType="element.nodeType"
			></NodeCreateItem>
		</div>
	</div>
</template>

<script lang="ts">

import NodeCreateItem from '@/components/NodeCreateItem.vue';
import { INodeCreateElement } from '@/Interface';

import Vue from 'vue';

export default Vue.extend({
	name: 'NodeCreateIterator',
	components: {
		NodeCreateItem,
	},
	props: ['elements', 'activeIndex'],
	methods: {
		selected (element: INodeCreateElement) {
			if (element.type === 'node' && element.nodeType) {
				this.$emit('nodeTypeSelected', element.nodeType.name);
			}
			else if (element.type === 'category') {
				this.$emit('categorySelected', element.category);
			}
			else if (element.type === 'subcategory') {
				this.$emit('subcategorySelected', element.subcategory);
			}
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

.container:hover {
	border-left: 1px solid $--node-creator-item-hover-border-color;
	background-color: $--node-creator-item-hover-background-color;
}

.active {
	border-left: 1px solid $--color-primary !important;
}

.category, .subcategory {
	cursor: pointer;
	border-left: 1px solid $--node-creator-border-color;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: #8D939C;
}
</style>
