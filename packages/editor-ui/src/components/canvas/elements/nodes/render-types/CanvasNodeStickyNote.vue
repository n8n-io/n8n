<script setup lang="ts">
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeStickyNoteRender } from '@/types';
import { ref, computed } from 'vue';
import { NodeResizer } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer/dist/types';
import type { XYPosition } from '@vue-flow/core';

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	move: [position: XYPosition];
}>();

const { id, renderOptions: unresolvedRenderOptions } = useCanvasNode();

const renderOptions = computed(
	() => unresolvedRenderOptions.value as CanvasNodeStickyNoteRender['options'],
);

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
		:id="id"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:class="$style.sticky"
		:model-value="renderOptions.content"
		:background="renderOptions.color"
		:edit-mode="isActive"
		@edit="onEdit"
		@update:model-value="onInputChange"
	/>
	<!--

		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"


		:scale="nodeViewScale"
		:background-color="node.parameters.color"
		:read-only="isReadOnly"
		:default-text="defaultText"
		:edit-mode="isActive && !isReadOnly"
		:grid-size="gridSize"
		@edit="onEdit"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
		@markdown-click="onMarkdownClick"
		@update:model-value="onInputChange"
	-->
</template>

<style lang="scss" module>
.sticky {
	position: relative;
	width: 100%;
	height: 100%;
}
</style>
