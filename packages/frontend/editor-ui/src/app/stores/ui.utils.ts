import {
	LOCAL_STORAGE_THEME,
	LOCAL_STORAGE_THEME_DARK_FAMILY,
	LOCAL_STORAGE_THEME_FAMILY,
	LOCAL_STORAGE_THEME_LIGHT_FAMILY,
	LOCAL_STORAGE_THEME_MODE,
} from '@/app/constants';
import type {
	AppliedThemeOption,
	ThemeFamily,
	ThemeMode,
	ThemePalette,
	ThemePreferences,
	ThemeSelection,
} from '@/Interface';
import { customTheme } from '@/app/utils/customTheme';

export const DEFAULT_THEME_SELECTION: ThemeSelection = { mode: 'system', family: 'default' };
export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
	mode: 'system',
	light: 'default',
	dark: 'default',
};

// The palette of each family for each resolved mode. `null` means no palette: n8n's own light or dark.
// A missing mode means that the family has no variant. It falls back to the default theme.
// To add a variant, add one line here and one `body[data-palette]` block in `_palettes.scss`.
export const THEME_FAMILIES: Record<
	ThemeFamily,
	Partial<Record<AppliedThemeOption, ThemePalette | null>>
> = {
	default: { light: null, dark: null },
	catppuccin: { dark: 'catppuccin-mocha' },
	dracula: { dark: 'dracula' },
	// The dark variant is the GitHub Dark High Contrast palette.
	'high-contrast': { light: 'high-contrast-light', dark: 'github-dark-high-contrast' },
	gruvbox: { light: 'gruvbox-light-hard', dark: 'gruvbox-dark-hard' },
	oxocarbon: { dark: 'oxocarbon' },
	cyberdream: { dark: 'cyberdream' },
	moonfly: { dark: 'moonfly' },
	nightfly: { dark: 'nightfly' },
	solarized: { light: 'solarized-light', dark: 'solarized-dark' },
	github: { light: 'github-light', dark: 'github-dark' },
	// Dawn is the light variant. Moon is the dark variant.
	'rose-pine': { light: 'rose-pine-dawn', dark: 'rose-pine-moon' },
	// The user's own theme has only the variant of its mode. Its CSS is generated at runtime.
	custom: {
		get light() {
			return customTheme.value?.mode === 'light' ? 'custom' : undefined;
		},
		get dark() {
			return customTheme.value?.mode === 'dark' ? 'custom' : undefined;
		},
	},
};

// The values of the old `N8N_THEME` key. They map to a mode and a family.
const LEGACY_THEMES: Record<string, ThemeSelection> = {
	system: { mode: 'system', family: 'default' },
	light: { mode: 'light', family: 'default' },
	dark: { mode: 'dark', family: 'default' },
	// Catppuccin has no light variant any more. Keep the light mode.
	'catppuccin-latte': { mode: 'light', family: 'default' },
	dracula: { mode: 'dark', family: 'dracula' },
	'high-contrast-light': { mode: 'light', family: 'high-contrast' },
	'high-contrast-dark': { mode: 'dark', family: 'high-contrast' },
};

export function isThemeMode(value: unknown): value is ThemeMode {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function isThemeFamily(value: unknown): value is ThemeFamily {
	return typeof value === 'string' && Object.hasOwn(THEME_FAMILIES, value);
}

/** Whether the family has its own palette for the mode. The default family always has one. */
export function hasThemeVariant(family: ThemeFamily, mode: AppliedThemeOption) {
	return THEME_FAMILIES[family][mode] !== undefined;
}

function getPrefersDark(window_?: Window) {
	return !!(window_ ?? window).matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Resolves the mode (the OS preference for `system`) and the palette of the family for that mode. */
export function resolveTheme(
	{ mode, family }: ThemeSelection,
	prefersDark: boolean = getPrefersDark(),
): { mode: AppliedThemeOption; palette: ThemePalette | null } {
	const resolvedMode: AppliedThemeOption =
		mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

	return { mode: resolvedMode, palette: THEME_FAMILIES[family][resolvedMode] ?? null };
}

export function resolveThemeMode(
	mode: ThemeMode,
	prefersDark: boolean = getPrefersDark(),
): AppliedThemeOption {
	return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}

/** The family for one resolved mode. A family with no variant for the mode falls back to the default. */
export function familyForMode(family: unknown, mode: AppliedThemeOption): ThemeFamily {
	return isThemeFamily(family) && hasThemeVariant(family, mode) ? family : 'default';
}

/** The selection to apply: the saved mode, and the family of the slot for the resolved mode. */
export function toThemeSelection(
	preferences: ThemePreferences,
	prefersDark: boolean = getPrefersDark(),
): ThemeSelection {
	return {
		mode: preferences.mode,
		family: preferences[resolveThemeMode(preferences.mode, prefersDark)],
	};
}

/** The body attributes of a theme. `null` means that the attribute is absent. */
function getThemeAttributes(selection: ThemeSelection, window_?: Window) {
	const { mode, palette } = resolveTheme(selection, getPrefersDark(window_));
	// With system mode and the default family, the CSS media queries follow the OS. No JS is needed.
	const followsSystem = selection.mode === 'system' && selection.family === 'default';

	return {
		'data-theme': followsSystem ? null : mode,
		'data-palette': palette,
	};
}

function getThemeKey(selection: ThemeSelection) {
	return Object.values(getThemeAttributes(selection)).join('|');
}

function isThemeApplied(selection: ThemeSelection, body: HTMLElement) {
	return Object.entries(getThemeAttributes(selection)).every(
		([name, value]) => body.getAttribute?.(name) === value,
	);
}

export function applyThemeToBody(selection: ThemeSelection, window_?: Window) {
	const body = (window_ ?? window).document.body;

	// One synchronous block changes both attributes, so no frame paints half of a switch.
	for (const [name, value] of Object.entries(getThemeAttributes(selection, window_))) {
		// A write of the same value still invalidates styles and wakes the observers.
		if (body.getAttribute?.(name) === value) continue;
		if (value === null) {
			body.removeAttribute?.(name);
		} else {
			body.setAttribute?.(name, value); // setAttribute can be missing in jsdom environment
		}
	}
}

// The key of the newest transition that did not change the body yet.
let pendingThemeKey: string | null = null;
// A skipped transition still calls its update callback. This counter lets the callback do nothing.
let latestRequest = 0;

function canUseViewTransition() {
	return (
		typeof document.startViewTransition === 'function' &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/**
 * Applies a theme that the user picked, with a cross-fade (see `_theme-transition.scss`).
 * Do not use it at boot. Without the View Transitions API, or with reduced motion, it applies at once.
 * A new call skips the running transition. Calls never queue.
 */
export function applyThemeWithTransition(selection: ThemeSelection) {
	// A pending transition changes the body one task later, so compare with its key.
	const key = getThemeKey(selection);
	const isUpToDate =
		pendingThemeKey === null ? isThemeApplied(selection, document.body) : pendingThemeKey === key;
	if (isUpToDate) return;

	const request = ++latestRequest;
	if (!canUseViewTransition()) {
		pendingThemeKey = null;
		applyThemeToBody(selection);
		return;
	}

	pendingThemeKey = key;
	const transition = document.startViewTransition(() => {
		if (request !== latestRequest) return;
		pendingThemeKey = null;
		applyThemeToBody(selection);
	});
	// A skipped transition rejects its promises. Nothing waits for them.
	void Promise.allSettled([transition.ready, transition.finished]);
}

/**
 * Applies a theme preview at once, without a cross-fade.
 * A running view transition sends pointer events to the root, so a click on an open menu would miss.
 */
export function applyThemeInstantly(selection: ThemeSelection) {
	++latestRequest;
	pendingThemeKey = null;
	applyThemeToBody(selection);
}

/**
 * Reads the saved mode and family. If the new keys are missing, it maps the old `N8N_THEME` value once
 * and writes the new keys. The old key stays, so an older version can still read it.
 */
function readStoredSelection(): ThemeSelection {
	const storedMode = localStorage.getItem(LOCAL_STORAGE_THEME_MODE);
	const storedFamily = localStorage.getItem(LOCAL_STORAGE_THEME_FAMILY);
	if (storedMode === null && storedFamily === null) {
		const legacy = localStorage.getItem(LOCAL_STORAGE_THEME);
		if (legacy !== null && Object.hasOwn(LEGACY_THEMES, legacy)) {
			const migrated = LEGACY_THEMES[legacy];
			localStorage.setItem(LOCAL_STORAGE_THEME_MODE, migrated.mode);
			return migrated;
		}
	}

	return {
		mode: isThemeMode(storedMode) ? storedMode : DEFAULT_THEME_SELECTION.mode,
		family: isThemeFamily(storedFamily) ? storedFamily : DEFAULT_THEME_SELECTION.family,
	};
}

/**
 * Reads the saved mode and the light and dark families. If the family keys are missing, it puts the
 * old single family into each slot that it has a variant for, once. The other slots get the default.
 */
function readStoredTheme(): ThemePreferences {
	const storedLight = localStorage.getItem(LOCAL_STORAGE_THEME_LIGHT_FAMILY);
	const storedDark = localStorage.getItem(LOCAL_STORAGE_THEME_DARK_FAMILY);
	const { mode, family } = readStoredSelection();

	if (storedLight === null && storedDark === null) {
		const migrated: ThemePreferences = {
			mode,
			light: familyForMode(family, 'light'),
			dark: familyForMode(family, 'dark'),
		};
		localStorage.setItem(LOCAL_STORAGE_THEME_LIGHT_FAMILY, migrated.light);
		localStorage.setItem(LOCAL_STORAGE_THEME_DARK_FAMILY, migrated.dark);
		return migrated;
	}

	return {
		mode,
		light: familyForMode(storedLight, 'light'),
		dark: familyForMode(storedDark, 'dark'),
	};
}

// The query param `theme=light|dark` overrides the mode for the demo view in a preview iframe without flickering.
export function getSavedTheme(): ThemePreferences {
	const stored = readStoredTheme();
	const override = getQueryParam('theme');

	return override === 'light' || override === 'dark' ? { ...stored, mode: override } : stored;
}

function getQueryParam(paramName: string): string | null {
	return new URLSearchParams(window.location.search).get(paramName);
}
