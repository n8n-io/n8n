<template>
	<div>
		<aside :class="{'node-creator-scrim': true, expanded: sidebarMenuCollapsed, active: showScrim}" />

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
					@nodeTypeSelected="$listeners.nodeTypeSelected"
					:searchItems="searchItems"
				/>
			</div>
		</slide-transition>
	</div>
</template>

<script setup lang="ts">

import { computed, watch, reactive, toRefs } from 'vue';

import { INodeCreateElement } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import SlideTransition from '@/components/transitions/SlideTransition.vue';

import MainPanel from './MainPanel.vue';
import { store } from '@/store';

export interface Props {
	active?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'closeNodeCreator'): void,
}>();

const state = reactive({
	nodeCreator: null as HTMLElement | null,
});

const showScrim = computed<boolean>(() => {
	return store.getters['nodeCreator/showScrim'];
});

const sidebarMenuCollapsed = computed<boolean>(() => {
	return store.getters['ui/sidebarMenuCollapsed'];
});

const visibleNodeTypes = computed<INodeTypeDescription[]>(() => {
	return store.getters['nodeTypes/visibleNodeTypes'];
});

const searchItems = computed<INodeCreateElement[]>(() => {
	const sorted = [...visibleNodeTypes.value];
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
});

function onClickOutside (event: Event) {
	if (event.type === 'click') {
		emit('closeNodeCreator');
	}
}
function onDragOver(event: DragEvent) {
	event.preventDefault();
}
function onDrop(event: DragEvent) {
	if (!event.dataTransfer) {
		return;
	}

	const nodeTypeName = event.dataTransfer.getData('nodeTypeName');
	const nodeCreatorBoundingRect = (state.nodeCreator as Element).getBoundingClientRect();

	// Abort drag end event propagation if dropped inside nodes panel
	if (nodeTypeName && event.pageX >= nodeCreatorBoundingRect.x && event.pageY >= nodeCreatorBoundingRect.y) {
		event.stopPropagation();
	}
}

watch(() => props.active, (isActive) => {
	if(isActive === false) store.commit('nodeCreator/setShowScrim', false);
});

const { nodeCreator } = toRefs(state);
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
