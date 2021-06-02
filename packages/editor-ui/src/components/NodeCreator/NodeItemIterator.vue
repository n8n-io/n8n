<template>
  <div>
			<div
				v-for="(element, index) in elements"
				:key="getKey(element)"
				@click="() => selected(element)"
				:class="{container: true, active: activeIndex === index && !disabled, clickable: !disabled, [element.type]: true}"
			>
				<NodeCreateItem
					v-if="element.type === 'node'"
					:nodeType="element.nodeType"
					:bordered="index < elements.length - 1 && elements[index + 1].type === 'node'"
				></NodeCreateItem>
			</div>
	</div>
</template>

<script lang="ts">

import NodeCreateItem from './NodeCreateItem.vue';
import { INodeCreateElement } from '@/Interface';

import Vue from 'vue';

export default Vue.extend({
	name: 'NodeItemIterator',
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
		},
		getKey (element: INodeCreateElement) {
			return element.nodeType && element.nodeType.name;
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
	padding: 10px 0;
	margin-left: 12px;
	margin-right: 12px;
	border-bottom: 1px solid $--node-creator-border-color;
	display: flex;
	text-transform: uppercase;

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
	color: #8D939C;
}
</style>
