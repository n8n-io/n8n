import type { ChatAppearance } from './api';

interface Palette {
	primary: string;
	background: string;
	surface: string;
	text: string;
	textLight: string;
	border: string;
}

const LIGHT: Palette = {
	primary: '#ff6d5a',
	background: '#ffffff',
	surface: '#f4f4f6',
	text: '#1f1f29',
	textLight: '#6b6b7b',
	border: '#e3e3ea',
};
const DARK: Palette = {
	primary: '#ff6d5a',
	background: '#1f1f29',
	surface: '#2d2d3a',
	text: '#f4f4f6',
	textLight: '#a3a3b3',
	border: '#3c3c4a',
};
// Hosted page: n8n's brand.
const N8N: Partial<Palette> = {
	primary: '#ea4b71',
	surface: '#f2f2f5',
	text: '#2d2e3a',
	border: '#dcdce4',
};
const FONTS: Record<NonNullable<ChatAppearance['font']>, string> = {
	system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
	serif: "Georgia, 'Times New Roman', serif",
	mono: 'ui-monospace, Menlo, Consolas, monospace',
	rounded: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif",
};
const HEX = /^#[0-9a-fA-F]{6}$/;

/** White or near-black text, whichever reads better on the colour. */
function onColor(hex: string) {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.6 ? '#1f1f29' : '#ffffff';
}

function palette(base: Palette, look: ChatAppearance, theme: 'n8n' | 'default', mode: string) {
	const light = base === LIGHT;
	const colors: Palette = { ...base, ...(theme === 'n8n' && light ? N8N : {}) };
	if (theme === 'n8n') colors.primary = N8N.primary!;
	// The hosted n8n page: a grey page with white bubbles.
	if (theme === 'n8n' && light && mode === 'fullscreen') {
		colors.background = '#f7f7fa';
		colors.surface = '#ffffff';
	}
	// Only hex colours reach CSS (the server checks the owner's; this checks data-* attributes).
	const pick = (value: string | undefined) => (value && HEX.test(value) ? value : undefined);
	colors.primary = pick(look.primaryColor) ?? colors.primary;
	colors.background = pick(look.backgroundColor) ?? colors.background;
	colors.surface = pick(look.agentBubbleColor) ?? colors.surface;
	const text = pick(look.textColor);
	if (text) {
		colors.text = text;
		colors.textLight = `color-mix(in srgb, ${text} 65%, transparent)`;
	}
	return colors;
}

function variables(colors: Palette, look: ChatAppearance) {
	const radius = Number.isInteger(look.radius)
		? Math.min(24, Math.max(0, look.radius!))
		: undefined;
	return [
		`--agent-chat--color-primary:${colors.primary}`,
		`--agent-chat--color-on-primary:${onColor(colors.primary)}`,
		`--agent-chat--color-background:${colors.background}`,
		`--agent-chat--color-surface:${colors.surface}`,
		`--agent-chat--color-text:${colors.text}`,
		`--agent-chat--color-text-light:${colors.textLight}`,
		`--agent-chat--color-border:${colors.border}`,
		look.font && FONTS[look.font] ? `--agent-chat--font-family:${FONTS[look.font]}` : '',
		radius !== undefined ? `--agent-chat--radius:${radius}px` : '',
	]
		.filter(Boolean)
		.join(';');
}

/**
 * The theme as `:host` rules inside the shadow root. CSS that the host page sets on
 * the host element still wins, so embedders keep the last word.
 */
export function themeCss(look: ChatAppearance, theme: 'n8n' | 'default', mode: string) {
	const light = `:host{${variables(palette(LIGHT, look, theme, mode), look)}}`;
	const dark = `:host{${variables(palette(DARK, look, theme, mode), look)}}`;
	if (look.colorScheme === 'dark') return dark;
	if (look.colorScheme === 'auto') return `${light}@media (prefers-color-scheme: dark){${dark}}`;
	return light;
}
