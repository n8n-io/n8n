<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeStickyNoteRender } from '@/types';
import { ref, computed, useCssModule, onMounted, onBeforeUnmount } from 'vue';
import { NodeResizer } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer';
import type { XYPosition } from '@vue-flow/core';

defineOptions({
	inheritAttrs: false,
});

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	move: [position: XYPosition];
	activate: [id: string];
	deactivate: [id: string];
	'open:contextmenu': [event: MouseEvent];
}>();

const $style = useCssModule();

const { id, isSelected, isReadOnly, render, eventBus } = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

const classes = computed(() => ({
	[$style.sticky]: true,
	[$style.selected]: isSelected.value,
	['sticky--active']: isActive.value, // Used to increase the z-index of the sticky note when editing
}));

/**
 * Resizing
 */

function onResize(event: OnResize) {
	emit('move', {
		x: event.params.x,
		y: event.params.y,
	});

	emit('update', {
		...(event.params.width ? { width: event.params.width } : {}),
		...(event.params.height ? { height: event.params.height } : {}),
	});
}

/**
 * Content change
 */

const isActive = ref(false);

function onInputChange(value: string) {
	emit('update', {
		content: value,
	});
}

function onSetActive(value: boolean) {
	if (isActive.value === value) return;

	isActive.value = value;

	if (value) {
		emit('activate', id.value);
	} else {
		emit('deactivate', id.value);
	}
}

function onActivate() {
	onSetActive(true);
}

/**
 * Context menu
 */

function openContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

/**
 * Lifecycle
 */

onMounted(() => {
	eventBus.value?.on('update:node:activated', onActivate);
});

onBeforeUnmount(() => {
	eventBus.value?.off('update:node:activated', onActivate);
});
</script>
<template>
	<NodeResizer
		:min-height="80"
		:min-width="150"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:is-visible="!isReadOnly"
		@resize="onResize"
	/>
	<N8nSticky
		v-bind="$attrs"
		:id="id"
		:class="classes"
		data-test-id="sticky"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:model-value="renderOptions.content"
		:background-color="renderOptions.color"
		:edit-mode="isActive"
		:read-only="isReadOnly"
		@edit="onSetActive"
		@dblclick.stop="onActivate"
		@update:model-value="onInputChange"
		@contextmenu="openContextMenu"
	/>
</template>

<style lang="scss" module>
.sticky {
	position: relative;

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		box-shadow: 0 0 0 4px var(--color-canvas-selected);
	}
}
</style>
