<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useCssModule } from 'vue';

import { directionsCursorMaps, type Direction, type ResizeData } from '../../types';

function closestNumber(value: number, divisor: number): number {
	const q = value / divisor;
	const n1 = divisor * q;

	const n2 = value * divisor > 0 ? divisor * (q + 1) : divisor * (q - 1);

	if (Math.abs(value - n1) < Math.abs(value - n2)) return n1;

	return n2;
}

function getSize(min: number, virtual: number, gridSize: number, max: number): number {
	if (virtual <= 0) {
		return min;
	}

	const target = closestNumber(virtual, gridSize);

	if (target <= min) {
		return min;
	}
	if (target >= max) {
		return max;
	}

	return target;
}

interface ResizeProps {
	isResizingEnabled?: boolean;
	height?: number;
	width?: number;
	minHeight?: number;
	maxHeight?: number;
	minWidth?: number;
	maxWidth?: number;
	scale?: number;
	gridSize?: number;
	supportedDirections?: Direction[];
	outset?: boolean;
	window?: Window;
}

const props = withDefaults(defineProps<ResizeProps>(), {
	isResizingEnabled: true,
	height: 0,
	width: 0,
	minHeight: 0,
	maxHeight: Number.POSITIVE_INFINITY,
	minWidth: 0,
	maxWidth: Number.POSITIVE_INFINITY,
	scale: 1,
	gridSize: 20,
	outset: false,
	window: undefined,
	supportedDirections: () => [],
});

const $style = useCssModule();

const emit = defineEmits<{
	resizestart: [];
	resize: [value: ResizeData];
	resizeend: [];
}>();

const enabledDirections = computed((): Direction[] => {
	const availableDirections = Object.keys(directionsCursorMaps) as Direction[];

	if (!props.isResizingEnabled) return [];
	if (props.supportedDirections.length === 0) return availableDirections;

	return props.supportedDirections;
});

const state = {
	dir: ref<Direction | ''>(''),
	dHeight: ref(0),
	dWidth: ref(0),
	vHeight: ref(0),
	vWidth: ref(0),
	x: ref(0),
	y: ref(0),
};

const classes = computed(() => ({
	[$style.resize]: true,
	[$style.outset]: props.outset,
}));

const mouseMove = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();
	let dWidth = 0;
	let dHeight = 0;
	let top = false;
	let left = false;

	if (state.dir.value.includes('right')) {
		dWidth = event.pageX - state.x.value;
	}
	if (state.dir.value.includes('left')) {
		dWidth = state.x.value - event.pageX;
		left = true;
	}
	if (state.dir.value.includes('top')) {
		dHeight = state.y.value - event.pageY;
		top = true;
	}
	if (state.dir.value.includes('bottom')) {
		dHeight = event.pageY - state.y.value;
	}

	const deltaWidth = (dWidth - state.dWidth.value) / props.scale;
	const deltaHeight = (dHeight - state.dHeight.value) / props.scale;

	state.vHeight.value = state.vHeight.value + deltaHeight;
	state.vWidth.value = state.vWidth.value + deltaWidth;
	const height = getSize(props.minHeight, state.vHeight.value, props.gridSize, props.maxHeight);
	const width = getSize(props.minWidth, state.vWidth.value, props.gridSize, props.maxWidth);

	const dX = left && width !== props.width ? -1 * (width - props.width) : 0;
	const dY = top && height !== props.height ? -1 * (height - props.height) : 0;
	const x = event.x;
	const y = event.y;
	const direction = state.dir.value as Direction;

	emit('resize', { height, width, dX, dY, x, y, direction });
	state.dHeight.value = dHeight;
	state.dWidth.value = dWidth;
};

// Idempotent — safe to call from mouseup, blur, unmount, or any abort path.
// Returns whether a drag was actually in progress, so callers can decide
// whether to emit resizeend without risk of double-emitting.
const cleanupResize = (): boolean => {
	if (state.dir.value === '') return false;
	const w = props.window ?? window;
	w.removeEventListener('mousemove', mouseMove);
	w.removeEventListener('mouseup', mouseUp);
	w.removeEventListener('blur', onBlur);
	document.body.style.cursor = 'unset';
	document.body.classList.remove('n8n-resizing');
	state.dir.value = '';
	return true;
};

// Tab switch, OS notification, alt-tab — any focus loss aborts the drag so
// the body class doesn't stick when mouseup never fires on this window.
const onBlur = () => {
	if (cleanupResize()) emit('resizeend');
};

const mouseUp = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();
	// Clean up before emitting so a throwing parent handler can't leave the
	// body in a stuck-resizing state.
	if (cleanupResize()) emit('resizeend');
};

onBeforeUnmount(() => {
	cleanupResize();
});

const resizerMove = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();

	const targetResizer = event.target as { dataset: { dir: string } } | null;
	if (targetResizer) {
		state.dir.value = targetResizer.dataset.dir.toLocaleLowerCase() as Direction;
	}

	document.body.style.cursor = directionsCursorMaps[state.dir.value as Direction];
	document.body.classList.add('n8n-resizing');

	state.x.value = event.pageX;
	state.y.value = event.pageY;
	state.dWidth.value = 0;
	state.dHeight.value = 0;
	state.vHeight.value = props.height;
	state.vWidth.value = props.width;

	const w = props.window ?? window;
	w.addEventListener('mousemove', mouseMove);
	w.addEventListener('mouseup', mouseUp);
	w.addEventListener('blur', onBlur);
	emit('resizestart');
};
</script>

<template>
	<div :class="classes">
		<div
			v-for="direction in enabledDirections"
			:key="direction"
			:data-dir="direction"
			:class="{ [$style.resizer]: true, [$style[direction]]: true }"
			data-test-id="resize-handle"
			@mousedown="resizerMove"
		/>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.resize {
	--resizer--size: 4px;
	--resizer--spacing--side: -2px;
	--resizer--spacing--corner: -3px;

	position: relative;
	width: 100%;
	height: 100%;
	z-index: 2;
}

.resizer {
	position: absolute;
	z-index: 3;
}

.right {
	width: var(--resizer--size);
	height: 100%;
	top: var(--resizer--spacing--side);
	right: var(--resizer--spacing--side);
	cursor: ew-resize;
	border-color: var(--border-color);
	border-color: var(--color--neutral-400);
}

.top {
	width: 100%;
	height: var(--resizer--size);
	top: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: ns-resize;
}

.bottom {
	width: 100%;
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: ns-resize;
}

.left {
	width: var(--resizer--size);
	height: 100%;
	top: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: ew-resize;
}

.topLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--spacing--corner);
	left: var(--resizer--spacing--corner);
	cursor: nw-resize;
}

.topRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--spacing--corner);
	right: var(--resizer--spacing--corner);
	cursor: ne-resize;
}

.bottomLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--corner);
	left: var(--resizer--spacing--corner);
	cursor: sw-resize;
}

.bottomRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--corner);
	right: var(--resizer--spacing--corner);
	cursor: se-resize;
}

.outset {
	--resizer--spacing--side: calc(-1 * var(--resizer--size) + 2px);
	--resizer--spacing--corner: calc(-1 * var(--resizer--size) + 3px);
}
</style>

<style lang="scss">
body.n8n-resizing iframe {
	pointer-events: none;
}
</style>
