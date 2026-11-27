import { iconSetAlpine, themeQuartz } from 'ag-grid-community';

export const n8nTheme = themeQuartz.withPart(iconSetAlpine).withParams({
	// AG Grid defaults this to "light", which sets `color-scheme: light` on `.ag-root-wrapper`
	// and overrides the app theme, breaking `light-dark()` consumers inside the grid.
	// "inherit" keeps the grid on the app's resolved color-scheme.
	browserColorScheme: 'inherit',
	columnBorder: true,
	rowBorder: true,
	rowVerticalPaddingScale: 0.8,
	sidePanelBorder: true,
	wrapperBorder: true,
	headerColumnBorder: { color: 'var(--color--foreground)' },
	headerColumnBorderHeight: '100%',
	// Match the divider so the resize handle on top of it does not show a second shade
	headerColumnResizeHandleColor: 'var(--color--foreground)',
	checkboxBorderRadius: 'var(--radius--3xs)',
	checkboxUncheckedBackgroundColor: 'var(--color--background--light-1)',
	checkboxCheckedBackgroundColor: 'var(--color--primary)',
});
