<script lang="ts" setup>
import { computed, ref, useCssModule } from 'vue';

import { directionsCursorMaps, type Direction, type ResizeData } from '@n8n/design-system/types';

function closestNumber(value: number, divisor: number): number {
	const q = value / divisor;
	const n1 = divisor * q;

	const n2 = value * divisor > 0 ? divisor * (q + 1) : divisor * (q - 1);

	if (Math.abs(value - n1) < Math.abs(value - n2)) return n1;

	return n2;
}

function getSize(min: number, virtual: number, gridSize: number): number {
	const target = closestNumber(virtual, gridSize);
	if (target >= min && virtual > 0) {
		return target;
	}

	return min;
}

interface ResizeProps {
	isResizingEnabled?: boolean;
	height?: number;
	width?: number;
	minHeight?: number;
	minWidth?: number;
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
	minWidth: 0,
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
	const height = getSize(props.minHeight, state.vHeight.value, props.gridSize);
	const width = getSize(props.minWidth, state.vWidth.value, props.gridSize);

	const dX = left && width !== props.width ? -1 * (width - props.width) : 0;
	const dY = top && height !== props.height ? -1 * (height - props.height) : 0;
	const x = event.x;
	const y = event.y;
	const direction = state.dir.value as Direction;

	emit('resize', { height, width, dX, dY, x, y, direction });
	state.dHeight.value = dHeight;
	state.dWidth.value = dWidth;
};

const mouseUp = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();
	emit('resizeend');
	(props.window ?? window).removeEventListener('mousemove', mouseMove);
	(props.window ?? window).removeEventListener('mouseup', mouseUp);
	document.body.style.cursor = 'unset';
	state.dir.value = '';
};

const resizerMove = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();

	const targetResizer = event.target as { dataset: { dir: string } } | null;
	if (targetResizer) {
		state.dir.value = targetResizer.dataset.dir.toLocaleLowerCase() as Direction;
	}

	document.body.style.cursor = directionsCursorMaps[state.dir.value as Direction];

	state.x.value = event.pageX;
	state.y.value = event.pageY;
	state.dWidth.value = 0;
	state.dHeight.value = 0;
	state.vHeight.value = props.height;
	state.vWidth.value = props.width;

	(props.window ?? window).addEventListener('mousemove', mouseMove);
	(props.window ?? window).addEventListener('mouseup', mouseUp);
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
	--resizer--size: 12px;
	--resizer--side-offset: -2px;
	--resizer--corner-offset: -3px;

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
	top: var(--resizer--side-offset);
	right: var(--resizer--side-offset);
	cursor: ew-resize;
}

.top {
	width: 100%;
	height: var(--resizer--size);
	top: var(--resizer--side-offset);
	left: var(--resizer--side-offset);
	cursor: ns-resize;
}

.bottom {
	width: 100%;
	height: var(--resizer--size);
	bottom: var(--resizer--side-offset);
	left: var(--resizer--side-offset);
	cursor: ns-resize;
}

.left {
	width: var(--resizer--size);
	height: 100%;
	top: var(--resizer--side-offset);
	left: var(--resizer--side-offset);
	cursor: ew-resize;
}

.topLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--corner-offset);
	left: var(--resizer--corner-offset);
	cursor: nw-resize;
}

.topRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--corner-offset);
	right: var(--resizer--corner-offset);
	cursor: ne-resize;
}

.bottomLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--corner-offset);
	left: var(--resizer--corner-offset);
	cursor: sw-resize;
}

.bottomRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--corner-offset);
	right: var(--resizer--corner-offset);
	cursor: se-resize;
}

.outset {
	--resizer--side-offset: calc(-1 * var(--resizer--size) + 2px);
	--resizer--corner-offset: calc(-1 * var(--resizer--size) + 3px);
}
</style>
