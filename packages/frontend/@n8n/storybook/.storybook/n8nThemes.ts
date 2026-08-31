import { create } from 'storybook/theming';

// Match `--font-family` / `--font-family--monospace` in `_primitives.scss`.
// Emotion cannot resolve CSS variables here — a missing `var()` makes
// `font-family` invalid and the browser falls back to Times.
const n8nFonts = {
	fontBase: 'InterVariable, sans-serif',
	fontCode: 'CommitMono, ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace',
};

export const n8nLightTheme = create({
	base: 'light',
	...n8nFonts,
});

export const n8nDarkTheme = create({
	base: 'dark',
	...n8nFonts,
});
