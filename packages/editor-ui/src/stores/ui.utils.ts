import type { AppliedThemeOption, ThemeOption } from '@/Interface';
import { useStorage } from '@/composables/useStorage';
import { LOCAL_STORAGE_THEME } from '@/constants';

export function addThemeToBody(theme: AppliedThemeOption) {
	window.document.body.setAttribute('data-theme', theme);
}

export function isValidTheme(theme: string | null): theme is AppliedThemeOption {
	return !!theme && ['light', 'dark'].includes(theme);
}

// query param allows overriding theme for demo view in preview iframe without flickering
export function getThemeOverride() {
	return getQueryParam('theme') || useStorage(LOCAL_STORAGE_THEME).value;
}

function getQueryParam(paramName: string): string | null {
	return new URLSearchParams(window.location.search).get(paramName);
}

export function updateTheme(theme: ThemeOption) {
	if (theme === 'system') {
		window.document.body.removeAttribute('data-theme');
		useStorage(LOCAL_STORAGE_THEME).value = null;
	} else {
		addThemeToBody(theme);
		useStorage(LOCAL_STORAGE_THEME).value = theme;
	}
}

export function getPreferredTheme(): AppliedThemeOption {
	const isDarkMode =
		!!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')?.matches;

	return isDarkMode ? 'dark' : 'light';
}
