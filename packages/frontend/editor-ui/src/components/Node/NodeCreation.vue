<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type {
	AddedNodesAndConnections,
	NodeTypeSelectedPayload,
	ToggleNodeCreatorOptions,
} from '@/Interface';
import { useActions } from './NodeCreator/composables/useActions';
import { useThrottleFn } from '@vueuse/core';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const LazyNodeCreator = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreator/NodeCreator.vue'),
);

const props = withDefaults(defineProps<Props>(), {
	createNodeActive: false, // Determines if the node creator is open
});

const emit = defineEmits<{
	addNodes: [value: AddedNodesAndConnections];
	toggleNodeCreator: [value: ToggleNodeCreatorOptions];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const { getAddedNodesAndConnections } = useActions();

const wrapperRef = ref<HTMLElement | undefined>();
const wrapperBoundingRect = ref<DOMRect | undefined>();
const isStickyNotesButtonVisible = ref(true);

const onMouseMove = useThrottleFn((event: MouseEvent) => {
	if (wrapperBoundingRect.value) {
		const offset = 100;
		isStickyNotesButtonVisible.value =
			event.clientX >= wrapperBoundingRect.value.left - offset &&
			event.clientX <= wrapperBoundingRect.value.right + offset &&
			event.clientY >= wrapperBoundingRect.value.top - offset &&
			event.clientY <= wrapperBoundingRect.value.bottom + offset;
	} else {
		isStickyNotesButtonVisible.value = true;
	}
}, 250);

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

function closeNodeCreator(hasAddedNodes = false) {
	if (props.createNodeActive) {
		emit('toggleNodeCreator', { createNodeActive: false, hasAddedNodes });
	}
}

function nodeTypeSelected(value: NodeTypeSelectedPayload[]) {
	emit('addNodes', getAddedNodesAndConnections(value));
	closeNodeCreator(true);
}

function setWrapperRect() {
	wrapperBoundingRect.value = wrapperRef.value?.getBoundingClientRect();
}

onMounted(() => {
	setWrapperRect();

	document.addEventListener('mousemove', onMouseMove);
	window.addEventListener('resize', setWrapperRect);
});

onBeforeUnmount(() => {
	document.removeEventListener('mousemove', onMouseMove);
	window.removeEventListener('resize', setWrapperRect);
});
</script>

<template>
	<div v-if="!createNodeActive" :class="$style.nodeButtonsWrapper">
		<div ref="wrapperRef" :class="$style.nodeCreatorButton" data-test-id="node-creator-plus-button">
			<KeyboardShortcutTooltip
				:label="i18n.baseText('nodeView.openNodesPanel')"
				:shortcut="{ keys: ['Tab'] }"
				placement="left"
			>
				<n8n-icon-button
					size="large"
					icon="plus"
					type="tertiary"
					:class="$style.nodeCreatorPlus"
					@click="openNodeCreator"
				/>
			</KeyboardShortcutTooltip>
			<div
				:class="[$style.addStickyButton, isStickyNotesButtonVisible ? $style.visibleButton : '']"
				data-test-id="add-sticky-button"
				@click="addStickyNote"
			>
				<KeyboardShortcutTooltip
					:label="i18n.baseText('nodeView.addStickyHint')"
					:shortcut="{ keys: ['s'], shiftKey: true }"
					placement="left"
				>
					<n8n-icon-button type="tertiary" :icon="['far', 'note-sticky']" />
				</KeyboardShortcutTooltip>
			</div>
		</div>
	</div>
	<Suspense>
		<LazyNodeCreator
			:active="createNodeActive"
			@node-type-selected="nodeTypeSelected"
			@close-node-creator="closeNodeCreator"
		/>
	</Suspense>
</template>

<style lang="scss" module>
.nodeButtonsWrapper {
	position: absolute;
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
	top: var(--spacing-s);
	right: var(--spacing-s);
	pointer-events: all !important;
}
.nodeCreatorPlus {
	width: 36px;
	height: 36px;
}
</style>
