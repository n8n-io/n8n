<template>
	<div>
		<SlideTransition>
			<div class="node-creator" v-if="active" v-click-outside="closeCreator">
				<MainPanel @nodeTypeSelected="nodeTypeSelected" :categorizedItems="categorizedItems" :categoriesWithNodes="categoriesWithNodes" :searchItems="searchItems"></MainPanel>
			</div>
		</SlideTransition>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { ICategoriesWithNodes, INodeCreateElement } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import SlideTransition from '../transitions/SlideTransition.vue';
import { HIDDEN_NODES  } from '@/constants';

import MainPanel from './MainPanel.vue';
import { getCategoriesWithNodes, getCategorizedList } from './helpers';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		MainPanel,
		SlideTransition,
	},
	props: [
		'active',
	],
	computed: {
		visibleNodeTypes(): INodeTypeDescription[] {
			return this.$store.getters.allNodeTypes
				.filter((nodeType: INodeTypeDescription) => {
					return !HIDDEN_NODES.includes(nodeType.name);
				});
		},
		categoriesWithNodes(): ICategoriesWithNodes {
			return getCategoriesWithNodes(this.visibleNodeTypes);
		},
		categorizedItems(): INodeCreateElement[] {
			return getCategorizedList(this.categoriesWithNodes);
		},
		searchItems(): INodeCreateElement[] {
			const sorted = [...this.visibleNodeTypes];
			sorted.sort((a, b) => {
				const textA = a.displayName.toLowerCase();
				const textB = b.displayName.toLowerCase();
				return textA < textB ? -1 : textA > textB ? 1 : 0;
			});

			return sorted.map((nodeType) => ({
				type: 'node',
				category: '',
				key: `${nodeType.name}`,
				properties: {
					nodeType,
					subcategory: '',
				},
				includedByTrigger: nodeType.group.includes('trigger'),
				includedByRegular: !nodeType.group.includes('trigger'),
			}));
		},
	},
	methods: {
		closeCreator () {
			this.$emit('closeNodeCreator');
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
	},
});
</script>

<style scoped lang="scss">
/deep/ *, *:before, *:after {
	box-sizing: border-box;
}

.node-creator {
	position: fixed;
	top: $--header-height;
	right: 0;
	width: $--node-creator-width;
	height: 100%;
	background-color: $--node-creator-background-color;
	z-index: 200;
	color: $--node-creator-text-color;

	&:before {
		box-sizing: border-box;
		content: ' ';
		border-left: 1px solid $--node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}
</style>
