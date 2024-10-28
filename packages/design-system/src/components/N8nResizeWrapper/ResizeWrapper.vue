<template>
	<div :class="$style.resize">
		<div
			v-for="direction in enabledDirections"
			:key="direction"
			:data-dir="direction"
			:class="{ [$style.resizer]: true, [$style[direction]]: true }"
			@mousedown="resizerMove"
		/>
		<slot></slot>
	</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

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

const directionsCursorMaps = {
	right: 'ew-resize',
	top: 'ns-resize',
	bottom: 'ns-resize',
	left: 'ew-resize',
	topLeft: 'nw-resize',
	topRight: 'ne-resize',
	bottomLeft: 'sw-resize',
	bottomRight: 'se-resize',
} as const;

type Direction = keyof typeof directionsCursorMaps;

interface ResizeProps {
	isResizingEnabled?: boolean;
	height?: number;
	width?: number;
	minHeight?: number;
	minWidth?: number;
	scale?: number;
	gridSize?: number;
	supportedDirections?: Direction[];
}

const props = withDefaults(defineProps<ResizeProps>(), {
	isResizingEnabled: true,
	height: 0,
	width: 0,
	minHeight: 0,
	minWidth: 0,
	scale: 1,
	gridSize: 20,
	supportedDirections: () => [],
});

export interface ResizeData {
	height: number;
	width: number;
	dX: number;
	dY: number;
	x: number;
	y: number;
	direction: Direction;
}

const $emit = defineEmits<{
	(event: 'resizestart'): void;
	(event: 'resize', value: ResizeData): void;
	(event: 'resizeend'): void;
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

	$emit('resize', { height, width, dX, dY, x, y, direction });
	state.dHeight.value = dHeight;
	state.dWidth.value = dWidth;
};

const mouseUp = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();
	$emit('resizeend');
	window.removeEventListener('mousemove', mouseMove);
	window.removeEventListener('mouseup', mouseUp);
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

	window.addEventListener('mousemove', mouseMove);
	window.addEventListener('mouseup', mouseUp);
	$emit('resizestart');
};
</script>

<style lang="scss" module>
.resize {
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
	width: 12px;
	height: 100%;
	top: -2px;
	right: -2px;
	cursor: ew-resize;
}

.top {
	width: 100%;
	height: 12px;
	top: -2px;
	left: -2px;
	cursor: ns-resize;
}

.bottom {
	width: 100%;
	height: 12px;
	bottom: -2px;
	left: -2px;
	cursor: ns-resize;
}

.left {
	width: 12px;
	height: 100%;
	top: -2px;
	left: -2px;
	cursor: ew-resize;
}

.topLeft {
	width: 12px;
	height: 12px;
	top: -3px;
	left: -3px;
	cursor: nw-resize;
}

.topRight {
	width: 12px;
	height: 12px;
	top: -3px;
	right: -3px;
	cursor: ne-resize;
}

.bottomLeft {
	width: 12px;
	height: 12px;
	bottom: -3px;
	left: -3px;
	cursor: sw-resize;
}

.bottomRight {
	width: 12px;
	height: 12px;
	bottom: -3px;
	right: -3px;
	cursor: se-resize;
}
</style>
