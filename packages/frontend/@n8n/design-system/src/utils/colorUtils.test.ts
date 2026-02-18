import { describe, it, expect } from 'vitest';

import {
	isValidHexColor,
	adjustColorLightness,
	hexToHsl,
	hslToHex,
	getRelativeLuminance,
	getContrastTextColor,
	normalizeCustomColorForTheme,
} from './colorUtils';

describe('colorUtils.isValidHexColor', () => {
	it.each([
		// Valid hex colors
		['#000000', true],
		['#FFFFFF', true],
		['#123456', true],
		['#abcdef', true],
		['#ABCDEF', true],
		['#FF5733', true],
		['#fF5733', true],

		// Invalid hex colors
		['', false],
		['#', false],
		['#FFF', false], // Too short
		['#FFFFFFF', false], // Too long
		['#GGGGGG', false], // Invalid characters
		['#12345Z', false], // Invalid character
		['FFFFFF', false], // Missing #
		['#12 45 67', false], // Contains spaces
		['#xyz123', false], // Invalid characters
		['rgb(255, 255, 255)', false], // Wrong format
		['red', false], // Named color
		[null, false], // Null
		[undefined, false], // Undefined
	])('validates "%s" as %s', (input, expected) => {
		expect(isValidHexColor(input as string)).toBe(expected);
	});
});

describe('colorUtils.adjustColorLightness', () => {
	describe('positive percentage adjustments (lighter)', () => {
		it('makes a color 50% lighter', () => {
			// Mid-gray #808080 (128, 128, 128) + 50% = (192, 192, 192) = #C0C0C0
			expect(adjustColorLightness('#808080', 50)).toBe('#C0C0C0');
		});

		it('makes a color 80% lighter', () => {
			// Dark gray #333333 (51, 51, 51) + 80% = (92, 92, 92) = #5C5C5C
			expect(adjustColorLightness('#333333', 80)).toBe('#5C5C5C');
		});

		it('makes a red color lighter', () => {
			// Red #FF0000 (255, 0, 0) + 50% = (255, 0, 0) = #FF0000 (already max)
			expect(adjustColorLightness('#FF0000', 50)).toBe('#FF0000');
		});
	});

	describe('negative percentage adjustments (darker)', () => {
		it('makes a color 20% darker', () => {
			// Mid-gray #808080 (128, 128, 128) - 20% = (102, 102, 102) = #666666
			expect(adjustColorLightness('#808080', -20)).toBe('#666666');
		});

		it('makes a color 50% darker', () => {
			// Light gray #CCCCCC (204, 204, 204) - 50% = (102, 102, 102) = #666666
			expect(adjustColorLightness('#CCCCCC', -50)).toBe('#666666');
		});
	});

	describe('boundary values', () => {
		it('handles pure black (#000000) with positive adjustment', () => {
			// Black stays black (0, 0, 0) + any% = (0, 0, 0)
			expect(adjustColorLightness('#000000', 50)).toBe('#000000');
			expect(adjustColorLightness('#000000', 100)).toBe('#000000');
		});

		it('handles pure white (#FFFFFF) with negative adjustment', () => {
			// White #FFFFFF (255, 255, 255) - 20% = (204, 204, 204) = #CCCCCC
			expect(adjustColorLightness('#FFFFFF', -20)).toBe('#CCCCCC');
		});

		it('handles pure white (#FFFFFF) with positive adjustment', () => {
			// White stays white (already maxed out)
			expect(adjustColorLightness('#FFFFFF', 50)).toBe('#FFFFFF');
		});

		it('clamps values at 255 maximum', () => {
			// Very light gray #F0F0F0 (240, 240, 240) + 50% = (360, 360, 360) → clamped to (255, 255, 255)
			expect(adjustColorLightness('#F0F0F0', 50)).toBe('#FFFFFF');
		});

		it('clamps values at 0 minimum', () => {
			// Very dark gray #101010 (16, 16, 16) - 80% = (3, 3, 3) = #030303
			expect(adjustColorLightness('#101010', -80)).toBe('#030303');
		});
	});

	describe('edge cases', () => {
		it('returns same color with 0% adjustment', () => {
			expect(adjustColorLightness('#FF5733', 0)).toBe('#FF5733');
			expect(adjustColorLightness('#808080', 0)).toBe('#808080');
		});

		it('handles extreme positive percentage approaching white', () => {
			// #808080 (128, 128, 128) + 100% = (256, 256, 256) → clamped to #FFFFFF
			expect(adjustColorLightness('#808080', 100)).toBe('#FFFFFF');
		});

		it('handles extreme negative percentage approaching black', () => {
			// #808080 (128, 128, 128) - 100% = (0, 0, 0) = #000000
			expect(adjustColorLightness('#808080', -100)).toBe('#000000');
		});
	});

	describe('invalid inputs', () => {
		it('returns original value for invalid hex colors', () => {
			expect(adjustColorLightness('invalid', 50)).toBe('invalid');
			expect(adjustColorLightness('#FFF', 50)).toBe('#FFF');
			expect(adjustColorLightness('', 50)).toBe('');
			expect(adjustColorLightness('#GGGGGG', 50)).toBe('#GGGGGG');
		});
	});

	describe('case handling', () => {
		it('returns uppercase hex color', () => {
			expect(adjustColorLightness('#ff5733', 0)).toBe('#FF5733');
			expect(adjustColorLightness('#AbCdEf', 10)).toMatch(/^#[0-9A-F]{6}$/);
		});
	});
});

describe('colorUtils.hexToHsl', () => {
	it('converts pure red', () => {
		expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 100, l: 50 });
	});

	it('converts pure green', () => {
		expect(hexToHsl('#00FF00')).toEqual({ h: 120, s: 100, l: 50 });
	});

	it('converts pure blue', () => {
		expect(hexToHsl('#0000FF')).toEqual({ h: 240, s: 100, l: 50 });
	});

	it('converts white', () => {
		expect(hexToHsl('#FFFFFF')).toEqual({ h: 0, s: 0, l: 100 });
	});

	it('converts black', () => {
		expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 });
	});

	it('converts mid-gray', () => {
		expect(hexToHsl('#808080')).toEqual({ h: 0, s: 0, l: 50 });
	});

	it('converts a typical color', () => {
		// #FF5733 → approx h:11, s:100, l:60
		const result = hexToHsl('#FF5733');
		expect(result.h).toBeGreaterThanOrEqual(10);
		expect(result.h).toBeLessThanOrEqual(12);
		expect(result.s).toBe(100);
		expect(result.l).toBe(60);
	});
});

describe('colorUtils.hslToHex', () => {
	it('converts pure red', () => {
		expect(hslToHex(0, 100, 50)).toBe('#FF0000');
	});

	it('converts pure green', () => {
		expect(hslToHex(120, 100, 50)).toBe('#00FF00');
	});

	it('converts pure blue', () => {
		expect(hslToHex(240, 100, 50)).toBe('#0000FF');
	});

	it('converts white', () => {
		expect(hslToHex(0, 0, 100)).toBe('#FFFFFF');
	});

	it('converts black', () => {
		expect(hslToHex(0, 0, 0)).toBe('#000000');
	});

	it('roundtrips through hexToHsl for primary colors', () => {
		const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
		for (const color of colors) {
			const { h, s, l } = hexToHsl(color);
			expect(hslToHex(h, s, l)).toBe(color);
		}
	});

	it('preserves hue and saturation through roundtrip', () => {
		const original = '#3366CC';
		const { h, s } = hexToHsl(original);
		// Set a different lightness and convert back
		const result = hslToHex(h, s, 90);
		const resultHsl = hexToHsl(result);
		// Allow ±1 rounding tolerance from integer HSL conversion
		expect(Math.abs(resultHsl.h - h)).toBeLessThanOrEqual(1);
		expect(resultHsl.s).toBeCloseTo(s, -1);
		expect(resultHsl.l).toBe(90);
	});
});

describe('colorUtils.getRelativeLuminance', () => {
	it('returns 1 for white', () => {
		expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 2);
	});

	it('returns 0 for black', () => {
		expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 2);
	});

	it('returns ~0.2126 for pure red', () => {
		expect(getRelativeLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
	});

	it('returns ~0.7152 for pure green', () => {
		expect(getRelativeLuminance('#00FF00')).toBeCloseTo(0.7152, 3);
	});

	it('returns ~0.0722 for pure blue', () => {
		expect(getRelativeLuminance('#0000FF')).toBeCloseTo(0.0722, 3);
	});
});

describe('colorUtils.getContrastTextColor', () => {
	it('returns dark text for white background', () => {
		expect(getContrastTextColor('#FFFFFF')).toBe('#2B2B2B');
	});

	it('returns light text for black background', () => {
		expect(getContrastTextColor('#000000')).toBe('#F5F5F5');
	});

	it('returns dark text for light yellow background', () => {
		expect(getContrastTextColor('#FFFFCC')).toBe('#2B2B2B');
	});

	it('returns light text for dark blue background', () => {
		expect(getContrastTextColor('#000066')).toBe('#F5F5F5');
	});
});

describe('colorUtils.normalizeCustomColorForTheme', () => {
	it('normalizes a red hex for light mode', () => {
		const result = normalizeCustomColorForTheme('#FF0000', false);
		const bgHsl = hexToHsl(result.background);
		expect(bgHsl.l).toBe(90);
		expect(bgHsl.h).toBe(0); // red hue preserved
		expect(result.text).toBe('#2B2B2B'); // light bg → dark text
	});

	it('normalizes a red hex for dark mode', () => {
		const result = normalizeCustomColorForTheme('#FF0000', true);
		const bgHsl = hexToHsl(result.background);
		expect(bgHsl.l).toBe(15);
		expect(bgHsl.h).toBe(0);
		expect(result.text).toBe('#F5F5F5'); // dark bg → light text
	});

	it('normalizes a blue hex for light mode', () => {
		const result = normalizeCustomColorForTheme('#3366CC', false);
		const bgHsl = hexToHsl(result.background);
		const borderHsl = hexToHsl(result.border);
		expect(bgHsl.l).toBe(90);
		expect(borderHsl.l).toBe(75);
	});

	it('normalizes a blue hex for dark mode', () => {
		const result = normalizeCustomColorForTheme('#3366CC', true);
		const bgHsl = hexToHsl(result.background);
		const borderHsl = hexToHsl(result.border);
		expect(bgHsl.l).toBe(15);
		expect(borderHsl.l).toBe(25);
	});

	it('preserves hue and saturation from input', () => {
		const input = '#FF5733';
		const inputHsl = hexToHsl(input);
		const lightResult = normalizeCustomColorForTheme(input, false);
		const darkResult = normalizeCustomColorForTheme(input, true);

		// Hue should match in both modes
		expect(hexToHsl(lightResult.background).h).toBe(inputHsl.h);
		expect(hexToHsl(darkResult.background).h).toBe(inputHsl.h);
	});

	it('produces different backgrounds for light vs dark mode', () => {
		const result = {
			light: normalizeCustomColorForTheme('#3366CC', false),
			dark: normalizeCustomColorForTheme('#3366CC', true),
		};
		expect(result.light.background).not.toBe(result.dark.background);
		expect(result.light.border).not.toBe(result.dark.border);
	});

	it('returns valid hex colors', () => {
		const result = normalizeCustomColorForTheme('#ABCDEF', false);
		expect(result.background).toMatch(/^#[0-9A-F]{6}$/);
		expect(result.border).toMatch(/^#[0-9A-F]{6}$/);
		expect(result.text).toMatch(/^#[0-9A-F]{6}$/);
	});
});
