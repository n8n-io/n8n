<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useCssModule, watch } from 'vue';
import { NodeResizeControl } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer';
import { N8nText } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getWebpageNodeSize, snapToGrid, WEBPAGE_NODE_MIN_SIZE } from '@/app/utils/nodeViewUtils';
import { useCanvas } from '../../../../composables/useCanvas';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeWebpageRender } from '../../../../canvas.types';
import CanvasNodeStatusIcons from './parts/CanvasNodeStatusIcons.vue';

// The page gets an opaque origin, so its scripts cannot use the n8n session of the user.
// Never add allow-same-origin, allow-top-navigation or allow-modals.
const IFRAME_SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';

// Milliseconds after selection before the page gets the pointer. This is about the
// double-click interval of most operating systems.
const SELECTION_SETTLE_DELAY = 500;

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	activate: [id: string, event: MouseEvent];
	'open:contextmenu': [event: MouseEvent];
}>();

const $style = useCssModule();

const { id, name, isDisabled, isReadOnly, isSelected, executionStatus, render } = useCanvasNode();
const { isPaneMoving, connectingHandle } = useCanvas();

const renderOptions = computed(() => render.value.options as CanvasNodeWebpageRender['options']);

/**
 * Resizing
 */

// The card keeps a local size during a resize and writes the parameters only at the end,
// so the workflow does not change on each drag step.
const resizedSize = ref<{ width: number; height: number }>();
const isResizing = ref(false);

const size = computed(() => resizedSize.value ?? getWebpageNodeSize(renderOptions.value));

const sizeStyle = computed(() => ({
	width: `${size.value.width}px`,
	height: `${size.value.height}px`,
}));

// Drop the local size only when the parameters have the new size, so the card does not flicker.
watch([() => renderOptions.value.width, () => renderOptions.value.height], () => {
	resizedSize.value = undefined;
});

function onResizeStart() {
	isResizing.value = true;
}

function onResize(event: OnResize) {
	resizedSize.value = {
		width: snapToGrid(event.params.width),
		height: snapToGrid(event.params.height),
	};
}

function onResizeEnd() {
	isResizing.value = false;
	if (resizedSize.value) {
		emit('update', { ...resizedSize.value });
	}
}

const canResize = computed(() => Boolean(isSelected.value) && !isReadOnly.value);

// The control does not emit resizeEnd when it hides during a resize, for example when
// the canvas becomes read-only. So reset the local resize state here.
watch(canResize, (value) => {
	if (!value && isResizing.value) {
		isResizing.value = false;
		resizedSize.value = undefined;
	}
});

/**
 * Interaction
 */

// The first click of a double click selects the node. The page gets the pointer only
// after a delay, so that the second click also reaches the canvas and opens the node.
const isSelectionSettled = ref(false);
let selectionSettleTimeout: ReturnType<typeof setTimeout> | undefined;

function clearSelectionSettleTimeout() {
	clearTimeout(selectionSettleTimeout);
	selectionSettleTimeout = undefined;
}

watch(
	isSelected,
	(selected) => {
		clearSelectionSettleTimeout();
		isSelectionSettled.value = false;
		if (selected) {
			selectionSettleTimeout = setTimeout(() => {
				isSelectionSettled.value = true;
			}, SELECTION_SETTLE_DELAY);
		}
	},
	{ immediate: true },
);

onBeforeUnmount(clearSelectionSettleTimeout);

// Pointer events inside an iframe never reach the canvas. So the page gets the pointer
// only when the user can edit the node and no canvas gesture is in progress.
const isInteractive = computed(
	() =>
		Boolean(isSelected.value) &&
		isSelectionSettled.value &&
		!isReadOnly.value &&
		!isResizing.value &&
		!isPaneMoving.value &&
		!connectingHandle.value,
);

const classes = computed(() => ({
	[$style.webpage]: true,
	[$style.selected]: isSelected.value,
	[$style.disabled]: isDisabled.value,
	[$style.error]: executionStatus.value === 'error' || executionStatus.value === 'crashed',
}));

const bodyClasses = computed(() => ({
	[$style.body]: true,
	[$style.interactive]: isInteractive.value,
	nodrag: isInteractive.value,
	nowheel: isInteractive.value,
}));

function onActivate(event: MouseEvent) {
	emit('activate', id.value, event);
}

function onOpenContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}
</script>

<template>
	<div
		:class="classes"
		:style="sizeStyle"
		data-test-id="canvas-node-webpage"
		@dblclick.stop="onActivate"
		@contextmenu="onOpenContextMenu"
	>
		<header :class="$style.header">
			<NodeIcon :icon-source="renderOptions.icon" :size="16" :disabled="isDisabled" />
			<N8nText :bold="true" size="small" :class="$style.label">{{ name }}</N8nText>
			<CanvasNodeStatusIcons size="medium" spinner-layout="static" />
		</header>
		<div :class="bodyClasses" data-test-id="canvas-node-webpage-body">
			<iframe
				:class="$style.frame"
				:srcdoc="renderOptions.html"
				:sandbox="IFRAME_SANDBOX"
				referrerpolicy="no-referrer"
				:title="name"
				data-test-id="canvas-node-webpage-frame"
			/>
		</div>
		<NodeResizeControl
			v-if="canResize"
			:node-id="id"
			position="bottom-right"
			:min-width="WEBPAGE_NODE_MIN_SIZE[0]"
			:min-height="WEBPAGE_NODE_MIN_SIZE[1]"
			@resize-start="onResizeStart"
			@resize="onResize"
			@resize-end="onResizeEnd"
		/>
	</div>
</template>

<style lang="scss" module>
@use './_canvasNodeStyles.scss' as styles;

.webpage {
	@include styles.canvas-node-border-defaults;
	--webpage-node--radius: var(--radius--sm);

	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--canvas-node--color--background, var(--node--color--background));
	@include styles.canvas-node-border;
	border-radius: var(--webpage-node--radius);

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		@include styles.canvas-node-selected-ring;
	}

	&.error {
		@include styles.status-error;
	}

	&.disabled {
		--canvas-node--border-color: var(
			--color-canvas-node-disabled-border-color,
			var(--color--foreground)
		);
	}
}

.header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.label {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	border-radius: 0 0 calc(var(--webpage-node--radius) - var(--canvas-node--border-width))
		calc(var(--webpage-node--radius) - var(--canvas-node--border-width));
}

.frame {
	display: block;
	width: 100%;
	height: 100%;
	border: 0;
	// Pages expect a white canvas, also in the dark theme.
	background-color: var(--color--neutral-white);
	pointer-events: none;

	.interactive & {
		pointer-events: auto;
	}

	// Vue Flow adds this class to the node while the user drags it.
	:global(.vue-flow__node.dragging) & {
		pointer-events: none;
	}
}
</style>
