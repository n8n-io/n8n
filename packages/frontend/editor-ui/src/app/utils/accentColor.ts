import { hexToRgb, oklchMixer, rgbToHex, type Rgb } from '@n8n/utils/color/oklch';

// The default themes' `--background--surface` values.
const SURFACE = { light: '#FFFFFF', dark: '#262626' } as const;

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

/** The accent that each default theme uses after the visibility adjustment. */
export function resolveAccent(color: string) {
	return {
		light: visibleOn(color, SURFACE.light, '#000000'),
		dark: visibleOn(color, SURFACE.dark, '#FFFFFF'),
	};
}

// The accent sets only the `--background--brand*` tokens. Hover and active move away from the
// surface, focus moves toward it. `--background--brand--disabled` keeps the n8n gray.
function brandTokens(accent: string, away: string, surface: string): string {
	const shade = oklchMixer(accent, away);
	const tint = oklchMixer(accent, surface);
	return [
		`--background--brand: ${accent};`,
		`--background--brand--hover: ${rgbToHex(shade(0.15))};`,
		`--background--brand--active: ${rgbToHex(shade(0.3))};`,
		`--background--brand--focus: ${rgbToHex(tint(0.3))};`,
	].join(' ');
}

/**
 * The accent overrides only the default themes. A theme preset (`data-palette`) keeps its own accent.
 * `html body` outranks the token selectors in `_tokens.scss`, so source order does not matter.
 */
export function buildAccentCss(color: string): string {
	const { light, dark } = resolveAccent(color);
	const lightTokens = brandTokens(light, '#000000', SURFACE.light);
	const darkTokens = brandTokens(dark, '#FFFFFF', SURFACE.dark);

	return `html body:not([data-palette]) { ${lightTokens} }
html body[data-theme='dark']:not([data-palette]) { ${darkTokens} }
@media (prefers-color-scheme: dark) {
	html body:not([data-theme]):not([data-palette]) { ${darkTokens} }
}`;
}

let sheet: CSSStyleSheet | undefined;

/**
 * Applies the instance accent color, or removes it for `null`.
 * A constructed style sheet is not subject to a `style-src` Content Security Policy.
 */
export function applyAccentColor(color: string | null | undefined): void {
	if (
		typeof CSSStyleSheet === 'undefined' ||
		!('replaceSync' in CSSStyleSheet.prototype) ||
		!('adoptedStyleSheets' in document)
	) {
		return;
	}

	sheet ??= new CSSStyleSheet();
	sheet.replaceSync(color && /^#[0-9a-f]{6}$/i.test(color) ? buildAccentCss(color) : '');
	if (!document.adoptedStyleSheets.includes(sheet)) {
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
}
