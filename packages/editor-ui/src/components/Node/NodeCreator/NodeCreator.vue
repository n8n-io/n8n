<template>
	<div>
		<aside :class="{'node-creator-scrim': true, expanded: !sidebarMenuCollapsed, active: showScrim}" />

		<slide-transition>
			<div
				v-if="active"
				class="node-creator"
				ref="nodeCreator"
			 	v-click-outside="onClickOutside"
			 	@dragover="onDragOver"
			 	@drop="onDrop"
			>
				<main-panel
					@nodeTypeSelected="nodeTypeSelected"
					:searchItems="searchItems"
				/>
			</div>
		</slide-transition>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { INodeCreateElement } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import SlideTransition from '../../transitions/SlideTransition.vue';

import MainPanel from './MainPanel.vue';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		MainPanel,
		SlideTransition,
	},
	props: {
		active: {
			type: Boolean,
		},
	},
	computed: {
		showScrim(): boolean {
			return this.$store.getters['nodeCreator/showScrim'];
		},
		sidebarMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
		visibleNodeTypes(): INodeTypeDescription[] {
			return this.$store.getters['nodeTypes/visibleNodeTypes'];
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
		active(isActive) {
			if(isActive === false) this.$store.commit('nodeCreator/setShowScrim', false);
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
	bottom: 0;
	right: 0;
	z-index: 200;
	width: $node-creator-width;
	color: $node-creator-text-color;
}

.node-creator-scrim {
	position: fixed;
	top: $header-height;
	right: 0;
	bottom: 0;
	left: $sidebar-width;
	opacity: 0;
	z-index: 1;
	background: var(--color-background-dark);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.expanded {
		left: $sidebar-expanded-width
	}

	&.active {
		opacity: 0.7;
	}
}
</style>
