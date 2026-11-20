import { iconSetAlpine, themeQuartz } from 'ag-grid-community';

export const n8nTheme = themeQuartz.withPart(iconSetAlpine).withParams({
	columnBorder: true,
	rowBorder: true,
	rowVerticalPaddingScale: 0.8,
	sidePanelBorder: true,
	wrapperBorder: true,
	headerColumnBorder: { color: 'var(--color--foreground)' },
	headerColumnBorderHeight: '100%',
	// Match the divider so the resize handle on top of it does not show a second shade
	headerColumnResizeHandleColor: 'var(--color--foreground)',
	checkboxUncheckedBackgroundColor: 'var(--color--background--light-1)',
	checkboxCheckedBackgroundColor: 'var(--color--primary)',
});
