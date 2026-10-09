import { parse, wcagContrast } from 'culori';
import type { Color } from 'culori';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Below this ratio an icon is close to invisible on the node background. Every icon that
 * n8n ships scores 1.5 or higher on its own theme. WCAG 1.4.11 asks for 3:1 for graphics.
 */
export const DEFAULT_CONTRAST_MINIMUM = 1.5;

/**
 * Node background per editor theme: `--node--color--background` in the design system,
 * which is white in the light theme and `--color--neutral-850` in the dark theme.
 */
export const THEME_BACKGROUNDS = {
	light: '#ffffff',
	dark: '#2b2b2b',
} as const;

export type IconTheme = keyof typeof THEME_BACKGROUNDS;

const PAINT_DECLARATION =
	/\b(fill|stroke|stop-color)\s*(?:=\s*"([^"]*)"|=\s*'([^']*)'|:\s*([^;"'}]+))/gi;

const VAR_FALLBACK = /^var\(\s*--[\w-]+\s*,\s*(.+)\)$/;

/**
 * The editor shows file icons through an `<img>` tag, so the SVG is its own document.
 * `currentColor` resolves to the initial color, black. A custom property has no value
 * and falls back to its default or, without one, to black.
 */
function resolvePaint(value: string): string {
	if (value === 'currentcolor') return 'black';
	const fallback = VAR_FALLBACK.exec(value);
	if (fallback) return resolvePaint((fallback[1] ?? '').trim());
	if (value.startsWith('var(')) return 'black';
	return value;
}

/** Returns the parsed CSS color, or null when the value is not a color or is (almost) invisible. */
export function parseColor(value: string): Color | null {
	const color = parse(value.trim());
	if (!color) return null;
	if (color.alpha !== undefined && color.alpha < 0.1) return null;
	return color;
}

/**
 * Best contrast ratio any painted color in the SVG reaches against the background.
 * Returns null when the colors cannot be judged statically (embedded images, `url()`
 * paint without gradient stops, or unsupported color syntax).
 */
export function getSvgContrastRatio(svg: string, background: string): number | null {
	const backgroundColor = parseColor(background);
	if (!backgroundColor) return null;

	// Embedded raster images carry color the SVG markup does not expose.
	if (/<image\b/i.test(svg)) return null;

	const values: string[] = [];
	let hasFill = false;
	let hasStopColor = false;
	let hasUrlPaint = false;
	for (const [, property = '', attrDouble, attrSingle, cssValue] of svg.matchAll(
		PAINT_DECLARATION,
	)) {
		const value = resolvePaint((attrDouble ?? attrSingle ?? cssValue ?? '').trim().toLowerCase());
		if (value === 'none' || value === 'transparent' || value === 'inherit' || value === '') {
			continue;
		}
		const name = property.toLowerCase();
		if (name === 'fill') hasFill = true;
		if (name === 'stop-color') hasStopColor = true;
		if (value.startsWith('url(')) hasUrlPaint = true;
		values.push(value);
	}

	// A url() paint without gradient stops points at a pattern or image the rule cannot read.
	if (hasUrlPaint && !hasStopColor) return null;

	const colors = values.map(parseColor).filter((color): color is Color => color !== null);

	// An SVG without a fill paints its shapes black.
	if (colors.length === 0) {
		if (hasFill) return null;
		colors.push({ mode: 'rgb', r: 0, g: 0, b: 0 });
	}

	return Math.max(...colors.map((color) => wcagContrast(color, backgroundColor)));
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
