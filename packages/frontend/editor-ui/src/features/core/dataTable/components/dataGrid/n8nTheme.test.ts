import { _asThemeImpl } from 'ag-grid-community';

import { n8nTheme } from './n8nTheme';

describe('n8nTheme', () => {
	// AG Grid defaults `.ag-root-wrapper` to `color-scheme: light`, which overrides the app
	// theme and makes `light-dark()` consumers (e.g. the InlineTextEdit backdrop) render light.
	it('inherits the app color-scheme instead of forcing light on the grid wrapper', () => {
		const params = _asThemeImpl(n8nTheme)._getModeParams();

		expect(params.$default?.browserColorScheme).toBe('inherit');
	});

	it('keeps the grid surface params it configures', () => {
		const params = _asThemeImpl(n8nTheme)._getModeParams().$default;

		expect(params).toMatchObject({
			columnBorder: true,
			rowBorder: true,
			headerColumnResizeHandleColor: 'var(--color--foreground)',
			checkboxCheckedBackgroundColor: 'var(--color--primary)',
		});
	});
});
