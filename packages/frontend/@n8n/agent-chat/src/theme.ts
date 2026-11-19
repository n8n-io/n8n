import type { ChatAppearance, ColorSet } from './api';

interface Palette {
	primary: string;
	background: string;
	surface: string;
	text: string;
	textLight: string;
	border: string;
}
type Scheme = 'light' | 'dark';

// n8n branding: the default for the hosted page and the embed.
const N8N: Record<Scheme, Palette> = {
	light: {
		primary: '#ea4b71',
		background: '#ffffff',
		surface: '#f2f2f5',
		text: '#2d2e3a',
		textLight: '#6b6b7b',
		border: '#dcdce4',
	},
	dark: {
		primary: '#ea4b71',
		background: '#1f1f27',
		surface: '#2c2c36',
		text: '#f2f2f5',
		textLight: '#a3a3b3',
		border: '#3c3c4a',
	},
};
// The full hosted page: a tinted page with lighter bubbles.
const HOSTED: Record<Scheme, Partial<Palette>> = {
	light: { background: '#f7f7fa', surface: '#ffffff' },
	dark: { background: '#17171d', surface: '#26262f' },
};
const FONTS: Record<NonNullable<ChatAppearance['font']>, string> = {
	system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
	serif: "Georgia, 'Times New Roman', serif",
	mono: 'ui-monospace, Menlo, Consolas, monospace',
	rounded: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif",
};
const HEX = /^#[0-9a-fA-F]{6}$/;

/** White or near-black, whichever reads better on the colour. */
export function onColor(hex: string) {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.6 ? '#1f1f29' : '#ffffff';
}

/** Owner or site colours for one scheme: the site's data-* (top level) win over the saved set. */
function chosen(look: ChatAppearance, scheme: Scheme): ColorSet {
	const pick = (value: string | undefined) => (value && HEX.test(value) ? value : undefined);
	const set = look[scheme] ?? {};
	return {
		primaryColor: pick(look.primaryColor) ?? pick(set.primaryColor),
		backgroundColor: pick(look.backgroundColor) ?? pick(set.backgroundColor),
		textColor: pick(look.textColor) ?? pick(set.textColor),
		agentBubbleColor: pick(look.agentBubbleColor) ?? pick(set.agentBubbleColor),
	};
}

/** Unset colours use the scheme's n8n defaults; text follows a custom background if unset. */
export function palette(look: ChatAppearance, scheme: Scheme, mode: string): Palette {
	const base = { ...N8N[scheme], ...(mode === 'fullscreen' ? HOSTED[scheme] : {}) };
	const set = chosen(look, scheme);
	const background = set.backgroundColor ?? base.background;
	const customBackground = !!set.backgroundColor;
	const text = set.textColor ?? (customBackground ? onColor(background) : base.text);
	const customText = !!set.textColor || customBackground;
	return {
		primary: set.primaryColor ?? base.primary,
		background,
		text,
		textLight: customText ? `color-mix(in srgb, ${text} 65%, transparent)` : base.textLight,
		surface:
			set.agentBubbleColor ??
			(customBackground ? `color-mix(in srgb, ${background} 90%, ${text})` : base.surface),
		border: customBackground ? `color-mix(in srgb, ${background} 82%, ${text})` : base.border,
	};
}

function variables(colors: Palette, look: ChatAppearance, scheme: Scheme) {
	const radius = Number.isInteger(look.radius)
		? Math.min(24, Math.max(0, look.radius!))
		: undefined;
	return [
		// Tells the browser (and forced dark modes) which scheme the colours are for.
		`color-scheme:${scheme}`,
		`--agent-chat--color-primary:${colors.primary}`,
		`--agent-chat--color-on-primary:${HEX.test(colors.primary) ? onColor(colors.primary) : '#ffffff'}`,
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
 * `force` (theme editor preview) shows one scheme whatever the setting is.
 */
export function themeCss(look: ChatAppearance, mode: string, force?: Scheme) {
	const css = (scheme: Scheme) => `:host{${variables(palette(look, scheme, mode), look, scheme)}}`;
	const scheme = force ?? look.colorScheme ?? 'light';
	if (scheme === 'auto')
		return `${css('light')}@media (prefers-color-scheme: dark){${css('dark')}}`;
	return css(scheme);
}

/** True while the look is n8n's own (no logo, no primary colour chosen): show the n8n mark. */
export function isN8nBranded(look: ChatAppearance) {
	return (
		!look.logoUrl && !look.primaryColor && !look.light?.primaryColor && !look.dark?.primaryColor
	);
}
