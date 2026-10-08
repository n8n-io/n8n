import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Below this ratio an icon is close to invisible on the node background. Every icon that
 * n8n ships scores 1.5 or higher on its own theme. WCAG 1.4.11 asks for 3:1 for graphics.
 */
export const DEFAULT_CONTRAST_MINIMUM = 1.5;

/** Node background per editor theme (`--node--color--background` in the design system). */
export const THEME_BACKGROUNDS = {
	light: '#ffffff',
	dark: '#262626',
} as const;

export type IconTheme = keyof typeof THEME_BACKGROUNDS;

type Rgb = [number, number, number];

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
const NAMED_COLORS: Record<string, Rgb> = { black: BLACK, white: WHITE };

const PAINT_DECLARATION =
	/\b(fill|stroke|stop-color)\s*(?:=\s*"([^"]*)"|=\s*'([^']*)'|:\s*([^;"'}]+))/gi;

function parseChannel(raw: string): number {
	return raw.endsWith('%') ? (Number.parseFloat(raw) / 100) * 255 : Number.parseFloat(raw);
}

/** Returns the color as RGB, or null when the value is not a plain color or is (almost) invisible. */
export function parseColor(value: string): Rgb | null {
	const color = value.trim().toLowerCase();

	const named = NAMED_COLORS[color];
	if (named) return named;

	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(color)?.[1];
	if (hex) {
		const digits = hex.length <= 4 ? [...hex].map((d) => d + d).join('') : hex;
		const channel = (index: number) => Number.parseInt(digits.slice(index * 2, index * 2 + 2), 16);
		if (digits.length === 8 && channel(3) < 26) return null;
		return [channel(0), channel(1), channel(2)];
	}

	const rgb =
		/^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
			color,
		);
	if (rgb) {
		const [, r = '', g = '', b = '', alpha] = rgb;
		if (alpha !== undefined) {
			const a = alpha.endsWith('%') ? Number.parseFloat(alpha) / 100 : Number.parseFloat(alpha);
			if (a < 0.1) return null;
		}
		return [parseChannel(r), parseChannel(g), parseChannel(b)];
	}

	return null;
}

function linearize(channel: number): number {
	const c = channel / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: Rgb): number {
	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
	const l1 = relativeLuminance(foreground);
	const l2 = relativeLuminance(background);
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Best contrast ratio any painted color in the SVG reaches against the background.
 * Returns null when the colors cannot be judged statically (`currentColor`,
 * `url()`, `var()`, or unsupported color syntax).
 */
export function getSvgContrastRatio(svg: string, background: string): number | null {
	const backgroundRgb = parseColor(background);
	if (!backgroundRgb) return null;

	// Embedded raster images carry color the SVG markup does not expose.
	if (/<image\b/i.test(svg)) return null;

	const values: string[] = [];
	let hasFill = false;
	let hasStopColor = false;
	let hasUrlPaint = false;
	for (const [, property = '', attrDouble, attrSingle, cssValue] of svg.matchAll(
		PAINT_DECLARATION,
	)) {
		const value = (attrDouble ?? attrSingle ?? cssValue ?? '').trim().toLowerCase();
		if (value === 'none' || value === 'transparent' || value === 'inherit' || value === '') {
			continue;
		}
		if (value === 'currentcolor' || value.startsWith('var(')) return null;
		const name = property.toLowerCase();
		if (name === 'fill') hasFill = true;
		if (name === 'stop-color') hasStopColor = true;
		if (value.startsWith('url(')) hasUrlPaint = true;
		values.push(value);
	}

	// A url() paint without gradient stops points at a pattern or image the rule cannot read.
	if (hasUrlPaint && !hasStopColor) return null;

	const colors = values.map(parseColor).filter((color): color is Rgb => color !== null);

	// An SVG without a fill paints its shapes black.
	if (colors.length === 0) {
		if (hasFill) return null;
		colors.push(BLACK);
	}

	return Math.max(...colors.map((color) => contrastRatio(color, backgroundRgb)));
}

/** Reads the SVG an icon path points to, or null when it is not a readable SVG file. */
export function readSvgIcon(iconPath: string, baseDir: string): string | null {
	const relativePath = iconPath.replace(/^file:/, '');
	if (path.extname(relativePath).toLowerCase() !== '.svg') return null;

	// Should not use safeJoinPath here because iconPath can be outside of the node class folder
	const fullPath = path.join(baseDir, relativePath);
	if (!existsSync(fullPath)) return null;

	try {
		return readFileSync(fullPath, 'utf8');
	} catch {
		return null;
	}
}
