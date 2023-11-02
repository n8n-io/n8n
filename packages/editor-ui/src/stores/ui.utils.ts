import type { AppliedThemeOption, ThemeOption } from '@/Interface';
import { LOCAL_STORAGE_THEME } from '@/constants';

export function addThemeToBody(theme: AppliedThemeOption) {
	window.document.body.setAttribute('data-theme', theme);
}

export function isValidTheme(theme: string | null): theme is AppliedThemeOption {
	return !!theme && ['light', 'dark'].includes(theme);
}

// query param allows overriding theme for demo view in preview iframe without flickering
export function getThemeOverride() {
	return getQueryParam('theme') || localStorage.getItem(LOCAL_STORAGE_THEME);
}

function getQueryParam(paramName: string): string | null {
	return new URLSearchParams(window.location.search).get(paramName);
}

export function updateTheme(theme: ThemeOption) {
	if (theme === 'system') {
		window.document.body.removeAttribute('data-theme');
		localStorage.removeItem(LOCAL_STORAGE_THEME);
	} else {
		addThemeToBody(theme);
		localStorage.setItem(LOCAL_STORAGE_THEME, theme);
	}
}

export function getPreferredTheme(): AppliedThemeOption {
	const isDarkMode =
		!!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')?.matches;

	return isDarkMode ? 'dark' : 'light';
}
