<template>
  <div>
		<div
			v-for="(element, index) in elements"
			:key="index"
			@click="() => selected(element)"
			:class="{container: true, active: activeIndex === index && !disabled, clickable: !disabled, [element.type]: true}"
		>
			<div v-if="element.type === 'category'">
				<span class="name">{{ element.category }}</span>
				<font-awesome-icon class="arrow" icon="chevron-down" v-if="element.expanded" />
				<font-awesome-icon class="arrow" icon="chevron-up" v-else />
			</div>

			<div 
				v-if="element.type === 'subcategory'">
				<div class="details">
					<div class="title">{{element.subcategory}}</div>
					<div v-if="element.description" class="description">{{element.description}}</div>
				</div>
				<div class="action">
					<font-awesome-icon class="arrow" icon="arrow-right" />
				</div>
			</div>

			<NodeCreateItem
				v-if="element.type === 'node'"
				:nodeType="element.nodeType"
				:bordered="index < elements.length - 1 && elements[index + 1].type === 'node'"
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
	props: ['elements', 'activeIndex', 'disabled'],
	methods: {
		selected (element: INodeCreateElement) {
			if (this.$props.disabled) {
				return;
			}

			if (element.type === 'node' && element.nodeType) {
				this.$emit('nodeTypeSelected', element.nodeType.name);
			}
			else if (element.type === 'category') {
				this.$emit('categorySelected', element.category);
			}
			else if (element.type === 'subcategory') {
				this.$emit('subcategorySelected', {category: element.category, subcategory: element.subcategory});
			}
		},
	},
});

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

.category > div {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  line-height: 11px;
	padding: 10px 12px 10px 0;
	margin-left: 12px;
	border-bottom: 1px solid $--node-creator-border-color;
	display: flex;

	.name {
		flex-grow: 1;
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
	color: #8D939C;
}
</style>
