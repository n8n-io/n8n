import { hexToRgb, oklchMixer, rgbToHex, type Rgb } from '@n8n/utils/color/oklch';

export type AccentMode = 'light' | 'dark';

// The default themes' `--background--surface` values.
const SURFACE = { light: '#FFFFFF', dark: '#262626' } as const;
// Hover and active move away from the surface: toward black in light mode, toward white in dark.
const AWAY = { light: '#000000', dark: '#FFFFFF' } as const;
// `N8nButton` variant `brand` draws its label in black in both modes.
const BUTTON_TEXT = '#000000';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const luminance = (rgb: Rgb) => {
	const [r, g, b] = rgb.map((channel) => {
		const c = channel / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG 2 contrast ratio of two `#RRGGBB` colors. */
export function contrastRatio(a: string, b: string): number {
	const [high, low] = [a, b].map((hex) => luminance(hexToRgb(hex))).sort((x, y) => y - x);
	return (high + 0.05) / (low + 0.05);
}

/** Moves the accent toward `target` until it has 3:1 on the surface, so a fill stays visible. */
function visibleOn(accent: string, surface: string, target: string): string {
	const mix = oklchMixer(accent, target);
	for (let step = 0; step <= 20; step++) {
		const hex = rgbToHex(mix(step / 20));
		if (contrastRatio(hex, surface) >= 3) return hex;
	}
	return target;
}

/** The automatic dark mode accent for a light mode accent. */
export function autoDarkAccent(light: string): string {
	return visibleOn(light, SURFACE.dark, '#FFFFFF').toLowerCase();
}

export interface AccentContrast {
	/** Contrast of the button label on the accent. Needs 4.5:1. */
	text: number;
	/** Contrast of the accent on the page surface. Needs 3:1. */
	surface: number;
	passes: boolean;
}

export function accentContrast(color: string, mode: AccentMode): AccentContrast {
	const text = contrastRatio(BUTTON_TEXT, color);
	const surface = contrastRatio(color, SURFACE[mode]);
	return { text, surface, passes: text >= 4.5 && surface >= 3 };
}

/** The nearest lighter or darker shade that passes both contrast checks, or `null`. */
export function suggestAccent(color: string, mode: AccentMode): string | null {
	const lighter = oklchMixer(color, '#FFFFFF');
	const darker = oklchMixer(color, '#000000');
	for (let step = 1; step <= 40; step++) {
		for (const mix of [lighter, darker]) {
			const hex = rgbToHex(mix(step / 40)).toLowerCase();
			if (accentContrast(hex, mode).passes) return hex;
		}
	}
	return null;
}

/** The `--background--brand*` tokens for one mode. `--background--brand--disabled` keeps the n8n gray. */
export function brandTokens(accent: string, mode: AccentMode): Record<string, string> {
	const shade = oklchMixer(accent, AWAY[mode]);
	const tint = oklchMixer(accent, SURFACE[mode]);
	return {
		'--background--brand': accent,
		'--background--brand--hover': rgbToHex(shade(0.15)),
		'--background--brand--active': rgbToHex(shade(0.3)),
		'--background--brand--focus': rgbToHex(tint(0.3)),
	};
}

const toDeclarations = (tokens: Record<string, string>) =>
	Object.entries(tokens)
		.map(([name, value]) => `${name}: ${value};`)
		.join(' ');

const validHex = (color: string | null | undefined) =>
	color && HEX_COLOR.test(color) ? color : null;

/** The accent for each mode. A missing dark value follows the light value. */
export function resolveAccents(light: string | null | undefined, dark?: string | null) {
	const lightColor = validHex(light);
	return {
		light: lightColor,
		dark: validHex(dark) ?? (lightColor ? autoDarkAccent(lightColor) : null),
	};
}

/**
 * The accent overrides only the default themes. A theme preset (`data-palette`) keeps its own accent.
 * `html body` outranks the token selectors in `_tokens.scss`, so source order does not matter.
 */
export function buildAccentCss(light: string | null, dark: string | null): string {
	const rules: string[] = [];
	if (light) rules.push(`html body:not([data-palette]) { ${toDeclarations(brandTokens(light, 'light'))} }`);
	if (dark) {
		const darkTokens = toDeclarations(brandTokens(dark, 'dark'));
		rules.push(
			`html body[data-theme='dark']:not([data-palette]) { ${darkTokens} }`,
			`@media (prefers-color-scheme: dark) { html body:not([data-theme]):not([data-palette]) { ${darkTokens} } }`,
		);
	}
	return rules.join('\n');
}

let sheet: CSSStyleSheet | undefined;

/** Converts any CSS color (hex, rgb, oklch, ...) to `#rrggbb` through a 1x1 canvas. */
function cssColorToHex(color: string): string | null {
	const ctx = document.createElement('canvas').getContext('2d');
	if (!ctx || !color) return null;
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return rgbToHex([r, g, b]).toLowerCase();
}

/**
 * The default theme accent for one mode, read from the `--background--brand` token that the
 * instance accent overrides. A probe element with `data-theme` gets the plain theme tokens,
 * because the override only targets `body`.
 */
export function readDefaultAccent(mode: AccentMode): string | null {
	const probe = document.createElement('div');
	probe.setAttribute('data-theme', mode);
	probe.hidden = true;
	document.body.appendChild(probe);
	const value = getComputedStyle(probe).getPropertyValue('--background--brand').trim();
	probe.remove();
	return cssColorToHex(value);
}

/**
 * Applies the instance accent colors, or removes them for `null`.
 * A constructed style sheet is not subject to a `style-src` Content Security Policy.
 */
export function applyAccentColor(light: string | null | undefined, dark?: string | null): void {
	if (
		typeof CSSStyleSheet === 'undefined' ||
		!('replaceSync' in CSSStyleSheet.prototype) ||
		!('adoptedStyleSheets' in document)
	) {
		return;
	}

	const accents = resolveAccents(light, dark);
	sheet ??= new CSSStyleSheet();
	sheet.replaceSync(buildAccentCss(accents.light, accents.dark));
	if (!document.adoptedStyleSheets.includes(sheet)) {
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
}
