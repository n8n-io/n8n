<template>
	<div>
		<aside
			:class="{
				[$style.nodeCreatorScrim]: true,
				[$style.active]: showScrim,
			}"
		/>
		<SlideTransition>
			<div
				v-if="active"
				ref="nodeCreator"
				:class="{ [$style.nodeCreator]: true, [$style.chatOpened]: chatSidebarOpen }"
				:style="nodeCreatorInlineStyle"
				data-test-id="node-creator"
				@dragover="onDragOver"
				@drop="onDrop"
				@mousedown="onMouseDown"
				@mouseup="onMouseUp"
			>
				<NodesListPanel @node-type-selected="onNodeTypeSelected" />
			</div>
		</SlideTransition>
	</div>
</template>

<script setup lang="ts">
import { watch, reactive, toRefs, computed, onBeforeUnmount } from 'vue';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import SlideTransition from '@/components/transitions/SlideTransition.vue';

import { useViewStacks } from './composables/useViewStacks';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { useActionsGenerator } from './composables/useActionsGeneration';
import NodesListPanel from './Panel/NodesListPanel.vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUIStore } from '@/stores/ui.store';
import { useAIStore } from '@/stores/ai.store';
import { DRAG_EVENT_DATA_KEY } from '@/constants';

export interface Props {
	active?: boolean;
	onNodeTypeSelected?: (nodeType: string[]) => void;
}

const props = defineProps<Props>();
const { resetViewStacks } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const emit = defineEmits<{
	(event: 'closeNodeCreator'): void;
	(event: 'nodeTypeSelected', value: string[]): void;
}>();
const uiStore = useUIStore();
const aiStore = useAIStore();

const { setShowScrim, setActions, setMergeNodes } = useNodeCreatorStore();
const { generateMergedNodesAndActions } = useActionsGenerator();

const state = reactive({
	nodeCreator: null as HTMLElement | null,
	mousedownInsideEvent: null as MouseEvent | null,
});

const showScrim = computed(() => useNodeCreatorStore().showScrim);

const viewStacksLength = computed(() => useViewStacks().viewStacks.length);

const chatSidebarOpen = computed(() => aiStore.assistantChatOpen);

const nodeCreatorInlineStyle = computed(() => {
	return { top: `${uiStore.bannersHeight + uiStore.headerHeight}px` };
});
function onMouseUpOutside() {
	if (state.mousedownInsideEvent) {
		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		state.mousedownInsideEvent.target?.dispatchEvent(clickEvent);
		state.mousedownInsideEvent = null;
		unBindOnMouseUpOutside();
	}
}
function unBindOnMouseUpOutside() {
	document.removeEventListener('mouseup', onMouseUpOutside);
	document.removeEventListener('touchstart', onMouseUpOutside);
}
function onMouseUp() {
	state.mousedownInsideEvent = null;
	unBindOnMouseUpOutside();
}
function onMouseDown(event: MouseEvent) {
	state.mousedownInsideEvent = event;
	document.addEventListener('mouseup', onMouseUpOutside);
	document.addEventListener('touchstart', onMouseUpOutside);
}
function onDragOver(event: DragEvent) {
	event.preventDefault();
}
function onDrop(event: DragEvent) {
	if (!event.dataTransfer) {
		return;
	}

	const dragData = event.dataTransfer.getData(DRAG_EVENT_DATA_KEY);
	const nodeCreatorBoundingRect = (state.nodeCreator as Element).getBoundingClientRect();

	// Abort drag end event propagation if dropped inside nodes panel
	if (
		dragData &&
		event.pageX >= nodeCreatorBoundingRect.x &&
		event.pageY >= nodeCreatorBoundingRect.y
	) {
		event.stopPropagation();
	}
}

watch(
	() => props.active,
	(isActive) => {
		if (!isActive) {
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
	() => ({
		httpOnlyCredentials: useCredentialsStore().httpOnlyCredentialTypes,
		nodeTypes: useNodeTypesStore().visibleNodeTypes,
	}),
	({ nodeTypes, httpOnlyCredentials }) => {
		const { actions, mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);

		setActions(actions);
		setMergeNodes(mergedNodes);
	},
	{ immediate: true },
);
const { nodeCreator } = toRefs(state);

onBeforeUnmount(() => {
	unBindOnMouseUpOutside();
});
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

	&.chatOpened {
		right: $chat-width;
	}
}

.nodeCreatorScrim {
	position: fixed;
	top: $header-height;
	right: 0;
	bottom: 0;
	left: $sidebar-width;
	opacity: 0;
	z-index: 1;
	background: var(--color-dialog-overlay-background);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.active {
		opacity: 0.7;
	}
}
</style>
