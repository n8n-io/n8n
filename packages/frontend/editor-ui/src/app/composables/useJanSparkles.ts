import { tryOnScopeDispose, useEventListener } from '@vueuse/core';

// The photos are git-ignored. A glob matches nothing when they are missing, so the build still works.
const janImages = import.meta.glob<string>('../assets/jan*.png', {
	eager: true,
	query: '?url',
	import: 'default',
});
const janUrl = janImages['../assets/jan.png'];
const janCursorUrl = janImages['../assets/jan-cursor.png'];
const janCursorLargeUrl = janImages['../assets/jan-cursor-large.png'];

const PALETTE = 'n8n-extreme';
const SPARKLES_PER_CLICK = 14;
const BURST_MS = 1200;
const TRAIL_MS = 600;
const TRAIL_EVERY_MS = 40;
const TRAIL_EVERY_PX = 16;
// Caps the trail, so a fast mouse cannot flood the page.
const TRAIL_MAX = 24;
const LARGE_CURSOR_MS = 3000;

const canAdoptSheets = () =>
	'replaceSync' in CSSStyleSheet.prototype && 'adoptedStyleSheets' in document;

/**
 * A style sheet that gives every element of the theme the cursor, so buttons and the canvas do not
 * keep their own. The hotspot is the middle of the face.
 */
function createCursorSheet(url: string, hotspot: string): CSSStyleSheet {
	const scope = `body[data-palette='${PALETTE}']`;
	const sheet = new CSSStyleSheet();
	sheet.replaceSync(
		`${scope}, ${scope} *, ${scope} *::before, ${scope} *::after { cursor: url("${url}") ${hotspot}, auto !important; }`,
	);
	return sheet;
}

function adopt(sheet: CSSStyleSheet) {
	if (!document.adoptedStyleSheets.includes(sheet)) {
		// A later sheet wins over an earlier one, so the large cursor beats the small one.
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
}

function drop(sheet: CSSStyleSheet | undefined) {
	if (sheet) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
}

let cursorSheet: CSSStyleSheet | undefined;
let largeCursorSheet: CSSStyleSheet | undefined;
let largeCursorTimer: ReturnType<typeof setTimeout> | undefined;

function hideLargeCursor() {
	clearTimeout(largeCursorTimer);
	drop(largeCursorSheet);
}

/** Shows the large cursor for `LARGE_CURSOR_MS`. Each click starts the time again. */
function showLargeCursor() {
	if (!janCursorLargeUrl || !canAdoptSheets()) return;

	largeCursorSheet ??= createCursorSheet(janCursorLargeUrl, '48 38');
	adopt(largeCursorSheet);
	clearTimeout(largeCursorTimer);
	largeCursorTimer = setTimeout(hideLargeCursor, LARGE_CURSOR_MS);
}

/** Adds one decorative Jan face at a point and removes it when its animation ends. */
function spawnJan(
	x: number,
	y: number,
	size: number,
	keyframes: Keyframe[],
	options: KeyframeAnimationOptions,
	onRemove?: () => void,
): boolean {
	if (!janUrl) return false;
	const face = document.createElement('img');
	face.src = janUrl;
	face.alt = '';
	face.setAttribute('aria-hidden', 'true');
	Object.assign(face.style, {
		position: 'fixed',
		left: `${x}px`,
		top: `${y}px`,
		width: `${size}px`,
		pointerEvents: 'none',
		zIndex: '2147483647',
	});
	document.body.appendChild(face);
	const remove = () => {
		face.remove();
		onRemove?.();
	};
	const animation = face.animate(keyframes, options);
	animation.onfinish = remove;
	animation.oncancel = remove;
	return true;
}

/** Faces fly out from the click, spin, and then fall. */
function burst(x: number, y: number) {
	for (let i = 0; i < SPARKLES_PER_CLICK; i++) {
		const angle = (i / SPARKLES_PER_CLICK) * 2 * Math.PI + Math.random() * 0.4;
		const distance = 60 + Math.random() * 100;
		const dx = Math.cos(angle) * distance;
		const dy = Math.sin(angle) * distance;
		const fall = 80 + Math.random() * 120;
		const spin = (Math.random() - 0.5) * 720;
		const at = (tx: number, ty: number, scale: number, rotate: number) =>
			`translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale}) rotate(${rotate}deg)`;

		spawnJan(
			x,
			y,
			24 + Math.random() * 32,
			[
				{ transform: at(0, 0, 0.2, 0), opacity: 1, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
				{ transform: at(dx, dy, 1.1, spin / 2), opacity: 1, offset: 0.45, easing: 'ease-in' },
				{ transform: at(dx * 1.2, dy + fall, 0.7, spin), opacity: 0 },
			],
			{ duration: BURST_MS },
		);
	}
}

let trailCount = 0;
let lastTrail = { time: 0, x: 0, y: 0 };

/** Drops a small fading face where the mouse moves. */
function trail(x: number, y: number) {
	const now = performance.now();
	const moved = Math.hypot(x - lastTrail.x, y - lastTrail.y);
	if (trailCount >= TRAIL_MAX || now - lastTrail.time < TRAIL_EVERY_MS || moved < TRAIL_EVERY_PX) {
		return;
	}
	lastTrail = { time: now, x, y };

	const spawned = spawnJan(
		x,
		y,
		16 + Math.random() * 8,
		[
			{ transform: 'translate(-50%, -50%) scale(0.9) rotate(0deg)', opacity: 0.9 },
			{ transform: 'translate(-50%, calc(-50% + 24px)) scale(0.2) rotate(90deg)', opacity: 0 },
		],
		{ duration: TRAIL_MS, easing: 'ease-out' },
		() => trailCount--,
	);
	if (spawned) trailCount++;
}

/** The clicked button wiggles. `rotate` and `scale` leave the button's own `transform` alone. */
function wiggle(target: EventTarget | null) {
	if (!(target instanceof Element)) return;
	const control = target.closest('button, [role="button"], a');
	control?.animate(
		[
			{ rotate: '0deg', scale: '1' },
			{ rotate: '-8deg', scale: '1.1' },
			{ rotate: '8deg', scale: '1.1' },
			{ rotate: '-4deg', scale: '1.05' },
			{ rotate: '0deg', scale: '1' },
		],
		{ duration: 400, easing: 'ease-in-out' },
	);
}

const isThemeOn = () => document.body.dataset.palette === PALETTE;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The n8n Extreme theme effects. The cursor is always Jan's head, and a click makes it three times
 * as large for 3 seconds. A click also bursts Jan faces and wiggles the button, and the mouse leaves
 * a trail of faces. Capture phase, so a component that stops propagation still gets the effects.
 */
export function useJanSparkles() {
	if (janCursorUrl && canAdoptSheets()) {
		// The sheet only matches while the theme is on, so it can stay adopted.
		cursorSheet ??= createCursorSheet(janCursorUrl, '16 13');
		adopt(cursorSheet);
	}

	useEventListener(
		document,
		'pointerdown',
		(event: PointerEvent) => {
			if (event.button !== 0 || !isThemeOn()) return;
			// The cursor does not move, so it grows even with reduced motion.
			showLargeCursor();
			if (prefersReducedMotion()) return;
			burst(event.clientX, event.clientY);
			wiggle(event.target);
		},
		{ capture: true, passive: true },
	);

	useEventListener(
		document,
		'pointermove',
		(event: PointerEvent) => {
			if (event.pointerType !== 'mouse' || !isThemeOn() || prefersReducedMotion()) return;
			trail(event.clientX, event.clientY);
		},
		{ capture: true, passive: true },
	);

	tryOnScopeDispose(() => {
		hideLargeCursor();
		drop(cursorSheet);
	});
}
