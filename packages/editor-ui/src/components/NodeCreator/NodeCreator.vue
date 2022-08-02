<template>
	<div>
		<SlideTransition>
			<div
				v-if="active"
				class="node-creator"
				ref="nodeCreator"
			 	v-click-outside="onClickOutside"
			 	@dragover="onDragOver"
			 	@drop="onDrop"
			>
				<MainPanel
					@nodeTypeSelected="nodeTypeSelected"
					:categorizedItems="categorizedItems"
					:categoriesWithNodes="categoriesWithNodes"
					:searchItems="searchItems"
				/>
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
import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		MainPanel,
		SlideTransition,
	},
	props: [
		'active',
	],
	data() {
		return {
			allNodeTypes: [],
		};
	},
	computed: {
		...mapGetters('users', ['personalizedNodeTypes']),
		nodeTypes(): INodeTypeDescription[] {
			return this.$store.getters['nodeTypes/allNodeTypes'];
		},
		visibleNodeTypes(): INodeTypeDescription[] {
			return this.allNodeTypes
				.filter((nodeType: INodeTypeDescription) => {
					return !HIDDEN_NODES.includes(nodeType.name);
				}).reduce((accumulator: INodeTypeDescription[], currentValue: INodeTypeDescription) => {
					// keep only latest version of the nodes
					// accumulator starts as an empty array.
					const exists = accumulator.findIndex(nodes => nodes.name === currentValue.name);
					if (exists >= 0 && accumulator[exists].version < currentValue.version) {
						// This must be a versioned node and we've found a newer version.
						// Replace the previous one with this one.
						accumulator[exists] = currentValue;
					} else {
						accumulator.push(currentValue);
					}
					return accumulator;
				}, []);
		},
		categoriesWithNodes(): ICategoriesWithNodes {
			return getCategoriesWithNodes(this.visibleNodeTypes, this.personalizedNodeTypes as string[]);
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
		onClickOutside (e: Event) {
			if (e.type === 'click') {
				this.$emit('closeNodeCreator');
			}
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		onDragOver(event: DragEvent) {
			event.preventDefault();
		},
		onDrop(event: DragEvent) {
			if (!event.dataTransfer) {
				return;
			}

			const nodeTypeName = event.dataTransfer.getData('nodeTypeName');
			const nodeCreatorBoundingRect = (this.$refs.nodeCreator as Element).getBoundingClientRect();

			// Abort drag end event propagation if dropped inside nodes panel
			if (nodeTypeName && event.pageX >= nodeCreatorBoundingRect.x && event.pageY >= nodeCreatorBoundingRect.y) {
				event.stopPropagation();
			}
		},
	},
	watch: {
		nodeTypes(newList) {
			if (newList.length !== this.allNodeTypes.length) {
				this.allNodeTypes = newList;
			}
		},
	},
});
</script>

<style scoped lang="scss">
::v-deep *, *:before, *:after {
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
