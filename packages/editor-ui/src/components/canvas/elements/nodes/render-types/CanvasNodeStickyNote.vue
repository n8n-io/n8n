<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeStickyNoteRender } from '@/types';
import { ref, computed } from 'vue';
import { NodeResizer } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer/dist/types';
import type { XYPosition } from '@vue-flow/core';

defineOptions({
	inheritAttrs: false,
});

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	move: [position: XYPosition];
	dblclick: [event: MouseEvent];
}>();

const { id, render } = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

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

function onEdit(edit: boolean) {
	isActive.value = edit;
}

function onDoubleClick(event: MouseEvent) {
	emit('dblclick', event);
}
</script>
<template>
	<NodeResizer
		:min-height="80"
		:min-width="150"
		:height="renderOptions.height"
		:width="renderOptions.width"
		@resize="onResize"
	/>
	<N8nSticky
		v-bind="$attrs"
		:id="id"
		data-test-id="canvas-sticky-note-node"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:class="$style.sticky"
		:model-value="renderOptions.content"
		:background="renderOptions.color"
		:edit-mode="isActive"
		@edit="onEdit"
		@dblclick="onDoubleClick"
		@update:model-value="onInputChange"
	/>
</template>

<style lang="scss" module>
.sticky {
	position: relative;
}
</style>
