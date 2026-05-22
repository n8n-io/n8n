<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import type {
	CanvasNodeData,
	CanvasNodeEventBusEvents,
	CanvasNodeStickyNoteRender,
} from '../../../../canvas.types';
import { ref, computed, useCssModule, onMounted, onBeforeUnmount } from 'vue';
import { NodeResizer } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer';
import type { XYPosition } from '@vue-flow/core';
import type { EventBus } from '@n8n/utils/event-bus';

import { N8nSticky } from '@n8n/design-system';
defineOptions({
	inheritAttrs: false,
});

const props = defineProps<{
	id: string;
	selected: boolean;
	readOnly: boolean;
	render: CanvasNodeData['render'];
	eventBus: EventBus<CanvasNodeEventBusEvents>;
}>();

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	move: [position: XYPosition];
	activate: [id: string];
	deactivate: [id: string];
	'open:contextmenu': [event: MouseEvent];
}>();

const $style = useCssModule();

const renderOptions = computed(() => props.render.options as CanvasNodeStickyNoteRender['options']);

const classes = computed(() => ({
	[$style.sticky]: true,
	[$style.selected]: props.selected,
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
		emit('activate', props.id);
	} else {
		emit('deactivate', props.id);
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
	props.eventBus.on('update:node:activated', onActivate);
});

onBeforeUnmount(() => {
	props.eventBus.off('update:node:activated', onActivate);
});
</script>
<template>
	<NodeResizer
		:min-height="80"
		:min-width="150"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:is-visible="!readOnly"
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
		:read-only="readOnly"
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
		box-shadow: 0 0 0 4px var(--canvas--color--selected);
	}
}
</style>
