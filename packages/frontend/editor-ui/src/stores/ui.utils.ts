import type { AppliedThemeOption, ThemeOption } from '@/Interface';
import { useStorage } from '@/composables/useStorage';
import { LOCAL_STORAGE_THEME } from '@/constants';
import { useMediaQuery } from '@vueuse/core';
import { computed, type ComputedRef } from 'vue';

const themeRef = useStorage(LOCAL_STORAGE_THEME);

export function addThemeToBody(theme: AppliedThemeOption, window_?: Window) {
	(window_ ?? window).document.body.setAttribute?.('data-theme', theme); // setAttribute can be missing in jsdom environment
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

export function useAppliedTheme(): ComputedRef<AppliedThemeOption> {
	const isDarkThemePreferred = useMediaQuery('(prefers-color-scheme: dark)');

	return computed(() => {
		if (isValidTheme(themeRef.value)) {
			return themeRef.value;
		}

		return isDarkThemePreferred.value ? 'dark' : 'light';
	});
}
