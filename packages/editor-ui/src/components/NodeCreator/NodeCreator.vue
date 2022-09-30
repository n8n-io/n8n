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
	computed: {
		...mapGetters('users', ['personalizedNodeTypes']),
		allLatestNodeTypes(): INodeTypeDescription[] {
			return this.$store.getters['nodeTypes/allLatestNodeTypes'];
		},
		visibleNodeTypes(): INodeTypeDescription[] {
			return this.allLatestNodeTypes.filter((nodeType) => !nodeType.hidden);
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
});
</script>

<style scoped lang="scss">
::v-deep *, *:before, *:after {
	box-sizing: border-box;
}

.node-creator {
	position: fixed;
	top: $header-height;
	right: 0;
	width: $node-creator-width;
	height: 100%;
	background-color: $node-creator-background-color;
	z-index: 200;
	color: $node-creator-text-color;

	&:before {
		box-sizing: border-box;
		content: ' ';
		border-left: 1px solid $node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}
</style>
