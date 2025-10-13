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
import { DRAG_EVENT_DATA_KEY } from '@/constants';
import { useChatPanelStore } from '@/features/assistant/chatPanel.store';
import type { NodeTypeSelectedPayload } from '@/Interface';
import { onClickOutside } from '@vueuse/core';

import { N8nIconButton } from '@n8n/design-system';
// elements that should not trigger onClickOutside
const OUTSIDE_CLICK_WHITELIST = [
	// different modals
	'.el-overlay-dialog',
];

export interface Props {
	active?: boolean;
	onNodeTypeSelected?: (value: NodeTypeSelectedPayload[]) => void;
}

const props = defineProps<Props>();
const { resetViewStacks } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const emit = defineEmits<{
	closeNodeCreator: [];
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();
const uiStore = useUIStore();
const chatPanelStore = useChatPanelStore();

const { setShowScrim, setActions, setMergeNodes } = useNodeCreatorStore();
const { generateMergedNodesAndActions } = useActionsGenerator();

const state = reactive({
	nodeCreator: null as HTMLElement | null,
	mousedownInsideEvent: null as MouseEvent | null,
});

const showScrim = computed(() => useNodeCreatorStore().showScrim);

const viewStacksLength = computed(() => useViewStacks().viewStacks.length);

const nodeCreatorInlineStyle = computed(() => {
	const rightPosition = getRightOffset();
	return { top: `${uiStore.bannersHeight + uiStore.headerHeight}px`, right: `${rightPosition}px` };
});

function getRightOffset() {
	if (chatPanelStore.isOpen) {
		return chatPanelStore.width;
	}

	return 0;
}

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
watch(viewStacksLength, (value) => {
	if (value === 0) {
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

onClickOutside(
	nodeCreator,
	() => {
		emit('closeNodeCreator');
	},
	{ ignore: OUTSIDE_CLICK_WHITELIST },
);
</script>

<template>
	<div>
		<aside
			:class="{
				[$style.nodeCreatorScrim]: true,
				[$style.active]: showScrim,
			}"
		/>
		<N8nIconButton
			v-if="active"
			:class="$style.close"
			type="secondary"
			icon="x"
			aria-label="Close Node Creator"
			@click="emit('closeNodeCreator')"
		/>
		<SlideTransition>
			<div
				v-if="active"
				ref="nodeCreator"
				:class="{ [$style.nodeCreator]: true }"
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

<style module lang="scss">
:global(strong) {
	font-weight: var(--font-weight--bold);
}
.nodeCreator {
	--node-creator-width: #{$node-creator-width};
	--node-icon-color: var(--color--text);
	position: fixed;
	top: $header-height;
	bottom: 0;
	right: 0;
	z-index: var(--z-index-node-creator);
	width: var(--node-creator-width);
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
	background: var(--color-dialog-overlay-background);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.active {
		opacity: 0.7;
	}
}

.close {
	position: absolute;
	z-index: calc(var(--z-index-node-creator) + 1);
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	background: transparent;
	border: 0;
	display: none;
}

@media screen and (max-width: #{$node-creator-width + $sidebar-width}) {
	.nodeCreator {
		--node-creator-width: calc(100vw - #{$sidebar-width});
	}

	.close {
		display: inline-flex;
	}
}
</style>
