const STORAGE_KEY = 'sb-addon-themes-3';

function storedThemeIsDark(value: unknown): boolean {
	if (typeof value !== 'object' || value === null || !('current' in value)) {
		return false;
	}

	return value.current === 'dark';
}

export function isDarkModeStored(): boolean {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return false;
		}

		return storedThemeIsDark(JSON.parse(raw));
	} catch {
		return document.documentElement.classList.contains('dark');
	}
}

function resolveIsDark(isDark: unknown): boolean {
	if (typeof isDark === 'boolean') {
		return isDark;
	}

	if (isDark === 'dark') {
		return true;
	}

	if (typeof isDark === 'object' && isDark !== null && 'current' in isDark) {
		return storedThemeIsDark(isDark);
	}

	return isDarkModeStored();
}

/** n8n tokens follow `data-theme` on html/body; the dark-mode addon only toggles classes. */
export function applyN8nTheme(isDark: unknown): void {
	const theme = resolveIsDark(isDark) ? 'dark' : 'light';

	for (const el of [document.documentElement, document.body]) {
		if (!el) {
			continue;
		}

		el.dataset.theme = theme;
		el.style.colorScheme = theme;
		el.classList.remove('light', 'dark');
		el.classList.add(theme);
	}
}
