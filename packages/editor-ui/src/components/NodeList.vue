<template>
	<div :class="$style.list">
		<div
			v-for="node in filteredCoreNodes.slice(0, countNodesToBeSliced(filteredCoreNodes))"
			:class="$style.container"
			:key="node.name"
		>
			<TemplateNodeIcon
				:nodeType="node"
				:size="nodeSize"
				:title="node.name"
			/>
		</div>
		<div :class="$style.button" v-if="filteredCoreNodes.length > nodesToBeShown + 1">
			+{{ filteredCoreNodes.length - countNodesToBeSliced(filteredCoreNodes) }}
		</div>
	</div>
</template>

<script lang="ts">
import TemplateNodeIcon from '@/components/TemplateNodeIcon.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplateCategories } from '@/Interface';

interface INode {
	displayName: string;
	defaults: {
		color: string;
	};
	categories: ITemplateCategories[];
	icon: string;
	iconData?: {
		fileBuffer?: string;
		type?: string;
	};
	name: string;
	typeVersion: number;
}

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'NodeList',
	props: {
		nodes: {
			type: Array,
		},
		nodeSize: {
			type: Number,
			default: 18,
		},
	},
	data() {
		return {
			nodesToBeShown: 4,
		};
	},
	components: {
		TemplateNodeIcon,
	},
	computed: {
		filteredCoreNodes() {
			return this.nodes.filter((elem) => {
				const node = elem as INode;
				if (node.categories) {
					return node.categories.some((category: ITemplateCategories) => {
						return category.name !== 'Core Nodes';
					});
				} else {
					return node;
				}
			});
		},
	},
	methods: {
		countNodesToBeSliced(nodes: []): number {
			if (nodes.length > this.nodesToBeShown) {
				return this.nodesToBeShown - 1;
			} else {
				return this.nodesToBeShown;
			}
		},
	},
});
</script>

<style lang="scss" module>
  .list {
  	max-width: 100px;
  	height: 20px;
  	display: flex;
  	flex-direction: row;
  	justify-content: flex-end;
  	align-items: center;

  	.container {
  		width: 18px;
  		height: 18px;
  		margin-left: var(--spacing-2xs);
  		position: relative;
  		display: block;

  		.image {
  			width: 18px;
  			height: 18px;
  			display: block;
  		}
  	}

  	.button {
  		width: 20px;
  		min-width: 20px;
  		height: 20px;
  		margin-left: var(--spacing-2xs);
  		top: 0px;
  		position: relative;
  		display: flex;
  		justify-content: center;
  		align-items: center;
  		background: var(--color-background-light);
  		border: $--version-card-border;
  		border-radius: var(--border-radius-base);
  		font-size: 10px;
  		font-weight: var(--font-weight-bold);
  		color: var(--color-text-base);
  	}
  }
</style>
