import { ref } from 'vue';
import type { AppliedThemeOption } from '@/Interface';
import { LOCAL_STORAGE_CUSTOM_THEME } from '@/app/constants/localStorage';

export const CUSTOM_THEME_STYLE_ID = 'n8n-custom-theme';

export interface CustomThemeSeeds {
	background: string;
	surface: string;
	text: string;
	primary: string;
	accent: string;
}

export interface CustomTheme {
	name: string;
	mode: AppliedThemeOption;
	seeds: CustomThemeSeeds;
}

export const CUSTOM_THEME_PRESETS: Record<string, { label: string; seeds: CustomThemeSeeds }> = {
	'default-light': {
		label: 'Default light',
		seeds: {
			background: '#f5f5f5',
			surface: '#ffffff',
			text: '#252525',
			primary: '#ff6d5a',
			accent: '#7f5af0',
		},
	},
	'default-dark': {
		label: 'Default dark',
		seeds: {
			background: '#171717',
			surface: '#252525',
			text: '#f5f5f5',
			primary: '#ff6d5a',
			accent: '#8b6cf6',
		},
	},
	dracula: {
		label: 'Dracula',
		seeds: {
			background: '#191a21',
			surface: '#282a36',
			text: '#f8f8f2',
			primary: '#bd93f9',
			accent: '#ff79c6',
		},
	},
	catppuccin: {
		label: 'Catppuccin Mocha',
		seeds: {
			background: '#11111b',
			surface: '#1e1e2e',
			text: '#cdd6f4',
			primary: '#cba6f7',
			accent: '#b4befe',
		},
	},
	'gruvbox-light': {
		label: 'Gruvbox light',
		seeds: {
			background: '#fbf1c7',
			surface: '#f9f5d7',
			text: '#282828',
			primary: '#af3a03',
			accent: '#8f3f71',
		},
	},
	'gruvbox-dark': {
		label: 'Gruvbox dark',
		seeds: {
			background: '#141617',
			surface: '#1d2021',
			text: '#fbf1c7',
			primary: '#fe8019',
			accent: '#d3869b',
		},
	},
	'solarized-light': {
		label: 'Solarized light',
		seeds: {
			background: '#eee8d5',
			surface: '#fdf6e3',
			text: '#073642',
			primary: '#268bd2',
			accent: '#d33682',
		},
	},
};

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
	let h = hex.trim().replace('#', '');
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	const n = parseInt(h.slice(0, 6), 16);
	if (Number.isNaN(n)) return [0, 0, 0];
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
	return `#${[r, g, b]
		.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
		.join('')}`;
}

/** Like Sass `color.mix($a, $b, $weight)`: the weight is the share of `a`. */
function mix(a: string, b: string, weight: number): string {
	const ca = parseHex(a);
	const cb = parseHex(b);
	return toHex([0, 1, 2].map((i) => ca[i] * weight + cb[i] * (1 - weight)) as Rgb);
}

function alpha(color: string, a: number): string {
	const [r, g, b] = parseHex(color);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function luminance(color: string): number {
	const [r, g, b] = parseHex(color).map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function detectMode(background: string): AppliedThemeOption {
	return luminance(background) > 0.18 ? 'light' : 'dark';
}

const TINT_WEIGHTS: Array<[string, number]> = [
	['50', 0.1],
	['100', 0.18],
	['150', 0.26],
	['200', 0.34],
	['250', 0.42],
	['300', 0.5],
	['400', 0.75],
];
const SHADE_WEIGHTS: Array<[string, number]> = [
	['600', 0.85],
	['700', 0.7],
	['800', 0.5],
	['900', 0.32],
	['950', 0.22],
];

function ramp(name: string, accent: string, light: string, dark: string): string[] {
	return [
		...TINT_WEIGHTS.map(([step, w]) => `--color--${name}-${step}: ${mix(accent, light, w)};`),
		`--color--${name}-500: ${accent};`,
		...SHADE_WEIGHTS.map(([step, w]) => `--color--${name}-${step}: ${mix(accent, dark, w)};`),
	];
}

function alphaRamp(name: string, accent: string, steps: Array<[string, number]>): string[] {
	return steps.map(([step, a]) => `--color--${name}-alpha-${step}: ${alpha(accent, a)};`);
}

// The share of the text colour in each neutral step, from the lightest to the darkest step.
const LIGHT_NEUTRAL_TEXT_WEIGHTS: Array<[string, number]> = [
	['125', 0.05],
	['150', 0.07],
	['200', 0.11],
	['250', 0.13],
	['300', 0.17],
	['400', 0.29],
	['500', 0.44],
	['600', 0.61],
	['700', 0.84],
	['750', 0.89],
	['800', 0.93],
	['850', 0.97],
];
const DARK_NEUTRAL_TEXT_WEIGHTS: Array<[string, number]> = [
	['100', 0.94],
	['125', 0.92],
	['150', 0.88],
	['200', 0.82],
	['250', 0.76],
	['300', 0.7],
	['400', 0.55],
	['500', 0.42],
	['600', 0.32],
	['700', 0.18],
	['750', 0.13],
	['800', 0.08],
	['850', 0.04],
];

const STATUS_COLORS: Record<
	AppliedThemeOption,
	Record<'green' | 'red' | 'yellow' | 'orange' | 'blue' | 'mint', string>
> = {
	light: {
		green: '#1e8a3c',
		red: '#d1242f',
		yellow: '#b58900',
		orange: '#cb4b16',
		blue: '#0969da',
		mint: '#0f8a7e',
	},
	dark: {
		green: '#50fa7b',
		red: '#ff5555',
		yellow: '#f1fa8c',
		orange: '#ffb86c',
		blue: '#8be9fd',
		mint: '#79dac8',
	},
};

// A dark palette must declare all semantic tokens again (see `_palettes.scss`). Sass bakes them
// into each preset, so copy them from the compiled Dracula block. The ramps below override its colours.
let darkBaseCache: string | null = null;

function findStyleRule(rules: CSSRuleList, selector: string): CSSStyleRule | null {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule && rule.selectorText === selector) return rule;
		if ('cssRules' in rule && rule.cssRules) {
			const found = findStyleRule(rule.cssRules as CSSRuleList, selector);
			if (found) return found;
		}
	}
	return null;
}

function getDarkBaseDeclarations(): string | null {
	if (darkBaseCache) return darkBaseCache;
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		const rule = findStyleRule(rules, 'body[data-palette="dracula"]');
		if (!rule) continue;
		const lines: string[] = [];
		for (let i = 0; i < rule.style.length; i++) {
			const name = rule.style[i];
			lines.push(`${name}: ${rule.style.getPropertyValue(name)};`);
		}
		darkBaseCache = lines.join('\n\t');
		return darkBaseCache;
	}
	return null;
}

export function generateCustomThemeCss(theme: CustomTheme, darkBase: string | null = null): string {
	const { background, surface, text, primary, accent } = theme.seeds;
	const isDark = theme.mode === 'dark';
	const lines: string[] = [];

	let light: string;
	let dark: string;
	if (isDark) {
		light = text;
		dark = background;
		lines.push(
			`--color--neutral-white: ${text};`,
			`--color--neutral-50: ${text};`,
			...DARK_NEUTRAL_TEXT_WEIGHTS.map(
				([step, w]) => `--color--neutral-${step}: ${mix(text, surface, w)};`,
			),
			`--color--neutral-900: ${surface};`,
			`--color--neutral-950: ${background};`,
			`--color--neutral-black: ${mix(background, '#000000', 0.5)};`,
		);
	} else {
		light = surface;
		dark = mix(text, '#000000', 0.8);
		lines.push(
			`--color--neutral-white: ${surface};`,
			`--color--neutral-50: ${mix(surface, background, 0.5)};`,
			`--color--neutral-100: ${background};`,
			...LIGHT_NEUTRAL_TEXT_WEIGHTS.map(
				([step, w]) => `--color--neutral-${step}: ${mix(text, background, w)};`,
			),
			`--color--neutral-900: ${text};`,
			`--color--neutral-950: ${dark};`,
			`--color--neutral-black: #000000;`,
		);
	}

	const status = STATUS_COLORS[theme.mode];
	lines.push(
		...ramp('pink', primary, light, dark),
		...ramp('purple', accent, light, dark),
		...ramp('green', status.green, light, dark),
		...ramp('red', status.red, light, dark),
		...ramp('yellow', status.yellow, light, dark),
		...ramp('orange', status.orange, light, dark),
		...ramp('gold', status.orange, light, dark),
		...ramp('blue', status.blue, light, dark),
		...ramp('mint', status.mint, light, dark),
		...alphaRamp('orange', status.orange, [
			['100', 0.1],
			['150', 0.15],
			['200', 0.2],
			['300', 0.3],
			['400', 0.4],
			['500', 0.5],
			['600', 0.6],
			['700', 0.7],
			['800', 0.8],
			['900', 0.9],
			['950', 0.95],
		]),
		...alphaRamp('green', status.green, [
			['100', 0.15],
			['200', 0.25],
		]),
		...alphaRamp('purple', accent, [
			['100', 0.1],
			['200', 0.25],
			['300', 0.4],
			['400', 0.6],
			['500', 0.8],
		]),
		...alphaRamp('red', status.red, [['020', 0.2]]),
		...alphaRamp('gold', status.orange, [['020', 0.2]]),
	);

	// The solid button takes the brand colour. Its label must stay readable on it.
	const buttonText = luminance(primary) > 0.35 ? (isDark ? background : dark) : '#ffffff';
	lines.push(
		'--color--primary: var(--color--pink-500);',
		`--button--color--text--primary: ${buttonText};`,
		'--canvas--color--selected: var(--color--pink-500);',
		`--code--selection--color: ${alpha(primary, 0.3)};`,
	);

	if (isDark) {
		lines.push(
			`--code-tags--string--color: ${status.yellow};`,
			`--code-tags--regex--color: ${status.red};`,
			`--code-tags--primitive--color: ${primary};`,
			`--code-tags--keyword--color: ${accent};`,
			`--code-tags--variable--color: ${text};`,
			`--code-tags--parameter--color: ${status.orange};`,
			`--code-tags--function--color: ${status.green};`,
			`--code-tags--constant--color: ${primary};`,
			`--code-tags--property--color: ${status.blue};`,
			`--code-tags--type--color: ${status.blue};`,
			`--code-tags--class--color: ${status.blue};`,
			`--code-tags--heading--color: ${primary};`,
			`--code-tags--invalid--color: ${status.red};`,
			`--code-tags--comment--color: ${mix(text, surface, 0.45)};`,
		);
	}

	// `html` raises the specificity above `body[data-theme]`, whatever the order of the style tags.
	const body = [...(isDark && darkBase ? [darkBase] : []), ...lines].join('\n\t');
	return `html body[data-palette='custom'] {\n\t${body}\n}\n`;
}

let retryTimer: ReturnType<typeof setTimeout> | undefined;
let lastInjected: CustomTheme | null = null;

/** Writes the CSS of a custom theme into the one `<style id="n8n-custom-theme">` in `<head>`. */
export function injectCustomThemeStyle(theme: CustomTheme | null, attempt = 0) {
	if (typeof document === 'undefined') return;
	lastInjected = theme;
	clearTimeout(retryTimer);
	let style = document.getElementById(CUSTOM_THEME_STYLE_ID) as HTMLStyleElement | null;
	if (!theme) {
		style?.remove();
		return;
	}
	if (!style) {
		style = document.createElement('style');
		style.id = CUSTOM_THEME_STYLE_ID;
		document.head.appendChild(style);
	}
	const darkBase = theme.mode === 'dark' ? getDarkBaseDeclarations() : null;
	style.textContent = generateCustomThemeCss(theme, darkBase);
	// At boot the design system styles can load after this module. Try again once they are in.
	if (theme.mode === 'dark' && !darkBase && attempt < 50) {
		retryTimer = setTimeout(() => {
			if (lastInjected === theme) injectCustomThemeStyle(theme, attempt + 1);
		}, 100);
	}
}

function isCustomTheme(value: unknown): value is CustomTheme {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Partial<CustomTheme>;
	return (
		typeof v.name === 'string' &&
		(v.mode === 'light' || v.mode === 'dark') &&
		typeof v.seeds === 'object' &&
		v.seeds !== null
	);
}

function readStoredCustomTheme(): CustomTheme | null {
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_THEME);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		return isCustomTheme(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/** The saved custom theme. Reactive, so the theme lists update when it changes mode. */
export const customTheme = ref<CustomTheme | null>(readStoredCustomTheme());

injectCustomThemeStyle(customTheme.value);

export function saveCustomTheme(theme: CustomTheme) {
	const copy: CustomTheme = { ...theme, seeds: { ...theme.seeds } };
	localStorage.setItem(LOCAL_STORAGE_CUSTOM_THEME, JSON.stringify(copy));
	customTheme.value = copy;
	injectCustomThemeStyle(copy);
}
