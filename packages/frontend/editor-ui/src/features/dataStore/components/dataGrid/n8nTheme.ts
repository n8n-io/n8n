import { iconSetAlpine, themeQuartz } from 'ag-grid-community';

export const n8nTheme = themeQuartz.withPart(iconSetAlpine).withParams({
	columnBorder: true,
	rowBorder: true,
	rowVerticalPaddingScale: 0.8,
	sidePanelBorder: true,
	wrapperBorder: true,
	headerColumnBorder: { color: 'var(--color-foreground-base)' },
	headerColumnBorderHeight: '100%',
	checkboxUncheckedBackgroundColor: 'var(--color-background-light-base)',
	checkboxCheckedBackgroundColor: 'var(--color-primary)',
});
