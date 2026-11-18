import { hashString } from '../species/species.registry';

/** Frame styles of project tanks. `none` is for the single tank, which fills the screen. */
export type FrameStyle = 'none' | 'wood' | 'steel' | 'porthole' | 'stone' | 'brass' | 'glass';

/** Logical pixels that a frame adds on each side of its tank. */
export const FRAME_THICKNESS: Record<FrameStyle, number> = {
	none: 0,
	wood: 4,
	steel: 4,
	porthole: 6,
	stone: 5,
	brass: 3,
	glass: 2,
};

/** Caps the porthole corner, so a big tank gets a rounded window and not a huge plate. */
const PORTHOLE_MAX_RADIUS = 12;

/** Each style is listed as often as it should be picked. */
const STYLE_WEIGHTS: FrameStyle[] = [
	'wood',
	'wood',
	'steel',
	'porthole',
	'porthole',
	'stone',
	'brass',
	'glass',
	'glass',
];

/** Stable for a tank id, so a tank keeps its frame between reloads. */
export function frameStyleFor(tankId: string): FrameStyle {
	return STYLE_WEIGHTS[hashString(`frame:${tankId}`) % STYLE_WEIGHTS.length];
}

interface Palette {
	base: string;
	dark: string;
	light: string;
	accent: string;
	accentDark: string;
}

/** Colour variants of each style. `accent` is rust, moss, grain or shine, by style. */
const PALETTES: Record<Exclude<FrameStyle, 'none'>, Palette[]> = {
	wood: [
		{
			base: '#8b5a2b',
			dark: '#5e3a1a',
			light: '#b07a43',
			accent: '#6f4522',
			accentDark: '#4a2c13',
		},
		{
			base: '#5b3a24',
			dark: '#3b2416',
			light: '#7d5236',
			accent: '#4a2e1c',
			accentDark: '#2c1a0f',
		},
		{
			base: '#2f7f86',
			dark: '#1f5a60',
			light: '#59a7ad',
			accent: '#8b6a4a',
			accentDark: '#5e4630',
		},
	],
	steel: [
		{
			base: '#5f7380',
			dark: '#3e4c55',
			light: '#8396a3',
			accent: '#9a5126',
			accentDark: '#6e3519',
		},
		{
			base: '#56665a',
			dark: '#38443b',
			light: '#7d8f81',
			accent: '#8f5a2e',
			accentDark: '#61391b',
		},
	],
	porthole: [
		{
			base: '#4f6573',
			dark: '#34444e',
			light: '#9fb3c0',
			accent: '#a0623f',
			accentDark: '#5a3220',
		},
	],
	stone: [
		{
			base: '#8a8f94',
			dark: '#4a4e52',
			light: '#a8adb1',
			accent: '#6e7378',
			accentDark: '#5c6166',
		},
		{
			base: '#8a8f94',
			dark: '#4a4e52',
			light: '#a8adb1',
			accent: '#5f8a4a',
			accentDark: '#45693a',
		},
	],
	brass: [
		{
			base: '#b5893b',
			dark: '#7a5a22',
			light: '#e8c46a',
			accent: '#fff1b8',
			accentDark: '#5e4418',
		},
	],
	glass: [
		{
			base: '#3fb6c4',
			dark: '#23798a',
			light: '#a6e6ee',
			accent: '#ffffff',
			accentDark: '#1b5c69',
		},
		{
			base: '#d9534f',
			dark: '#9c2f2c',
			light: '#f0928f',
			accent: '#ffffff',
			accentDark: '#6e1f1d',
		},
		{
			base: '#2b2f33',
			dark: '#121416',
			light: '#5d646b',
			accent: '#c9d1d8',
			accentDark: '#0a0b0c',
		},
		{
			base: '#e8eef2',
			dark: '#9aa6af',
			light: '#ffffff',
			accent: '#ffffff',
			accentDark: '#7d8992',
		},
	],
};

/** 0 to 999, stable for the inputs. Gives pixel noise without state. */
function noise(seed: number, ...values: number[]): number {
	return hashString(`${seed}:${values.join(',')}`) % 1000;
}

/** Signed distance from a point to a rounded rectangle. Negative inside. */
function roundedRectDistance(
	x: number,
	y: number,
	rect: { x: number; y: number; width: number; height: number; radius: number },
): number {
	const halfW = rect.width / 2;
	const halfH = rect.height / 2;
	const qx = Math.abs(x - (rect.x + halfW)) - (halfW - rect.radius);
	const qy = Math.abs(y - (rect.y + halfH)) - (halfH - rect.radius);
	const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
	return outside + Math.min(Math.max(qx, qy), 0) - rect.radius;
}

export interface FrameSpec {
	style: FrameStyle;
	/** Inner size: the tank the frame goes around. */
	width: number;
	height: number;
	/** Picks the colour variant and the noise. */
	seed: string;
}

/**
 * The colour of one frame pixel, or `undefined` where the frame is transparent (the window).
 * `px` and `py` are in frame coordinates: the tank starts at the frame thickness.
 */
export function frameColorAt(spec: FrameSpec, px: number, py: number): string | undefined {
	if (spec.style === 'none') return undefined;
	const t = FRAME_THICKNESS[spec.style];
	const outerW = spec.width + 2 * t;
	const outerH = spec.height + 2 * t;
	const seed = hashString(spec.seed);
	const variants = PALETTES[spec.style];
	const palette = variants[seed % variants.length];
	const insideTank = px >= t && px < t + spec.width && py >= t && py < t + spec.height;

	if (spec.style === 'porthole') return portholeColor(spec, palette, seed, px, py, t);
	if (insideTank) return undefined;

	// Distance from the outer edge, and which side the pixel is on. Corners are mitred.
	const fromLeft = px;
	const fromRight = outerW - 1 - px;
	const fromTop = py;
	const fromBottom = outerH - 1 - py;
	const across = Math.min(fromLeft, fromRight, fromTop, fromBottom);
	const horizontal = Math.min(fromTop, fromBottom) <= Math.min(fromLeft, fromRight);
	const along = horizontal ? px : py;
	const side = horizontal ? (fromTop < fromBottom ? 0 : 1) : fromLeft < fromRight ? 2 : 3;

	switch (spec.style) {
		case 'wood': {
			const plankLength = 18;
			const offset = noise(seed, side) % plankLength;
			const plank = Math.floor((along + offset) / plankLength);
			if (across === 0) return palette.dark;
			if (across === t - 1) return palette.light;
			if ((along + offset) % plankLength === 0) return palette.accentDark;
			const grain = noise(seed, side, plank, across, Math.floor(along / 3));
			if (grain < 140) return palette.accent;
			return noise(seed, side, plank) < 400 ? palette.light : palette.base;
		}
		case 'steel': {
			if (across === 0) return palette.dark;
			if (across === t - 1) return palette.light;
			// A rivet every 9 pixels in the middle of the band: a bright top and a dark bottom.
			const rivet = along % 9;
			if (across === 1 && rivet === 4) return palette.light;
			if (across === 2 && rivet === 4) return palette.dark;
			const rust = noise(seed, Math.floor(px / 5), Math.floor(py / 5)) < 180;
			if (rust && noise(seed, px, py) < 600)
				return noise(seed, py, px) < 500 ? palette.accent : palette.accentDark;
			return noise(seed, px, py, 1) < 90 ? palette.light : palette.base;
		}
		case 'stone': {
			if (across === 0) return palette.dark;
			const course = across < 3 ? 0 : 1;
			const offset = course * 5 + (noise(seed, side) % 9);
			if (across === 2 || (along + offset) % 9 === 0) return palette.dark;
			const block = Math.floor((along + offset) / 9);
			const shade = noise(seed, side, course, block);
			if (noise(seed, px, py) < 70) return palette.accent;
			if (shade < 300) return palette.light;
			return shade < 650 ? palette.base : palette.accentDark;
		}
		case 'brass': {
			if (across === 0) return palette.accentDark;
			if (across === 1) return noise(seed, along) < 60 ? palette.accent : palette.light;
			return palette.base;
		}
		case 'glass': {
			if (across === 0) return palette.dark;
			// A reflection on the top rim.
			if (side === 0 && along % 23 < 6) return palette.accent;
			return palette.base;
		}
	}
	return palette.base;
}

/** A steel plate with a rounded window, a bright ring around it, rivets, and rust. */
function portholeColor(
	spec: FrameSpec,
	palette: Palette,
	seed: number,
	px: number,
	py: number,
	t: number,
): string | undefined {
	const radius = Math.min(Math.min(spec.width, spec.height) * 0.34, PORTHOLE_MAX_RADIUS);
	const opening = { x: t, y: t, width: spec.width, height: spec.height, radius };
	const distance = roundedRectDistance(px + 0.5, py + 0.5, opening);
	if (distance < 0) return undefined;
	if (distance < 1) return palette.light;
	if (distance < 2.5) return palette.base;
	if (distance < 3.2) return palette.dark;

	// Rivets on a ring just outside the window, about every 11 pixels of its length.
	if (distance >= 3.5 && distance < 5.5) {
		const centreX = t + spec.width / 2;
		const centreY = t + spec.height / 2;
		const angle = Math.atan2(py + 0.5 - centreY, px + 0.5 - centreX);
		const ringW = spec.width + 9;
		const ringH = spec.height + 9;
		const perimeter = 2 * (ringW + ringH) - (8 - 2 * Math.PI) * (radius + 4.5);
		const count = Math.max(8, Math.round(perimeter / 11));
		const step = (angle / (2 * Math.PI)) * count;
		const offset = (step - Math.round(step)) * (perimeter / count);
		if (Math.abs(offset) < 1.2) {
			return offset < 0 && distance < 4.6 ? palette.accent : palette.accentDark;
		}
	}

	const outer = Math.min(px, py, spec.width + 2 * t - 1 - px, spec.height + 2 * t - 1 - py);
	if (outer === 0) return palette.dark;
	const rust = noise(seed, Math.floor(px / 4), Math.floor(py / 4)) < 220;
	if (rust && noise(seed, px, py) < 550)
		return noise(seed, py, px) < 450 ? palette.accent : palette.accentDark;
	return noise(seed, px, py, 2) < 80 ? palette.light : palette.base;
}

const rgbCache = new Map<string, [number, number, number]>();

function rgb(hex: string): [number, number, number] {
	const cached = rgbCache.get(hex);
	if (cached) return cached;
	const value: [number, number, number] = [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16),
	];
	rgbCache.set(hex, value);
	return value;
}

/** Paints a frame to a new canvas, the size of the tank plus the frame on each side. */
export function paintFrame(spec: FrameSpec): HTMLCanvasElement | undefined {
	const t = FRAME_THICKNESS[spec.style];
	if (t === 0) return undefined;
	const width = spec.width + 2 * t;
	const height = spec.height + 2 * t;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return undefined;

	const image = ctx.createImageData(width, height);
	for (let py = 0; py < height; py++) {
		for (let px = 0; px < width; px++) {
			// Skip the inside of plain frames quickly. The porthole plate covers the corners.
			if (
				spec.style !== 'porthole' &&
				px >= t &&
				px < t + spec.width &&
				py >= t &&
				py < t + spec.height
			) {
				px = t + spec.width - 1;
				continue;
			}
			const color = frameColorAt(spec, px, py);
			if (!color) continue;
			const [r, g, b] = rgb(color);
			const i = (py * width + px) * 4;
			image.data[i] = r;
			image.data[i + 1] = g;
			image.data[i + 2] = b;
			image.data[i + 3] = 255;
		}
	}
	ctx.putImageData(image, 0, 0);
	return canvas;
}
