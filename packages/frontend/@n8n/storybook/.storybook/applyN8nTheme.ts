export type N8nTheme = 'light' | 'dark';

export function resolveN8nTheme(theme: unknown): N8nTheme {
	return theme === 'dark' ? 'dark' : 'light';
}

/** n8n tokens follow `data-theme` on html/body, including `body:not([data-theme])` fallbacks. */
export function applyN8nTheme(theme: unknown): void {
	const resolved = resolveN8nTheme(theme);

	for (const el of [document.documentElement, document.body]) {
		if (!el) {
			continue;
		}

		el.dataset.theme = resolved;
		el.style.colorScheme = resolved;
		el.classList.remove('light', 'dark');
		el.classList.add(resolved);
	}
}
