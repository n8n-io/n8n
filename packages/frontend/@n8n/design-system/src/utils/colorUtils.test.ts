import { describe, it, expect } from 'vitest';

import { isValidHexColor, adjustColorLightness } from './colorUtils';

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
