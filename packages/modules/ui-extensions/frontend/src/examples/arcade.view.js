/* global Vue, n8n */
// The built-in "Arcade" view: Dino run, a small endless runner. The dinosaur
// jumps over n8n nodes, and the game gets faster the longer it runs. It draws on
// a canvas with the design-system colors, and it uses no network and no storage.
const { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } = Vue;

const WIDTH = 360;
const HEIGHT = 180;
const GROUND_Y = 162;
const PIXEL = 4;
const DINO_X = 36;
// Speeds are in pixels per millisecond.
const GRAVITY = 0.0026;
const JUMP_SPEED = 0.7;
const START_SPEED = 0.24;
const MAX_SPEED = 0.6;
const ACCELERATION = 0.000006;
const MAX_FRAME_MS = 50;
const POINTS_PER_PIXEL = 1 / 20;

// An original pixel dinosaur, 11 by 11 blocks. "#" is a block.
const DINO_BODY = [
	'.....######',
	'....##.####',
	'....#######',
	'....#######',
	'....####...',
	'#..######..',
	'##########.',
	'.#########.',
	'..#######..',
];
const DINO_LEGS = [
	['...##..#...', '...#...##..'],
	['...#..##...', '...##..#...'],
];
const DINO_WIDTH = 11 * PIXEL;
const DINO_HEIGHT = 11 * PIXEL;

const NODE_COLORS = ['--color--orange-500', '--color--blue-500', '--color--green-500'];

/** A small seeded random generator, so a game is the same for the same start time. */
function random(seed) {
	let value = seed >>> 0;
	return () => {
		value = (value + 0x6d2b79f5) >>> 0;
		let next = value;
		next = Math.imul(next ^ (next >>> 15), next | 1);
		next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
		return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
	};
}

function newGame() {
	return {
		rng: random(Date.now()),
		dinoY: 0,
		velocity: 0,
		speed: START_SPEED,
		distance: 0,
		obstacles: [],
		untilNext: 200,
	};
}

function obstacleWidth(obstacle) {
	return obstacle.count * obstacle.size + (obstacle.count - 1) * 10;
}

function overlaps(a, b) {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)';
const overlay =
	'position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing--2xs); border-radius: var(--radius); background-color: color-mix(in srgb, var(--background--surface) 70%, transparent)';

export default {
	setup() {
		const t = n8n.t;
		const locale = n8n.useLocale();
		const canvas = useTemplateRef('canvas');

		const state = ref('idle');
		const score = ref(0);
		const best = ref(0);
		const jumping = ref(false);
		const focusRing = ref(false);

		let game = newGame();
		let frameId = 0;
		let lastTime = null;
		let colors = null;

		const formatNumber = (value) => new Intl.NumberFormat(locale.value).format(value);
		const buttonLabel = computed(() => {
			if (state.value === 'over') return t('uiExtensions.arcade.playAgain');
			if (state.value === 'paused') return t('uiExtensions.arcade.resume');
			return t('uiExtensions.arcade.play');
		});

		// From the canvas and the body, because the tokens of the system theme sit on the body.
		function readColors() {
			const styles = [canvas.value, document.body]
				.filter(Boolean)
				.map((element) => window.getComputedStyle(element));
			const read = (name, fallback) =>
				styles.map((style) => style.getPropertyValue(name).trim()).find(Boolean) ?? fallback;
			return {
				dino: read('--background--brand', '#ea4b71'),
				surface: read('--background--surface', '#ffffff'),
				border: read('--border-color--strong', '#bbbbbb'),
				ground: read('--text-color--subtler', '#777777'),
				nodes: NODE_COLORS.map((name) => read(name, '#ff6d5a')),
			};
		}

		function context2d() {
			const element = canvas.value;
			const ctx = element?.getContext?.('2d');
			if (!element || !ctx) return null;
			const ratio = window.devicePixelRatio || 1;
			if (element.width !== WIDTH * ratio) {
				element.width = WIDTH * ratio;
				element.height = HEIGHT * ratio;
			}
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			return ctx;
		}

		function drawDino(ctx) {
			const top = GROUND_Y - DINO_HEIGHT - game.dinoY;
			const legs = DINO_LEGS[game.dinoY > 0 ? 0 : Math.floor(game.distance / 24) % 2];
			ctx.fillStyle = colors.dino;
			[...DINO_BODY, ...legs].forEach((line, row) => {
				[...line].forEach((cell, column) => {
					if (cell === '#') ctx.fillRect(DINO_X + column * PIXEL, top + row * PIXEL, PIXEL, PIXEL);
				});
			});
		}

		function drawNode(ctx, x, size, color) {
			const y = GROUND_Y - size;
			ctx.fillStyle = colors.surface;
			ctx.strokeStyle = colors.border;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(x, y, size, size, 6);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x + size / 2, y + size / 2, size / 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = colors.border;
			for (const handle of [x, x + size]) {
				ctx.beginPath();
				ctx.arc(handle, y + size / 2, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		function draw() {
			const ctx = context2d();
			if (!ctx) return;
			colors ??= readColors();
			ctx.clearRect(0, 0, WIDTH, HEIGHT);

			ctx.strokeStyle = colors.ground;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, GROUND_Y + 0.5);
			ctx.lineTo(WIDTH, GROUND_Y + 0.5);
			ctx.stroke();
			ctx.fillStyle = colors.ground;
			for (let i = 0; i < 12; i += 1) {
				const x = (((i * 53 - game.distance) % WIDTH) + WIDTH) % WIDTH;
				ctx.fillRect(x, GROUND_Y + 5 + (i % 3) * 3, 4 + (i % 4), 1);
			}

			for (const obstacle of game.obstacles) {
				for (let i = 0; i < obstacle.count; i += 1) {
					const x = obstacle.x + i * (obstacle.size + 10);
					if (i > 0) {
						ctx.strokeStyle = colors.border;
						ctx.lineWidth = 2;
						ctx.beginPath();
						ctx.moveTo(x - 10, GROUND_Y - obstacle.size / 2);
						ctx.lineTo(x, GROUND_Y - obstacle.size / 2);
						ctx.stroke();
					}
					drawNode(ctx, x, obstacle.size, colors.nodes[obstacle.color]);
				}
			}

			drawDino(ctx);
		}

		function spawn() {
			// Two connected nodes are smaller, so a jump at the start speed still clears them.
			const count = game.rng() < 0.3 ? 2 : 1;
			const size = count === 2 ? 22 + Math.floor(game.rng() * 7) : 24 + Math.floor(game.rng() * 11);
			const obstacle = {
				x: WIDTH,
				size,
				count,
				color: Math.floor(game.rng() * NODE_COLORS.length),
			};
			game.obstacles.push(obstacle);
			game.untilNext = obstacleWidth(obstacle) + 240 + game.rng() * 260 + game.speed * 240;
		}

		function hitsObstacle() {
			const dino = {
				x: DINO_X + 6,
				y: GROUND_Y - DINO_HEIGHT - game.dinoY + 4,
				width: DINO_WIDTH - 14,
				height: DINO_HEIGHT - 6,
			};
			return game.obstacles.some((obstacle) =>
				overlaps(dino, {
					x: obstacle.x + 3,
					y: GROUND_Y - obstacle.size + 3,
					width: obstacleWidth(obstacle) - 6,
					height: obstacle.size - 3,
				}),
			);
		}

		function update(ms) {
			game.speed = Math.min(MAX_SPEED, game.speed + ACCELERATION * ms);
			const move = game.speed * ms;
			game.distance += move;

			if (game.dinoY > 0 || game.velocity > 0) {
				game.velocity -= GRAVITY * ms;
				game.dinoY = Math.max(0, game.dinoY + game.velocity * ms);
				if (game.dinoY === 0) game.velocity = 0;
			}

			for (const obstacle of game.obstacles) obstacle.x -= move;
			game.obstacles = game.obstacles.filter(
				(obstacle) => obstacle.x + obstacleWidth(obstacle) > 0,
			);
			game.untilNext -= move;
			if (game.untilNext <= 0) spawn();

			const points = Math.floor(game.distance * POINTS_PER_PIXEL);
			if (points !== score.value) score.value = points;
			jumping.value = game.dinoY > 0;

			if (hitsObstacle()) {
				state.value = 'over';
				best.value = Math.max(best.value, score.value);
			}
		}

		function schedule() {
			frameId = window.requestAnimationFrame(tick);
		}

		function tick(time) {
			frameId = 0;
			if (state.value !== 'running') return;
			const ms = lastTime === null ? 16 : Math.min(MAX_FRAME_MS, Math.max(0, time - lastTime));
			lastTime = time;
			update(ms);
			draw();
			if (state.value === 'running') schedule();
		}

		function run() {
			state.value = 'running';
			lastTime = null;
			canvas.value?.focus?.();
			schedule();
		}

		function start() {
			game = newGame();
			score.value = 0;
			jumping.value = false;
			run();
		}

		function jump() {
			if (game.dinoY === 0 && game.velocity === 0) {
				game.velocity = JUMP_SPEED;
				jumping.value = true;
			}
		}

		function pause() {
			if (state.value !== 'running') return;
			state.value = 'paused';
			if (frameId) window.cancelAnimationFrame(frameId);
			frameId = 0;
		}

		/** Space, the up arrow, a click or a tap: start, resume or jump. */
		function press() {
			if (state.value === 'running') jump();
			else if (state.value === 'paused') run();
			else start();
		}

		function onKeyDown(event) {
			if (event.key !== ' ' && event.key !== 'ArrowUp') return;
			event.preventDefault();
			if (!event.repeat || state.value === 'running') press();
		}

		function onVisibilityChange() {
			if (document.hidden) pause();
		}

		/** Shows a focus ring for keyboard focus only. An inline style can't use `:focus-visible`. */
		function showFocusRing(event) {
			try {
				focusRing.value = event.type === 'focus' && event.target.matches(':focus-visible');
			} catch {
				focusRing.value = false;
			}
		}

		onMounted(() => {
			window.addEventListener('keydown', onKeyDown);
			window.addEventListener('blur', pause);
			document.addEventListener('visibilitychange', onVisibilityChange);
			draw();
		});

		onBeforeUnmount(() => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('blur', pause);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			if (frameId) window.cancelAnimationFrame(frameId);
		});

		return {
			state,
			score,
			best,
			jumping,
			focusRing,
			showFocusRing,
			formatNumber,
			buttonLabel,
			press,
			WIDTH,
			HEIGHT,
			stack,
			between,
			overlay,
			t,
		};
	},
	template: `
		<section data-test-id="arcade" :data-state="state" :data-jumping="jumping ? 'true' : 'false'" :style="stack">
			<header style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
				<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.arcade.heading') }}</N8nHeading>
				<N8nText size="small" color="text-light">{{ t('uiExtensions.arcade.subtitle') }}</N8nText>
			</header>
			<div :style="between">
				<N8nText size="medium" bold data-test-id="arcade-score">{{ t('uiExtensions.arcade.score', { score: formatNumber(score) }) }}</N8nText>
				<N8nText size="small" color="text-light" data-test-id="arcade-best">{{ t('uiExtensions.arcade.best', { best: formatNumber(best) }) }}</N8nText>
			</div>
			<div style="position: relative">
				<canvas
					ref="canvas"
					:width="WIDTH"
					:height="HEIGHT"
					tabindex="0"
					role="img"
					:aria-label="t('uiExtensions.arcade.canvas')"
					data-test-id="arcade-canvas"
					style="display: block; width: 100%; aspect-ratio: 2 / 1; border-radius: var(--radius); background-color: var(--background--subtle); cursor: pointer; touch-action: manipulation; image-rendering: pixelated; outline-offset: 2px"
					:style="{ outline: focusRing ? 'var(--focus--border-width) solid var(--focus--border-color)' : 'none' }"
					:data-focus-ring="focusRing ? 'true' : 'false'"
					@focus="showFocusRing"
					@blur="showFocusRing"
					@pointerdown.prevent="press"
				/>
				<div v-if="state !== 'running'" :style="overlay" data-test-id="arcade-overlay">
					<N8nText v-if="state === 'over'" size="large" bold data-test-id="arcade-game-over">{{ t('uiExtensions.arcade.gameOver') }}</N8nText>
					<N8nText v-else-if="state === 'paused'" size="large" bold>{{ t('uiExtensions.arcade.paused') }}</N8nText>
					<N8nButton variant="solid" size="small" data-test-id="arcade-play" @click="press">{{ buttonLabel }}</N8nButton>
				</div>
			</div>
			<N8nText size="small" color="text-light">{{ t('uiExtensions.arcade.hint') }}</N8nText>
		</section>
	`,
};
