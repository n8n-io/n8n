import { LOCAL_STORAGE_THEME } from '@/app/constants';
import type { AppliedThemeOption, ThemeOption, ThemePreset } from '@/Interface';

type PinnedThemeOption = Exclude<ThemeOption, 'system'>;

// A preset is a palette on top of a base mode. The base mode keeps `data-theme` and `appliedTheme`.
const THEME_PRESET_MODES: Record<ThemePreset, AppliedThemeOption> = {
	'catppuccin-latte': 'light',
	dracula: 'dark',
};

export function isThemePreset(theme: string): theme is ThemePreset {
	return Object.hasOwn(THEME_PRESET_MODES, theme);
}

export function getThemeMode(theme: PinnedThemeOption): AppliedThemeOption {
	return isThemePreset(theme) ? THEME_PRESET_MODES[theme] : theme;
}

/** The body attributes of a theme. `null` means that the attribute is absent. */
function getThemeAttributes(theme: ThemeOption) {
	return {
		'data-theme': theme === 'system' ? null : getThemeMode(theme),
		'data-palette': isThemePreset(theme) ? theme : null,
	};
}

function isThemeApplied(theme: ThemeOption, body: HTMLElement) {
	return Object.entries(getThemeAttributes(theme)).every(
		([name, value]) => body.getAttribute?.(name) === value,
	);
}

export function applyThemeToBody(theme: ThemeOption, window_?: Window) {
	const body = (window_ ?? window).document.body;

	// One synchronous block changes both attributes, so no frame paints half of a switch.
	// A preset always keeps `data-palette`, so a switch between two presets has no palette-less state.
	for (const [name, value] of Object.entries(getThemeAttributes(theme))) {
		// A write of the same value still invalidates styles and wakes the observers.
		if (body.getAttribute?.(name) === value) continue;
		if (value === null) {
			body.removeAttribute?.(name);
		} else {
			body.setAttribute?.(name, value); // setAttribute can be missing in jsdom environment
		}
	}
}

// The theme of the newest transition that did not change the body yet.
let pendingTheme: ThemeOption | null = null;
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
export function applyThemeWithTransition(theme: ThemeOption) {
	// A pending transition changes the body one task later, so compare with its theme.
	if (pendingTheme === null ? isThemeApplied(theme, document.body) : pendingTheme === theme) return;

	const request = ++latestRequest;
	if (!canUseViewTransition()) {
		pendingTheme = null;
		applyThemeToBody(theme);
		return;
	}

	pendingTheme = theme;
	const transition = document.startViewTransition(() => {
		if (request !== latestRequest) return;
		pendingTheme = null;
		applyThemeToBody(theme);
	});
	// A skipped transition rejects its promises. Nothing waits for them.
	void Promise.allSettled([transition.ready, transition.finished]);
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
