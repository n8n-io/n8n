<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

import N8nIconButton from '../N8nIconButton';

export interface Props {
	width?: number;
	height?: number;
	minWidth?: number;
	minHeight?: number;
	initialPosition?: { x: number; y: number };
}

const props = withDefaults(defineProps<Props>(), {
	width: 560,
	height: 700,
	minWidth: 400,
	minHeight: 300,
	initialPosition: undefined,
});

const emit = defineEmits<{
	close: [];
	resize: [{ width: number; height: number }];
}>();

const x = ref(0);
const y = ref(0);
const currentWidth = ref(0);
const currentHeight = ref(0);

// --- Drag state ---
const isDragging = ref(false);
let dragOffsetX = 0;
let dragOffsetY = 0;

// --- Resize state ---
type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const isResizing = ref(false);
let resizeEdge: ResizeEdge = 's';
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartPosX = 0;
let resizeStartPosY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

const isInteracting = ref(false);

function clampPosition(posX: number, posY: number, w: number, h: number) {
	const maxX = window.innerWidth - w;
	const maxY = window.innerHeight - h;
	return {
		x: Math.max(0, Math.min(posX, maxX)),
		y: Math.max(0, Math.min(posY, maxY)),
	};
}

function centerInViewport() {
	const pos = clampPosition(
		(window.innerWidth - currentWidth.value) / 2,
		(window.innerHeight - currentHeight.value) / 2,
		currentWidth.value,
		currentHeight.value,
	);
	x.value = pos.x;
	y.value = pos.y;
}

// --- Drag handlers ---
function onHeaderMouseDown(event: MouseEvent) {
	if (event.button !== 0) return;

	isDragging.value = true;
	isInteracting.value = true;
	dragOffsetX = event.clientX - x.value;
	dragOffsetY = event.clientY - y.value;

	document.addEventListener('mousemove', onDragMouseMove);
	document.addEventListener('mouseup', onDragMouseUp);
}

function onDragMouseMove(event: MouseEvent) {
	if (!isDragging.value) return;

	const pos = clampPosition(
		event.clientX - dragOffsetX,
		event.clientY - dragOffsetY,
		currentWidth.value,
		currentHeight.value,
	);
	x.value = pos.x;
	y.value = pos.y;
}

function onDragMouseUp() {
	isDragging.value = false;
	isInteracting.value = false;
	document.removeEventListener('mousemove', onDragMouseMove);
	document.removeEventListener('mouseup', onDragMouseUp);
}

// --- Resize handlers ---
function onResizeMouseDown(edge: ResizeEdge, event: MouseEvent) {
	if (event.button !== 0) return;
	event.preventDefault();

	resizeEdge = edge;
	isResizing.value = true;
	isInteracting.value = true;
	resizeStartX = event.clientX;
	resizeStartY = event.clientY;
	resizeStartPosX = x.value;
	resizeStartPosY = y.value;
	resizeStartWidth = currentWidth.value;
	resizeStartHeight = currentHeight.value;

	document.addEventListener('mousemove', onResizeMouseMove);
	document.addEventListener('mouseup', onResizeMouseUp);
}

function onResizeMouseMove(event: MouseEvent) {
	if (!isResizing.value) return;

	const dx = event.clientX - resizeStartX;
	const dy = event.clientY - resizeStartY;

	let newX = resizeStartPosX;
	let newY = resizeStartPosY;
	let newW = resizeStartWidth;
	let newH = resizeStartHeight;

	// Horizontal
	if (resizeEdge.includes('e')) {
		newW = Math.max(props.minWidth, resizeStartWidth + dx);
	} else if (resizeEdge.includes('w')) {
		const maxShrink = resizeStartWidth - props.minWidth;
		const clampedDx = Math.min(dx, maxShrink);
		newW = resizeStartWidth - clampedDx;
		newX = resizeStartPosX + clampedDx;
	}

	// Vertical
	if (resizeEdge.includes('s')) {
		newH = Math.max(props.minHeight, resizeStartHeight + dy);
	} else if (resizeEdge === 'n' || resizeEdge === 'ne' || resizeEdge === 'nw') {
		const maxShrink = resizeStartHeight - props.minHeight;
		const clampedDy = Math.min(dy, maxShrink);
		newH = resizeStartHeight - clampedDy;
		newY = resizeStartPosY + clampedDy;
	}

	// Clamp to viewport
	if (newX < 0) {
		newW += newX;
		newX = 0;
	}
	if (newY < 0) {
		newH += newY;
		newY = 0;
	}
	if (newX + newW > window.innerWidth) {
		newW = window.innerWidth - newX;
	}
	if (newY + newH > window.innerHeight) {
		newH = window.innerHeight - newY;
	}

	// Re-enforce minimums after clamping
	newW = Math.max(props.minWidth, newW);
	newH = Math.max(props.minHeight, newH);

	x.value = newX;
	y.value = newY;
	currentWidth.value = newW;
	currentHeight.value = newH;
}

function onResizeMouseUp() {
	isResizing.value = false;
	isInteracting.value = false;
	emit('resize', { width: currentWidth.value, height: currentHeight.value });
	document.removeEventListener('mousemove', onResizeMouseMove);
	document.removeEventListener('mouseup', onResizeMouseUp);
}

// --- Lifecycle ---
onMounted(() => {
	currentWidth.value = props.width;
	currentHeight.value = props.height;

	if (props.initialPosition) {
		const pos = clampPosition(
			props.initialPosition.x,
			props.initialPosition.y,
			currentWidth.value,
			currentHeight.value,
		);
		x.value = pos.x;
		y.value = pos.y;
	} else {
		centerInViewport();
	}
});

onBeforeUnmount(() => {
	document.removeEventListener('mousemove', onDragMouseMove);
	document.removeEventListener('mouseup', onDragMouseUp);
	document.removeEventListener('mousemove', onResizeMouseMove);
	document.removeEventListener('mouseup', onResizeMouseUp);
});
</script>

<template>
	<div
		:class="[$style.floatingWindow, { [$style.interacting]: isInteracting }]"
		:style="{
			width: `${currentWidth}px`,
			height: `${currentHeight}px`,
			minWidth: `${props.minWidth}px`,
			minHeight: `${props.minHeight}px`,
			top: `${y}px`,
			left: `${x}px`,
		}"
		data-test-id="floating-window"
	>
		<!-- Resize handles -->
		<div
			:class="[$style.resizeHandle, $style.resizeN]"
			@mousedown="onResizeMouseDown('n', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeS]"
			@mousedown="onResizeMouseDown('s', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeE]"
			@mousedown="onResizeMouseDown('e', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeW]"
			@mousedown="onResizeMouseDown('w', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeNE]"
			@mousedown="onResizeMouseDown('ne', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeNW]"
			@mousedown="onResizeMouseDown('nw', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeSE]"
			@mousedown="onResizeMouseDown('se', $event)"
		/>
		<div
			:class="[$style.resizeHandle, $style.resizeSW]"
			@mousedown="onResizeMouseDown('sw', $event)"
		/>

		<div :class="$style.header" @mousedown="onHeaderMouseDown">
			<div :class="$style.headerLeft">
				<slot name="header-icon" />
				<slot name="header" />
			</div>
			<div :class="$style.headerRight">
				<slot name="header-actions" />
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					data-test-id="floating-window-close"
					@click="emit('close')"
				/>
			</div>
		</div>
		<div :class="$style.content">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
$handle-size: 6px;
$corner-size: 12px;

.floatingWindow {
	position: fixed;
	z-index: 299; // above canvas, below modals (300+)
	display: flex;
	flex-direction: column;
	border-radius: var(--radius--xl);
	background-color: var(--color--background--light-2);
	box-shadow:
		0 8px 32px 0 rgba(0, 0, 0, 0.16),
		0 0 0 1px rgba(0, 0, 0, 0.06);
	overflow: hidden;

	&.interacting {
		user-select: none;
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--sm);
	height: 52px;
	flex-shrink: 0;
	cursor: grab;
	background-color: var(--color--background--light-3);
	border-bottom: var(--border);

	&:active {
		cursor: grabbing;
	}
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.content {
	flex: 1;
	overflow: hidden;
}

// --- Resize handles ---
.resizeHandle {
	position: absolute;
	z-index: 1;
}

// Edge handles
.resizeN {
	top: 0;
	left: $corner-size;
	right: $corner-size;
	height: $handle-size;
	cursor: n-resize;
}

.resizeS {
	bottom: 0;
	left: $corner-size;
	right: $corner-size;
	height: $handle-size;
	cursor: s-resize;
}

.resizeE {
	top: $corner-size;
	right: 0;
	bottom: $corner-size;
	width: $handle-size;
	cursor: e-resize;
}

.resizeW {
	top: $corner-size;
	left: 0;
	bottom: $corner-size;
	width: $handle-size;
	cursor: w-resize;
}

// Corner handles
.resizeNE {
	top: 0;
	right: 0;
	width: $corner-size;
	height: $corner-size;
	cursor: ne-resize;
}

.resizeNW {
	top: 0;
	left: 0;
	width: $corner-size;
	height: $corner-size;
	cursor: nw-resize;
}

.resizeSE {
	bottom: 0;
	right: 0;
	width: $corner-size;
	height: $corner-size;
	cursor: se-resize;
}

.resizeSW {
	bottom: 0;
	left: 0;
	width: $corner-size;
	height: $corner-size;
	cursor: sw-resize;
}
</style>
