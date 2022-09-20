<template>
	<div>
		<aside :class="{'node-creator-scrim': true, expanded: !sidebarMenuCollapsed, active: showCreatorPanelScrim}" />

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
	data() {
		return {
			allLatestNodeTypes: [] as INodeTypeDescription[],
		};
	},
	computed: {
		...mapGetters('users', ['personalizedNodeTypes']),
		showCreatorPanelScrim(): boolean {
			return this.$store.getters['ui/showCreatorPanelScrim'];
		},
		sidebarMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
		nodeTypes(): INodeTypeDescription[] {
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
	watch: {
		nodeTypes(newList) {
			if (newList.length !== this.allLatestNodeTypes.length) {
				this.allLatestNodeTypes = newList;
			}
		},
		active(isActive) {
			setTimeout(() => {
				// TODO: This is temporary just to showcase scrim functionality,
				// eventually the scrim will be triggered on "Choose a trigger" node
				this.$store.commit('ui/setShowCreatorPanelScrim', isActive);
			}, 200);
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

.node-creator-scrim {
	position: fixed;
	top: $--header-height;
	right: 0;
	bottom: 0;
	left: $--sidebar-width;
	opacity: 0;
	z-index: 1;
	background: var(--color-background-dark);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.expanded {
		left: $--sidebar-expanded-width
	}

	&.active {
		opacity: 0.7;
	}
}
</style>
