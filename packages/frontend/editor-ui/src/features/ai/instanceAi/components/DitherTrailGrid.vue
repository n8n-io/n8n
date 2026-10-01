<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref, useTemplateRef } from 'vue';

interface TrailSquare {
	column: number;
	row: number;
	revealedAt: number;
	fadeAt: number;
	source: 'ambient' | 'pointer';
}

interface GridCell {
	column: number;
	row: number;
}

const variables = reactive({
	cellSize: 16,
	cellGap: 0,
	canvasPixelSize: 4,
	backgroundOpacity: 0.2,
	backgroundDitherOpacity: 48,
	backgroundColor: '',
	trailColor: '',
	trailOpacity: 0,
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
	snakeStepMs: 110,
	snakeStartLength: 4,
	snakeMaxTailThreshold: 12,
});

/** Direction indexes match ORTHOGONAL_DIRECTIONS */
const ARROW_DIRECTIONS: Record<string, number> = {
	ArrowRight: 0,
	ArrowDown: 1,
	ArrowLeft: 2,
	ArrowUp: 3,
};

/** Reactive copy of `snake.isActive` for the template, so the mask turns off while playing */
const isSnakePlaying = ref(false);

const snake = {
	isActive: false,
	cells: [] as GridCell[],
	direction: 0,
	queuedDirections: [] as number[],
	food: undefined as GridCell | undefined,
	timer: undefined as ReturnType<typeof setInterval> | undefined,
};
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

function updateTrailVariables() {
	const canvas = canvasRef.value;
	if (!canvas) return;

	const styles = getComputedStyle(canvas);
	variables.backgroundColor = styles.color;
	variables.trailColor = styles.borderColor;
	variables.trailOpacity = Number.parseFloat(styles.getPropertyValue('--word-grid-trail-opacity'));
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
	return easeOutCubic(revealProgress) * variables.trailOpacity * (1 - easeInOutCubic(fadeProgress));
}

/**
 * Returns the position of a square along the trail, from 0 at the head to 1 at the tail.
 * The value comes from the square age, so older squares are nearer to the tail.
 */
function getTrailPosition(square: TrailSquare, timestamp: number) {
	const lifetime = square.fadeAt + variables.trailFadeDurationMs - square.revealedAt;
	if (lifetime <= 0) return 1;
	return Math.min(1, Math.max(0, (timestamp - square.revealedAt) / lifetime));
}

/**
 * Draws the trail squares on top of the dithered background.
 * The head is solid. The dither gets more sparse towards the tail.
 */
function drawTrail(context: CanvasRenderingContext2D, timestamp: number) {
	context.save();
	context.fillStyle = variables.trailColor;
	for (const square of trailSquares.values()) {
		if (timestamp < square.revealedAt) continue;
		context.globalAlpha = getTrailOpacity(square, timestamp);
		fillDitheredCell(context, square, Math.pow(getTrailPosition(square, timestamp), 2) * 16);
	}
	context.restore();
}

/**
 * Fills one grid cell. Pixels with a dither order below the threshold stay empty.
 * A threshold of 0 fills the full cell. A threshold of 16 fills nothing.
 */
function fillDitheredCell(context: CanvasRenderingContext2D, cell: GridCell, threshold: number) {
	const pixelsPerCell = variables.cellSize / variables.canvasPixelSize;
	const cellPixels = (variables.cellSize - variables.cellGap) / variables.canvasPixelSize;
	const startX = Math.round(cell.column * pixelsPerCell);
	const startY = Math.round(cell.row * pixelsPerCell);
	for (let y = startY; y < startY + cellPixels; y++) {
		for (let x = startX; x < startX + cellPixels; x++) {
			const order = DITHER_ORDER[(y % 4) * 4 + (x % 4)] ?? 0;
			if (order >= threshold) context.fillRect(x, y, 1, 1);
		}
	}
}

/**
 * Draws the snake with the same head-to-tail dither gradient as the trail, and the food.
 */
function drawSnake(context: CanvasRenderingContext2D) {
	if (!snake.isActive) return;

	context.save();
	context.fillStyle = variables.trailColor;
	context.globalAlpha = variables.trailOpacity;
	if (snake.food) fillDitheredCell(context, snake.food, 0);
	const lastIndex = Math.max(1, snake.cells.length - 1);
	snake.cells.forEach(function drawSnakeCell(cell, index) {
		const position = index / lastIndex;
		fillDitheredCell(context, cell, Math.pow(position, 2) * variables.snakeMaxTailThreshold);
	});
	context.restore();
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
			context.fillStyle = variables.backgroundColor;
			context.globalAlpha = variables.backgroundOpacity;
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
	drawTrail(context, timestamp);
	drawSnake(context);

	for (const [key, square] of trailSquares) {
		if (timestamp >= square.fadeAt + variables.trailFadeDurationMs) trailSquares.delete(key);
	}

	if (trailSquares.size > 0 || snake.isActive) {
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
	if (
		reducedMotionQuery?.matches ||
		isPointerOverCanvas ||
		snake.isActive ||
		ambientTrailTimer !== undefined
	) {
		return;
	}
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
	if (!canvas || reducedMotionQuery?.matches || snake.isActive) return;

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

function isSameCell(first: GridCell, second: GridCell) {
	return first.column === second.column && first.row === second.row;
}

/**
 * Puts food on a random free cell. The mask is off during the game, so all cells are visible.
 */
function placeSnakeFood() {
	const freeCells: GridCell[] = [];
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const cell = { column, row };
			if (snake.cells.some((snakeCell) => isSameCell(snakeCell, cell))) continue;
			freeCells.push(cell);
		}
	}
	snake.food = freeCells[randomInteger(freeCells.length)];
}

function startSnake(direction: number) {
	if (ambientTrailTimer !== undefined) clearTimeout(ambientTrailTimer);
	ambientTrailTimer = undefined;

	/** All start cells share the head position, so the snake grows out of one cell */
	const head = { column: Math.floor(columns / 2), row: Math.floor(rows * 0.7) };
	snake.isActive = true;
	isSnakePlaying.value = true;
	snake.cells = Array.from({ length: variables.snakeStartLength }, () => ({ ...head }));
	snake.direction = direction;
	snake.queuedDirections = [];
	placeSnakeFood();
	snake.timer = setInterval(stepSnake, variables.snakeStepMs);
	requestDraw();
}

/**
 * Moves the snake one cell. The snake wraps at the edges, because the canvas mask hides them.
 */
function stepSnake() {
	const head = snake.cells[0];
	if (!head) return;

	snake.direction = snake.queuedDirections.shift() ?? snake.direction;
	const direction = ORTHOGONAL_DIRECTIONS[snake.direction] ?? ORTHOGONAL_DIRECTIONS[0];
	const nextHead = {
		column: (head.column + direction.columnStep + columns) % columns,
		row: (head.row + direction.rowStep + rows) % rows,
	};
	const isEating = snake.food !== undefined && isSameCell(nextHead, snake.food);
	const body = isEating ? snake.cells : snake.cells.slice(0, -1);
	if (body.some((cell) => isSameCell(cell, nextHead))) {
		stopSnake(true);
		return;
	}

	snake.cells.unshift(nextHead);
	if (isEating) placeSnakeFood();
	else snake.cells.pop();
}

/**
 * Ends the game. When `leaveTrail` is true, the snake turns into a trail that fades out.
 */
function stopSnake(leaveTrail: boolean) {
	if (!snake.isActive) return;

	if (snake.timer !== undefined) clearInterval(snake.timer);
	snake.timer = undefined;
	snake.isActive = false;
	isSnakePlaying.value = false;
	if (leaveTrail) {
		/** Add from the tail, so the FIFO fade removes the tail first */
		[...snake.cells].reverse().forEach(function addSnakeTrail(cell) {
			addTrailSquare(cell.column, cell.row, 0, 'ambient');
		});
	}
	snake.cells = [];
	snake.food = undefined;
	snake.queuedDirections = [];
	requestDraw();
	scheduleAmbientTrail();
}

function isEditableTarget(target: EventTarget | null) {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || target.closest('input, textarea, select') !== null)
	);
}

function handleKeyDown(event: KeyboardEvent) {
	if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;

	if (event.key === 'Escape' && snake.isActive) {
		stopSnake(true);
		return;
	}

	const direction = ARROW_DIRECTIONS[event.key];
	if (direction === undefined) return;
	event.preventDefault();

	if (!snake.isActive) {
		startSnake(direction);
		return;
	}

	/** Queue turns so fast key presses between steps are not lost. Ignore reversals. */
	const lastDirection = snake.queuedDirections.at(-1) ?? snake.direction;
	if (
		direction !== lastDirection &&
		(direction + 2) % 4 !== lastDirection &&
		snake.queuedDirections.length < 2
	) {
		snake.queuedDirections.push(direction);
	}
}

/**
 * Stops the game on a click outside the canvas. The canvas has no pointer events,
 * so the check uses the canvas bounds.
 */
function handlePointerDown(event: PointerEvent) {
	const canvas = canvasRef.value;
	if (!snake.isActive || !canvas) return;

	const bounds = canvas.getBoundingClientRect();
	const isInsideCanvas =
		event.clientX >= bounds.left &&
		event.clientX < bounds.right &&
		event.clientY >= bounds.top &&
		event.clientY < bounds.bottom;
	if (!isInsideCanvas) stopSnake(true);
}

function resize() {
	const canvas = canvasRef.value;
	if (!canvas) return;

	stopSnake(false);
	updateTrailVariables();
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
	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('pointerdown', handlePointerDown, { passive: true });
	resize();
	scheduleAmbientTrail();
});

onUnmounted(() => {
	if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
	if (ambientTrailTimer !== undefined) clearTimeout(ambientTrailTimer);
	if (snake.timer !== undefined) clearInterval(snake.timer);
	window.removeEventListener('pointermove', handlePointerMove);
	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('pointerdown', handlePointerDown);
	resizeObserver?.disconnect();
	reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange);
});
</script>

<template>
	<canvas
		ref="canvasRef"
		:class="[$style.trailGrid, { [$style.playing]: isSnakePlaying }]"
		aria-hidden="true"
	/>
</template>

<style lang="css" module>
.trailGrid {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	max-height: clamp(120px, 45dvh, 1280px);
	pointer-events: none;
	image-rendering: pixelated;
	--word-grid-background-color: #333;
	color: var(--word-grid-background-color);
	--word-grid-trail-color: var(--color--pink-500);
	border-color: var(--word-grid-trail-color);
	--word-grid-trail-opacity: 1;

	-webkit-mask-image: linear-gradient(
		to top,
		rgba(0, 0, 0, 0.5) 0%,
		rgba(0, 0, 0, 0.75) 3%,
		rgba(0, 0, 0, 0) 90%
	);
	mask-image: linear-gradient(
		to top,
		rgba(0, 0, 0, 0.5) 0%,
		rgba(0, 0, 0, 0.75) 3%,
		rgba(0, 0, 0, 0) 90%
	);
	-webkit-mask-position: bottom right;
	mask-position: bottom right;
	-webkit-mask-size: cover;
	mask-size: cover;
	-webkit-mask-repeat: no-repeat;
	mask-repeat: no-repeat;

	:global(body[data-theme='dark']) & {
		--word-grid-background-color: #ccc;
	}

	@media (prefers-color-scheme: dark) {
		:global(body:not([data-theme])) & {
			--word-grid-background-color: #ccc;
		}
	}
}
</style>
