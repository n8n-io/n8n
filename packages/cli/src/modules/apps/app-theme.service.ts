import type { Workspace } from '@n8n/agents';
import type { AppTheme, AppThemeSettings } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AppDraftService, type DraftWriteResult } from './app-draft.service';

const OVERRIDES_FILE = 'src/theme-overrides.css';
const MODE_FILE = 'src/theme-mode.ts';

export type ThemeSaveResult = DraftWriteResult;

/** Matches the template's own `:root` defaults in style.css. */
const DEFAULT_RADIUS_PX = 4;
const SPACE_UNIT_BY_DENSITY: Record<NonNullable<AppThemeSettings['density']>, string> = {
	compact: '0.2rem',
	comfortable: '0.25rem',
	spacious: '0.3rem',
};

/**
 * Every variable `deriveAppTheme` may write. A derived save drops these from
 * the existing overrides before merging, so switching tone back to neutral
 * really removes the tinted surfaces instead of leaving them behind.
 */
const DERIVED_KEYS = new Set([
	'--primary',
	'--primary-foreground',
	'--ring',
	'--radius',
	'--font-sans',
	'--space-unit',
	'--background',
	'--card',
	'--popover',
	'--secondary',
	'--muted',
	'--accent',
	'--border',
	'--input',
]);

type Oklch = { l: number; c: number; h: number };

/** sRGB hex to OKLCH (Björn Ottosson's reference matrices). Hue in degrees. */
function hexToOklch(hex: string): Oklch {
	const [r = 0, g = 0, b = 0] = (hex.match(/[0-9a-f]{2}/gi) ?? []).map((channel) => {
		const srgb = Number.parseInt(channel, 16) / 255;
		return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	});
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const c = Math.hypot(a, bb);
	const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
	return { l: lightness, c, h };
}

const oklch = (l: number, c: number, h: number) =>
	`oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)})`;

/** WCAG relative luminance: readable text over whatever primary the user chose. */
function contrastForeground(hex: string): string {
	const [r = 0, g = 0, b = 0] = (hex.match(/[0-9a-f]{2}/gi) ?? []).map((channel) => {
		const srgb = Number.parseInt(channel, 16) / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0a0a0a' : '#fafafa';
}

/**
 * Surfaces carrying a little of the primary's hue, light and dark. A near-gray
 * primary yields near-gray surfaces: the chroma scales with the primary's own.
 */
function tintedSurfaces(primary: Oklch): Pick<AppTheme, 'vars' | 'darkVars'> {
	const strength = Math.min(1, primary.c / 0.1);
	const tint = (l: number, c: number) => oklch(l, c * strength, primary.h);
	return {
		vars: {
			'--background': tint(0.982, 0.008),
			'--card': tint(0.996, 0.004),
			'--popover': tint(0.996, 0.004),
			'--secondary': tint(0.955, 0.016),
			'--muted': tint(0.955, 0.016),
			'--accent': tint(0.955, 0.016),
			'--border': tint(0.905, 0.02),
			'--input': tint(0.905, 0.02),
		},
		darkVars: {
			'--background': tint(0.22, 0.018),
			'--card': tint(0.25, 0.02),
			'--popover': tint(0.25, 0.02),
			'--secondary': tint(0.31, 0.024),
			'--muted': tint(0.31, 0.024),
			'--accent': tint(0.31, 0.024),
		},
	};
}

/** The CSS variables behind a set of theme choices; the only place this maths lives. */
export function deriveAppTheme(settings: AppThemeSettings): AppTheme {
	const surfaces =
		settings.tone === 'tinted' ? tintedSurfaces(hexToOklch(settings.primary)) : { vars: {} };
	return {
		mode: settings.mode,
		settings,
		vars: {
			'--primary': settings.primary,
			'--primary-foreground': contrastForeground(settings.primary),
			'--ring': settings.primary,
			'--radius': `${settings.radius ?? DEFAULT_RADIUS_PX}px`,
			'--space-unit': SPACE_UNIT_BY_DENSITY[settings.density ?? 'comfortable'],
			...(settings.font ? { '--font-sans': settings.font } : {}),
			...surfaces.vars,
		},
		...(surfaces.darkVars ? { darkVars: surfaces.darkVars } : {}),
	};
}

function cssBlock(selector: string, vars: Record<string, string>): string {
	const entries = Object.entries(vars);
	if (entries.length === 0) return '';
	const declarations = entries.map(([key, value]) => `\t${key}: ${value};`).join('\n');
	return `${selector} {\n${declarations}\n}\n`;
}

function themeOverridesCss(vars: Record<string, string>, darkVars: Record<string, string>): string {
	return cssBlock(':root', vars) + cssBlock('.dark', darkVars);
}

/**
 * Reads back whatever CSS custom properties are already in theme-overrides.css —
 * Instance AI can edit that file directly with its own variables, and a Theme-tab
 * save must not erase them. Simple regex, not a CSS parser: this file is only ever
 * hand-edited (by the agent) or written by `themeOverridesCss` above, both of which
 * stick to `:root` / `.dark` blocks of flat `--name: value;` declarations.
 */
function parseThemeOverridesCss(content: string): {
	vars: Record<string, string>;
	darkVars: Record<string, string>;
} {
	const vars: Record<string, string> = {};
	const darkVars: Record<string, string> = {};
	for (const block of content.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)) {
		const target = block[1] === '.dark' ? darkVars : vars;
		for (const match of block[2].matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
			target[match[1]] = match[2].trim();
		}
	}
	return { vars, darkVars };
}

function themeModeTs(theme: AppTheme): string {
	return `export const THEME_MODE: 'light' | 'dark' | 'system' = '${theme.mode}';\n`;
}

const withoutDerivedKeys = (vars: Record<string, string>) =>
	Object.fromEntries(Object.entries(vars).filter(([key]) => !DERIVED_KEYS.has(key)));

const themeFiles = (existingOverrides: string, theme: AppTheme) => {
	const existing = parseThemeOverridesCss(existingOverrides);
	// A derived theme owns its keys; a hand-written one only adds to what is there.
	const base = theme.settings
		? { vars: withoutDerivedKeys(existing.vars), darkVars: withoutDerivedKeys(existing.darkVars) }
		: existing;
	return {
		[OVERRIDES_FILE]: themeOverridesCss(
			{ ...base.vars, ...theme.vars },
			{ ...base.darkVars, ...theme.darkVars },
		),
		[MODE_FILE]: themeModeTs(theme),
	};
};

/** Version label of a Theme-tab save; assistant turns get a generated one instead. */
const THEME_EDIT_LABEL = 'Theme edit';

/**
 * Writes a saved theme into the app's draft source (see `AppDraftService`):
 * nothing is built or published, the user publishes explicitly afterwards.
 */
@Service()
export class AppThemeService {
	constructor(private readonly draftService: AppDraftService) {}

	async applyTheme(
		appId: string,
		theme: AppTheme,
		user: User,
		options: { draft?: Workspace } = {},
	): Promise<ThemeSaveResult> {
		return await this.draftService.write(
			appId,
			user,
			async (read) => themeFiles((await read(OVERRIDES_FILE)) ?? '', theme),
			options.draft,
			THEME_EDIT_LABEL,
		);
	}
}
