<script lang="ts" setup>
import { onMounted, onUnmounted, useTemplateRef } from 'vue';

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

const CELL_SIZE = 16;
const CELL_GAP = 0;
const CANVAS_PIXEL_SIZE = 4;
const BACKGROUND_OPACITY = 0.2;
const BACKGROUND_DITHER_OPACITY = 48;
const TRAIL_COLOR = '#FF3466';
const TRAIL_OPACITY = 0.6;
const REVEAL_DURATION_MS = 180;
const TRAIL_HOLD_DURATION_MS = 1200;
const TRAIL_FADE_DURATION_MS = 500;
const FIFO_INTERVAL_MS = 50;
const AMBIENT_TRAIL_MIN_TRUNK_LENGTH = 16;
const AMBIENT_TRAIL_MAX_TRUNK_LENGTH = 28;
const AMBIENT_TRAIL_MIN_BRANCH_LENGTH = 10;
const AMBIENT_TRAIL_MAX_BRANCH_LENGTH = 18;
const AMBIENT_TRAIL_STEP_DELAY_MS = 55;
const AMBIENT_TRAIL_MIN_INTERVAL_MS = 4000;
const AMBIENT_TRAIL_INTERVAL_VARIANCE_MS = 3000;
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
			const isBackground = alpha <= Math.ceil(BACKGROUND_OPACITY * 255);
			image.data[index + 3] = isVisible ? (isBackground ? BACKGROUND_DITHER_OPACITY : 255) : 0;
		}
	}

	context.putImageData(image, 0, 0);
}

function getTrailOpacity(square: TrailSquare, timestamp: number) {
	const revealProgress = Math.min(
		1,
		Math.max(0, (timestamp - square.revealedAt) / REVEAL_DURATION_MS),
	);
	const fadeProgress = Math.min(
		1,
		Math.max(0, (timestamp - square.fadeAt) / TRAIL_FADE_DURATION_MS),
	);
	return (
		BACKGROUND_OPACITY +
		easeOutCubic(revealProgress) *
			(TRAIL_OPACITY - BACKGROUND_OPACITY) *
			(1 - easeInOutCubic(fadeProgress))
	);
}

function draw(timestamp = performance.now()) {
	const canvas = canvasRef.value;
	const context = canvas?.getContext('2d');
	if (!canvas || !context) return;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.save();
	context.scale(1 / CANVAS_PIXEL_SIZE, 1 / CANVAS_PIXEL_SIZE);
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const key = getSquareKey(column, row);
			const trailSquare = trailSquares.get(key);
			context.fillStyle = trailSquare ? TRAIL_COLOR : '#666';
			context.globalAlpha = trailSquare
				? getTrailOpacity(trailSquare, timestamp)
				: BACKGROUND_OPACITY;
			context.fillRect(
				column * CELL_SIZE,
				row * CELL_SIZE,
				CELL_SIZE - CELL_GAP,
				CELL_SIZE - CELL_GAP,
			);
		}
	}

	context.restore();
	applyDither(context, canvas.width, canvas.height);

	for (const [key, square] of trailSquares) {
		if (timestamp >= square.fadeAt + TRAIL_FADE_DURATION_MS) trailSquares.delete(key);
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
	const fadeAt = Math.max(now + TRAIL_HOLD_DURATION_MS, nextFadeAt + FIFO_INTERVAL_MS);
	nextFadeAt = fadeAt;
	trailSquares.set(key, { column, row, revealedAt: now, fadeAt, source });
	requestDraw();
}

function postponePointerTrailFade() {
	let fadeAt = performance.now() + TRAIL_HOLD_DURATION_MS;

	for (const square of trailSquares.values()) {
		if (square.source !== 'pointer') continue;
		square.fadeAt = fadeAt;
		fadeAt += FIFO_INTERVAL_MS;
	}

	nextFadeAt = Math.max(nextFadeAt, fadeAt);
}

function randomInteger(maximum: number) {
	return Math.floor(Math.random() * maximum);
}

function getRandomCurvature() {
	const direction = Math.random() < 0.5 ? -1 : 1;
	return direction * (0.006 + Math.random() * 0.008);
}

function drawAmbientBranch(
	column: number,
	row: number,
	heading: number,
	curvature: number,
	length: number,
	startDelay: number,
	remainingSplits: number,
) {
	let endColumn = column;
	let endRow = row;
	let endHeading = heading;
	let drawnLength = 0;

	for (let step = 0; step < length; step++) {
		const roundedColumn = Math.round(endColumn);
		const roundedRow = Math.round(endRow);
		if (roundedColumn < 0 || roundedColumn >= columns || roundedRow < 0 || roundedRow >= rows) {
			break;
		}
		addTrailSquare(
			roundedColumn,
			roundedRow,
			startDelay + step * AMBIENT_TRAIL_STEP_DELAY_MS,
			'ambient',
		);
		endColumn += Math.cos(endHeading);
		endRow += Math.sin(endHeading);
		endHeading += curvature;
		drawnLength++;
	}

	if (remainingSplits === 0 || drawnLength < 2) return;

	const branchAngle = 0.25 + Math.random() * 0.25;
	const firstChildLength =
		AMBIENT_TRAIL_MIN_BRANCH_LENGTH +
		randomInteger(AMBIENT_TRAIL_MAX_BRANCH_LENGTH - AMBIENT_TRAIL_MIN_BRANCH_LENGTH + 1);
	const secondChildLength =
		AMBIENT_TRAIL_MIN_BRANCH_LENGTH +
		randomInteger(AMBIENT_TRAIL_MAX_BRANCH_LENGTH - AMBIENT_TRAIL_MIN_BRANCH_LENGTH + 1);
	const childDelay = startDelay + drawnLength * AMBIENT_TRAIL_STEP_DELAY_MS;
	const continuingChild = randomInteger(2);
	drawAmbientBranch(
		endColumn,
		endRow,
		endHeading - branchAngle,
		getRandomCurvature(),
		firstChildLength,
		childDelay,
		continuingChild === 0 ? remainingSplits - 1 : 0,
	);
	drawAmbientBranch(
		endColumn,
		endRow,
		endHeading + branchAngle,
		getRandomCurvature(),
		secondChildLength,
		childDelay,
		continuingChild === 1 ? remainingSplits - 1 : 0,
	);
}

function createAmbientTrail() {
	if (isPointerOverCanvas || reducedMotionQuery?.matches || columns === 0 || rows === 0) return;

	const trunkLength =
		AMBIENT_TRAIL_MIN_TRUNK_LENGTH +
		randomInteger(AMBIENT_TRAIL_MAX_TRUNK_LENGTH - AMBIENT_TRAIL_MIN_TRUNK_LENGTH + 1);
	const splitCount = 1 + randomInteger(3);
	const movesRight = Math.random() < 0.5;
	const startColumn = movesRight
		? randomInteger(Math.max(1, Math.floor(columns * 0.25)))
		: columns - 1 - randomInteger(Math.max(1, Math.floor(columns * 0.25)));
	const startRow = Math.min(rows - 1, Math.max(0, Math.floor(rows / 2) + randomInteger(5) - 2));
	drawAmbientBranch(startColumn, startRow, movesRight ? 0 : Math.PI, 0, trunkLength, 0, splitCount);
}

function scheduleAmbientTrail() {
	if (reducedMotionQuery?.matches || isPointerOverCanvas || ambientTrailTimer !== undefined) return;
	ambientTrailTimer = setTimeout(
		function runAmbientTrail() {
			ambientTrailTimer = undefined;
			createAmbientTrail();
			scheduleAmbientTrail();
		},
		AMBIENT_TRAIL_MIN_INTERVAL_MS + Math.random() * AMBIENT_TRAIL_INTERVAL_VARIANCE_MS,
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
		Math.max(0, Math.floor((event.clientX - bounds.left) / CELL_SIZE)),
	);
	const row = Math.min(rows - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / CELL_SIZE)));
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
	canvas.width = Math.ceil(width / CANVAS_PIXEL_SIZE);
	canvas.height = Math.ceil(height / CANVAS_PIXEL_SIZE);
	columns = Math.max(1, Math.ceil(width / CELL_SIZE));
	rows = Math.max(1, Math.ceil(height / CELL_SIZE));
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
