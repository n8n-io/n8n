import { hexToRgb, oklchMixer, oklchToRgb, rgbToHex, rgbToOklch } from './oklch';

describe('oklch', () => {
	test.each(['#FF0000', '#2563EB', '#00C0CC', '#FFFFFF', '#000000', '#808080'])(
		'round-trips %s through oklch',
		(hex) => {
			expect(rgbToHex(oklchToRgb(rgbToOklch(hexToRgb(hex))))).toBe(hex);
		},
	);

	it('matches the CSS oklch value of red', () => {
		const [lightness, chroma, hue] = rgbToOklch(hexToRgb('#FF0000'));

		expect(lightness).toBeCloseTo(0.628, 3);
		expect(chroma).toBeCloseTo(0.2577, 3);
		expect(hue).toBeCloseTo(29.23, 1);
	});

	it('clips colours outside the sRGB gamut', () => {
		expect(oklchToRgb([0.9, 0.4, 145]).every((channel) => channel >= 0 && channel <= 255)).toBe(
			true,
		);
	});

	describe('oklchMixer', () => {
		it('returns the end colours at 0 and 1', () => {
			const mix = oklchMixer('#FF8000', '#0080FF');

			expect(rgbToHex(mix(0))).toBe('#FF8000');
			expect(rgbToHex(mix(1))).toBe('#0080FF');
		});

		it('keeps complementary colours saturated in the middle', () => {
			// Mixed in sRGB, orange and azure meet at a flat grey.
			const middle = oklchMixer('#FF8000', '#0080FF')(0.5);

			expect(Math.max(...middle) - Math.min(...middle)).toBeGreaterThan(100);
		});

		it('takes the hue of the other colour when one end is grey', () => {
			const [, , hue] = rgbToOklch(oklchMixer('#808080', '#2563EB')(0.5));

			expect(hue).toBeCloseTo(rgbToOklch(hexToRgb('#2563EB'))[2], 0);
		});
	});
});
