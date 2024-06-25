<script setup lang="ts">
import { defineAsyncComponent, reactive } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { AddedNodesAndConnections, ToggleNodeCreatorOptions } from '@/Interface';
import { useActions } from './NodeCreator/composables/useActions';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const NodeCreator = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreator/NodeCreator.vue'),
);

const props = withDefaults(defineProps<Props>(), {
	createNodeActive: false,
});

const emit = defineEmits<{
	(event: 'addNodes', value: AddedNodesAndConnections): void;
	(event: 'toggleNodeCreator', value: ToggleNodeCreatorOptions): void;
}>();

const state = reactive({
	showStickyButton: false,
});

const uiStore = useUIStore();

const { getAddedNodesAndConnections } = useActions();

function onCreateMenuHoverIn(mouseinEvent: MouseEvent) {
	const buttonsWrapper = mouseinEvent.target as Element;

	// Once the popup menu is hovered, it's pointer events are disabled so it's not interfering with element underneath it.
	state.showStickyButton = true;
	const moveCallback = (mousemoveEvent: MouseEvent) => {
		if (buttonsWrapper) {
			const wrapperBounds = buttonsWrapper.getBoundingClientRect();
			const wrapperH = wrapperBounds.height;
			const wrapperW = wrapperBounds.width;
			const wrapperLeftNear = wrapperBounds.left;
			const wrapperLeftFar = wrapperLeftNear + wrapperW;
			const wrapperTopNear = wrapperBounds.top;
			const wrapperTopFar = wrapperTopNear + wrapperH;
			const inside =
				mousemoveEvent.pageX > wrapperLeftNear &&
				mousemoveEvent.pageX < wrapperLeftFar &&
				mousemoveEvent.pageY > wrapperTopNear &&
				mousemoveEvent.pageY < wrapperTopFar;
			if (!inside) {
				state.showStickyButton = false;
				document.removeEventListener('mousemove', moveCallback, false);
			}
		}
	};
	document.addEventListener('mousemove', moveCallback, false);
}

function openNodeCreator() {
	emit('toggleNodeCreator', {
		source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		createNodeActive: true,
	});
}

function addStickyNote() {
	if (document.activeElement) {
		(document.activeElement as HTMLElement).blur();
	}

	const offset: [number, number] = [...uiStore.nodeViewOffsetPosition];

	const position = getMidCanvasPosition(props.nodeViewScale, offset);
	position[0] -= DEFAULT_STICKY_WIDTH / 2;
	position[1] -= DEFAULT_STICKY_HEIGHT / 2;

	emit('addNodes', getAddedNodesAndConnections([{ type: STICKY_NODE_TYPE, position }]));
}

function closeNodeCreator() {
	emit('toggleNodeCreator', { createNodeActive: false });
}

function nodeTypeSelected(nodeTypes: string[]) {
	emit('addNodes', getAddedNodesAndConnections(nodeTypes.map((type) => ({ type }))));
	closeNodeCreator();
}
</script>

<template>
	<div>
		<div
			v-if="!createNodeActive"
			:class="[$style.nodeButtonsWrapper, state.showStickyButton ? $style.noEvents : '']"
			@mouseenter="onCreateMenuHoverIn"
		>
			<div :class="$style.nodeCreatorButton" data-test-id="node-creator-plus-button">
				<KeyboardShortcutTooltip
					:label="$locale.baseText('nodeView.openNodesPanel')"
					:shortcut="{ keys: ['Tab'] }"
					placement="left"
				>
					<n8n-icon-button
						size="xlarge"
						icon="plus"
						type="tertiary"
						:class="$style.nodeCreatorPlus"
						@click="openNodeCreator"
					/>
				</KeyboardShortcutTooltip>
				<div
					:class="[$style.addStickyButton, state.showStickyButton ? $style.visibleButton : '']"
					data-test-id="add-sticky-button"
					@click="addStickyNote"
				>
					<KeyboardShortcutTooltip
						:label="$locale.baseText('nodeView.addStickyHint')"
						:shortcut="{ keys: ['s'], shiftKey: true }"
						placement="left"
					>
						<n8n-icon-button type="tertiary" :icon="['far', 'note-sticky']" />
					</KeyboardShortcutTooltip>
				</div>
			</div>
		</div>
		<Suspense>
			<NodeCreator
				:active="createNodeActive"
				@node-type-selected="nodeTypeSelected"
				@close-node-creator="closeNodeCreator"
			/>
		</Suspense>
	</div>
</template>

<style lang="scss" module>
.nodeButtonsWrapper {
	position: absolute;
	width: 150px;
	height: 200px;
	top: 0;
	right: 0;
	display: flex;
}

.addStickyButton {
	margin-top: var(--spacing-2xs);
	opacity: 0;
	transition: 0.1s;
	transition-timing-function: linear;
}

.visibleButton {
	opacity: 1;
	pointer-events: all;
}

.noEvents {
	pointer-events: none;
}

.nodeCreatorButton {
	position: absolute;
	text-align: center;
	top: var(--spacing-l);
	right: var(--spacing-l);
	pointer-events: all !important;

	button {
		border-color: var(--color-button-node-creator-border-font);
		color: var(--color-button-node-creator-border-font);

		&:hover {
			color: var(--color-button-node-creator-hover-font);
			border-color: var(--color-button-node-creator-hover-border);
			background: var(--color-button-node-creator-background);
		}
	}
}
.nodeCreatorPlus {
	border-width: 2px;
	border-radius: var(--border-radius-base);
	width: 36px;
	height: 36px;
}
</style>
