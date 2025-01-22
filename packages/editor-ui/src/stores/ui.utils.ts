import type { AppliedThemeOption, ThemeOption } from '@/Interface';
import { useStorage } from '@/composables/useStorage';
import { LOCAL_STORAGE_THEME } from '@/constants';

const themeRef = useStorage(LOCAL_STORAGE_THEME);

export function addThemeToBody(theme: AppliedThemeOption) {
	window.document.body.setAttribute('data-theme', theme);
}

export function isValidTheme(theme: string | null): theme is AppliedThemeOption {
	return !!theme && ['light', 'dark'].includes(theme);
}

// query param allows overriding theme for demo view in preview iframe without flickering
export function getThemeOverride() {
	return getQueryParam('theme') || themeRef.value;
}

function getQueryParam(paramName: string): string | null {
	return new URLSearchParams(window.location.search).get(paramName);
}

export function updateTheme(theme: ThemeOption) {
	if (theme === 'system') {
		window.document.body.removeAttribute('data-theme');
		themeRef.value = null;
	} else {
		addThemeToBody(theme);
		themeRef.value = theme;
	}
}

export function getPreferredTheme(): { theme: AppliedThemeOption; mediaQuery: MediaQueryList } {
	const isDarkModeQuery = !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

	return {
		theme: isDarkModeQuery?.matches ? 'dark' : 'light',
		mediaQuery: isDarkModeQuery,
	};
}
