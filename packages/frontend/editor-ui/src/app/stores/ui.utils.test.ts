import { applyThemeToBody, getThemeMode, isValidTheme } from './ui.utils';

describe('ui.utils', () => {
	afterEach(() => {
		document.body.removeAttribute('data-theme');
		document.body.removeAttribute('data-palette');
	});

	describe('applyThemeToBody', () => {
		it('should set the base mode and the palette for a preset', () => {
			applyThemeToBody('catppuccin-latte');

			expect(document.body.getAttribute('data-theme')).toBe('light');
			expect(document.body.getAttribute('data-palette')).toBe('catppuccin-latte');
		});

		it.each(['light', 'dark', 'system'] as const)('should remove the palette for %s', (theme) => {
			applyThemeToBody('catppuccin-latte');
			applyThemeToBody(theme);

			expect(document.body.hasAttribute('data-palette')).toBe(false);
			expect(document.body.getAttribute('data-theme')).toBe(theme === 'system' ? null : theme);
		});
	});

	describe('getThemeMode', () => {
		it('should map a preset to its base mode', () => {
			expect(getThemeMode('catppuccin-latte')).toBe('light');
			expect(getThemeMode('dark')).toBe('dark');
		});
	});

	describe('isValidTheme', () => {
		it.each(['light', 'dark', 'catppuccin-latte'])('should accept %s', (theme) => {
			expect(isValidTheme(theme)).toBe(true);
		});

		it.each([null, '', 'system', 'toString', 'catppuccin-mocha'])('should reject %s', (theme) => {
			expect(isValidTheme(theme)).toBe(false);
		});
	});
});
