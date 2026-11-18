import { LOCAL_STORAGE_THEME } from '@/app/constants';
import type { AppliedThemeOption, ThemeOption, ThemePreset } from '@/Interface';

type PinnedThemeOption = Exclude<ThemeOption, 'system'>;

// A preset is a palette on top of a base mode. The base mode keeps `data-theme` and `appliedTheme`.
const THEME_PRESET_MODES: Record<ThemePreset, AppliedThemeOption> = {
	'catppuccin-latte': 'light',
};

export function isThemePreset(theme: string): theme is ThemePreset {
	return Object.hasOwn(THEME_PRESET_MODES, theme);
}

export function getThemeMode(theme: PinnedThemeOption): AppliedThemeOption {
	return isThemePreset(theme) ? THEME_PRESET_MODES[theme] : theme;
}

export function applyThemeToBody(theme: ThemeOption, window_?: Window) {
	const body = (window_ ?? window).document.body;
	if (theme === 'system') {
		body.removeAttribute('data-theme');
	} else {
		body.setAttribute?.('data-theme', getThemeMode(theme)); // setAttribute can be missing in jsdom environment
	}

	if (isThemePreset(theme)) {
		body.setAttribute?.('data-palette', theme);
	} else {
		body.removeAttribute?.('data-palette');
	}
}

export function isValidTheme(theme: string | null): theme is PinnedThemeOption {
	return !!theme && (['light', 'dark'].includes(theme) || isThemePreset(theme));
}

// query param allows overriding theme for demo view in preview iframe without flickering
export function getThemeOverride(): PinnedThemeOption | null {
	const override = getQueryParam('theme') ?? localStorage.getItem(LOCAL_STORAGE_THEME);

	return isValidTheme(override) ? override : null;
}

function getQueryParam(paramName: string): string | null {
	return new URLSearchParams(window.location.search).get(paramName);
}
