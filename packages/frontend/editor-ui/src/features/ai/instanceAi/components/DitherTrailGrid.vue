<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, useTemplateRef } from 'vue';

interface TrailSquare {
	column: number;
	row: number;
	revealedAt: number;
	fadeAt: number;
	source: 'ambient' | 'pointer';
}

const props = withDefaults(
	defineProps<{
		height?: number;
	}>(),
	{
		height: 220,
	},
);

const variables = reactive({
	cellSize: 16,
	cellGap: 0,
	canvasPixelSize: 4,
	backgroundOpacity: 0.2,
	backgroundDitherOpacity: 48,
	trailColor: '#FF3466',
	trailOpacity: 0.6,
	revealDurationMs: 180,
	trailHoldDurationMs: 1200,
	trailFadeDurationMs: 500,
	fifoIntervalMs: 50,
	ambientTrailMinTrunkLength: 16,
	ambientTrailMaxTrunkLength: 28,
	ambientTrailMinBranchLength: 10,
	ambientTrailMaxBranchLength: 18,
	ambientTrailStepDelayMs: 55,
	ambientTrailMinIntervalMs: 4000,
	ambientTrailIntervalVarianceMs: 3000,
});
const DITHER_ORDER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const trailSquares = new Map<string, TrailSquare>();
let animationFrame: number | undefined;
let ambientTrailTimer: ReturnType<typeof setTimeout> | undefined;
let resizeObserver: ResizeObserver | undefined;
let reducedMotionQuery: MediaQueryList | undefined;
let columns = 0;
let rows = 0;
let lastPointerColumn: number | undefined;
let lastPointerRow: number | undefined;
let nextFadeAt = 0;
let isPointerOverCanvas = false;

function getSquareKey(column: number, row: number) {
	return `${column}:${row}`;
}

function easeOutCubic(progress: number) {
	return 1 - Math.pow(1 - progress, 3);
}

function easeInOutCubic(progress: number) {
	return progress < 0.5
		? 4 * progress * progress * progress
		: 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function applyDither(context: CanvasRenderingContext2D, width: number, height: number) {
	const image = context.getImageData(0, 0, width, height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			const alpha = image.data[index + 3] ?? 0;
			const order = DITHER_ORDER[(y % 4) * 4 + (x % 4)] ?? 0;
			const isVisible = alpha > (order + 0.5) * 16;
			const isBackground = alpha <= Math.ceil(variables.backgroundOpacity * 255);
			image.data[index + 3] = isVisible
				? isBackground
					? variables.backgroundDitherOpacity
					: 255
				: 0;
		}
	}

	context.putImageData(image, 0, 0);
}

function getTrailOpacity(square: TrailSquare, timestamp: number) {
	const revealProgress = Math.min(
		1,
		Math.max(0, (timestamp - square.revealedAt) / variables.revealDurationMs),
	);
	const fadeProgress = Math.min(
		1,
		Math.max(0, (timestamp - square.fadeAt) / variables.trailFadeDurationMs),
	);
	return (
		variables.backgroundOpacity +
		easeOutCubic(revealProgress) *
			(variables.trailOpacity - variables.backgroundOpacity) *
			(1 - easeInOutCubic(fadeProgress))
	);
}

function draw(timestamp = performance.now()) {
	const canvas = canvasRef.value;
	const context = canvas?.getContext('2d');
	if (!canvas || !context) return;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.save();
	context.scale(1 / variables.canvasPixelSize, 1 / variables.canvasPixelSize);
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const key = getSquareKey(column, row);
			const trailSquare = trailSquares.get(key);
			context.fillStyle = trailSquare ? variables.trailColor : '#666';
			context.globalAlpha = trailSquare
				? getTrailOpacity(trailSquare, timestamp)
				: variables.backgroundOpacity;
			context.fillRect(
				column * variables.cellSize,
				row * variables.cellSize,
				variables.cellSize - variables.cellGap,
				variables.cellSize - variables.cellGap,
			);
		}
	}

	context.restore();
	applyDither(context, canvas.width, canvas.height);

	for (const [key, square] of trailSquares) {
		if (timestamp >= square.fadeAt + variables.trailFadeDurationMs) trailSquares.delete(key);
	}

	if (trailSquares.size > 0) {
		animationFrame = requestAnimationFrame(draw);
	} else {
		animationFrame = undefined;
	}
}

function requestDraw() {
	if (animationFrame !== undefined) return;
	animationFrame = requestAnimationFrame(draw);
}

function addTrailSquare(column: number, row: number, delay: number, source: TrailSquare['source']) {
	const key = getSquareKey(column, row);
	const now = performance.now() + delay;
	const fadeAt = Math.max(
		now + variables.trailHoldDurationMs,
		nextFadeAt + variables.fifoIntervalMs,
	);
	nextFadeAt = fadeAt;
	trailSquares.set(key, { column, row, revealedAt: now, fadeAt, source });
	requestDraw();
}

function postponePointerTrailFade() {
	let fadeAt = performance.now() + variables.trailHoldDurationMs;

	for (const square of trailSquares.values()) {
		if (square.source !== 'pointer') continue;
		square.fadeAt = fadeAt;
		fadeAt += variables.fifoIntervalMs;
	}

	nextFadeAt = Math.max(nextFadeAt, fadeAt);
}

function randomInteger(maximum: number) {
	return Math.floor(Math.random() * maximum);
}

const ORTHOGONAL_DIRECTIONS = [
	{ columnStep: 1, rowStep: 0 },
	{ columnStep: 0, rowStep: 1 },
	{ columnStep: -1, rowStep: 0 },
	{ columnStep: 0, rowStep: -1 },
];

function drawAmbientPath(column: number, row: number, directionIndex: number, length: number) {
	let currentColumn = column;
	let currentRow = row;
	let currentDirection = directionIndex;
	let stepsLeftInSegment = 0;

	for (let step = 0; step < length; step++) {
		// Pick a new segment length, then turn 90 degrees when the segment ends
		if (stepsLeftInSegment === 0) {
			stepsLeftInSegment =
				variables.ambientTrailMinBranchLength +
				randomInteger(
					variables.ambientTrailMaxBranchLength - variables.ambientTrailMinBranchLength + 1,
				);
			currentDirection = (currentDirection + (Math.random() < 0.5 ? 1 : 3)) % 4;
		}
		const direction = ORTHOGONAL_DIRECTIONS[currentDirection] ?? ORTHOGONAL_DIRECTIONS[0];
		if (currentColumn < 0 || currentColumn >= columns || currentRow < 0 || currentRow >= rows) {
			break;
		}
		addTrailSquare(currentColumn, currentRow, step * variables.ambientTrailStepDelayMs, 'ambient');
		currentColumn += direction.columnStep;
		currentRow += direction.rowStep;
		stepsLeftInSegment--;
	}
}

function createAmbientTrail() {
	if (isPointerOverCanvas || reducedMotionQuery?.matches || columns === 0 || rows === 0) return;

	const trunkLength =
		variables.ambientTrailMinTrunkLength +
		randomInteger(variables.ambientTrailMaxTrunkLength - variables.ambientTrailMinTrunkLength + 1);
	const startColumn = randomInteger(columns);
	const startRow = randomInteger(rows);
	drawAmbientPath(startColumn, startRow, randomInteger(4), trunkLength);
}

function scheduleAmbientTrail() {
	if (reducedMotionQuery?.matches || isPointerOverCanvas || ambientTrailTimer !== undefined) return;
	ambientTrailTimer = setTimeout(
		function runAmbientTrail() {
			ambientTrailTimer = undefined;
			createAmbientTrail();
			scheduleAmbientTrail();
		},
		variables.ambientTrailMinIntervalMs + Math.random() * variables.ambientTrailIntervalVarianceMs,
	);
}

function handlePointerMove(event: PointerEvent) {
	const canvas = canvasRef.value;
	if (!canvas || reducedMotionQuery?.matches) return;

	const bounds = canvas.getBoundingClientRect();
	if (
		event.clientX < bounds.left ||
		event.clientX >= bounds.right ||
		event.clientY < bounds.top ||
		event.clientY >= bounds.bottom
	) {
		handlePointerLeave();
		return;
	}

	if (!isPointerOverCanvas && ambientTrailTimer !== undefined) {
		clearTimeout(ambientTrailTimer);
		ambientTrailTimer = undefined;
	}
	isPointerOverCanvas = true;
	const column = Math.min(
		columns - 1,
		Math.max(0, Math.floor((event.clientX - bounds.left) / variables.cellSize)),
	);
	const row = Math.min(
		rows - 1,
		Math.max(0, Math.floor((event.clientY - bounds.top) / variables.cellSize)),
	);
	if (column === lastPointerColumn && row === lastPointerRow) return;

	if (lastPointerColumn === undefined || lastPointerRow === undefined) {
		addTrailSquare(column, row, 0, 'pointer');
	} else {
		const distance = Math.max(Math.abs(column - lastPointerColumn), Math.abs(row - lastPointerRow));
		for (let step = 1; step <= distance; step++) {
			const progress = step / distance;
			addTrailSquare(
				Math.round(lastPointerColumn + (column - lastPointerColumn) * progress),
				Math.round(lastPointerRow + (row - lastPointerRow) * progress),
				step * 20,
				'pointer',
			);
		}
	}

	postponePointerTrailFade();
	lastPointerColumn = column;
	lastPointerRow = row;
}

function handlePointerLeave() {
	const wasPointerOverCanvas = isPointerOverCanvas;
	lastPointerColumn = undefined;
	lastPointerRow = undefined;
	isPointerOverCanvas = false;
	if (wasPointerOverCanvas) scheduleAmbientTrail();
}

function resize() {
	const canvas = canvasRef.value;
	if (!canvas) return;

	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	canvas.width = Math.ceil(width / variables.canvasPixelSize);
	canvas.height = Math.ceil(height / variables.canvasPixelSize);
	columns = Math.max(1, Math.ceil(width / variables.cellSize));
	rows = Math.max(1, Math.ceil(height / variables.cellSize));
	trailSquares.clear();
	nextFadeAt = 0;
	draw();
}

function handleReducedMotionChange() {
	if (ambientTrailTimer !== undefined) clearTimeout(ambientTrailTimer);
	ambientTrailTimer = undefined;
	trailSquares.clear();
	nextFadeAt = 0;
	draw();
	if (!reducedMotionQuery?.matches) scheduleAmbientTrail();
}

onMounted(() => {
	reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
	resizeObserver = new ResizeObserver(resize);
	if (canvasRef.value) resizeObserver.observe(canvasRef.value);
	window.addEventListener('pointermove', handlePointerMove, { passive: true });
	resize();
	scheduleAmbientTrail();
});

onUnmounted(() => {
	if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
	if (ambientTrailTimer !== undefined) clearTimeout(ambientTrailTimer);
	window.removeEventListener('pointermove', handlePointerMove);
	resizeObserver?.disconnect();
	reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange);
});
</script>

<template>
	<canvas
		ref="canvasRef"
		:class="$style.wordGrid"
		:style="{ height: `${props.height}px` }"
		aria-hidden="true"
	/>
</template>

<style lang="css" module>
.wordGrid {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	max-height: 400px;
	pointer-events: none;
	image-rendering: pixelated;
	/*mask-image: linear-gradient(to top, black -50%, transparent 80%);*/
	-webkit-mask-image: radial-gradient(
		circle at bottom,
		rgba(0, 0, 0, 0.2) 20%,
		rgba(0, 0, 0, 0) 80%
	);
	mask-image: radial-gradient(circle at bottom, rgba(0, 0, 0, 0.2) 20%, rgba(0, 0, 0, 0) 80%);
	-webkit-mask-size: contain;
	mask-size: contain;
	-webkit-mask-repeat: no-repeat;
	mask-repeat: no-repeat;
}
</style>
