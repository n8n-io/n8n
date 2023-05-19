<template>
	<div>
		<aside :class="{ [$style.nodeCreatorScrim]: true, [$style.active]: showScrim }" />
		<slide-transition>
			<div
				v-if="active"
				:class="$style.nodeCreator"
				ref="nodeCreator"
				v-click-outside="onClickOutside"
				@dragover="onDragOver"
				@drop="onDrop"
				@mousedown="onMouseDown"
				@mouseup="onMouseUp"
				data-test-id="node-creator"
			>
				<NodesListPanel @nodeTypeSelected="$listeners.nodeTypeSelected" />
			</div>
		</slide-transition>
	</div>
</template>

<script setup lang="ts">
import { watch, reactive, toRefs, computed } from 'vue';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import SlideTransition from '@/components/transitions/SlideTransition.vue';

import { useViewStacks } from './composables/useViewStacks';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { useActionsGenerator } from './composables/useActionsGeneration';
import NodesListPanel from './Panel/NodesListPanel.vue';

export interface Props {
	active?: boolean;
}

const props = defineProps<Props>();
const { resetViewStacks } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const emit = defineEmits<{
	(event: 'closeNodeCreator'): void;
	(event: 'nodeTypeSelected', value: string[]): void;
}>();

const { setShowScrim, setActions, setMergeNodes } = useNodeCreatorStore();
const { generateMergedNodesAndActions } = useActionsGenerator();

const state = reactive({
	nodeCreator: null as HTMLElement | null,
	mousedownInsideEvent: null as MouseEvent | null,
});

const showScrim = computed(() => useNodeCreatorStore().showScrim);

const viewStacksLength = computed(() => useViewStacks().viewStacks.length);

function onClickOutside(event: Event) {
	// We need to prevent cases where user would click inside the node creator
	// and try to drag non-draggable element. In that case the click event would
	// be fired and the node creator would be closed. So we stop that if we detect
	// that the click event originated from inside the node creator. And fire click even on the
	// original target.
	if (state.mousedownInsideEvent) {
		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		state.mousedownInsideEvent.target?.dispatchEvent(clickEvent);
		state.mousedownInsideEvent = null;
		return;
	}

	if (event.type === 'click') {
		emit('closeNodeCreator');
	}
}
function onMouseUp() {
	state.mousedownInsideEvent = null;
}
function onMouseDown(event: MouseEvent) {
	state.mousedownInsideEvent = event;
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
	if (
		nodeTypeName &&
		event.pageX >= nodeCreatorBoundingRect.x &&
		event.pageY >= nodeCreatorBoundingRect.y
	) {
		event.stopPropagation();
	}
}

watch(
	() => props.active,
	(isActive) => {
		if (isActive === false) {
			setShowScrim(false);
			resetViewStacks();
		}
	},
);

// Close node creator when the last view stacks is closed
watch(viewStacksLength, (viewStacksLength) => {
	if (viewStacksLength === 0) {
		emit('closeNodeCreator');
		setShowScrim(false);
	}
});

registerKeyHook('NodeCreatorCloseEscape', {
	keyboardKeys: ['Escape'],
	handler: () => emit('closeNodeCreator'),
});
registerKeyHook('NodeCreatorCloseTab', {
	keyboardKeys: ['Tab'],
	handler: () => emit('closeNodeCreator'),
});

watch(
	() => useNodeTypesStore().visibleNodeTypes,
	(nodeTypes) => {
		const { actions, mergedNodes } = generateMergedNodesAndActions(nodeTypes);

		setActions(actions);
		setMergeNodes(mergedNodes);
	},
	{ immediate: true },
);
const { nodeCreator } = toRefs(state);
</script>

<style module lang="scss">
:global(strong) {
	font-weight: var(--font-weight-bold);
}
.nodeCreator {
	--node-icon-color: var(--color-text-base);
	position: fixed;
	top: $header-height;
	bottom: 0;
	right: 0;
	z-index: 200;
	width: $node-creator-width;
	color: $node-creator-text-color;
}

.nodeCreatorScrim {
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

	&.active {
		opacity: 0.7;
	}
}
</style>
