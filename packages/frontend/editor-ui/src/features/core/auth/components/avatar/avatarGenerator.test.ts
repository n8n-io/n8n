import {
	AVATAR_COLOR_PRESETS,
	DEFAULT_GENERATOR_INPUT,
	PALETTE_SIZE,
	generatePalette,
	hslToHex,
	randomSeed,
	swatchFor,
	toneToLightness,
	toneToSaturation,
} from './avatarGenerator';

const HEX = /^#[0-9a-f]{6}$/;

/** Hex → HSL, to read what the generator did. */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h: number;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
	else if (max === g) h = ((b - r) / d + 2) * 60;
	else h = ((r - g) / d + 4) * 60;
	return { h, s: s * 100, l: l * 100 };
}

const hueDistance = (a: number, b: number) => {
	const delta = Math.abs(a - b) % 360;
	return delta > 180 ? 360 - delta : delta;
};

const palette = (overrides: Partial<Parameters<typeof generatePalette>[0]> = {}) =>
	generatePalette({ ...DEFAULT_GENERATOR_INPUT, seed: 'seed', ...overrides });

describe('avatarGenerator', () => {
	describe('hslToHex', () => {
		it('converts the primaries and the extremes', () => {
			expect(hslToHex(0, 100, 50)).toBe('#ff0000');
			expect(hslToHex(120, 100, 50)).toBe('#00ff00');
			expect(hslToHex(240, 100, 50)).toBe('#0000ff');
			expect(hslToHex(0, 0, 100)).toBe('#ffffff');
			expect(hslToHex(0, 0, 0)).toBe('#000000');
		});

		it('wraps hues past the wheel and clamps the rest', () => {
			expect(hslToHex(360, 100, 50)).toBe('#ff0000');
			expect(hslToHex(-120, 100, 50)).toBe('#0000ff');
			expect(hslToHex(0, 150, 120)).toBe('#ffffff');
		});
	});

	describe('generatePalette', () => {
		it('always gives five six-digit hex colors', () => {
			for (const seed of ['a', 'b', 'c', 'xyz', '']) {
				const colors = palette({ seed });
				expect(colors).toHaveLength(PALETTE_SIZE);
				for (const color of colors) expect(color).toMatch(HEX);
			}
		});

		it('is deterministic for the same inputs and differs across seeds', () => {
			expect(palette({ seed: 'one' })).toEqual(palette({ seed: 'one' }));
			expect(palette({ seed: 'one' })).not.toEqual(palette({ seed: 'two' }));
		});

		it('keeps the picked hue in the palette', () => {
			for (const hue of [0, 45, 120, 200, 300]) {
				for (const seed of ['x', 'y', 'z']) {
					const hues = palette({ hue, tone: 50, seed }).map((color) => hexToHsl(color).h);
					expect(hues.some((h) => hueDistance(h, hue) < 2)).toBe(true);
				}
			}
		});

		it('reads as one family: every chromatic color sits within a quarter turn of the picked hue', () => {
			for (const seed of ['p', 'q', 'r', 's']) {
				const chromatic = palette({ hue: 210, tone: 50, seed })
					.map(hexToHsl)
					.filter(({ s }) => s > 20);
				for (const { h } of chromatic) expect(hueDistance(h, 210)).toBeLessThan(95);
			}
		});

		it('includes one near-neutral for restraint and contrast', () => {
			for (const seed of ['m', 'n', 'o']) {
				const neutrals = palette({ seed })
					.map(hexToHsl)
					.filter(({ s }) => s < 20);
				expect(neutrals).toHaveLength(1);
			}
		});

		it('gets lighter as the tone rises, and the neutral flips to keep contrast', () => {
			// The neutral deliberately goes the other way, so judge the chromatic colors.
			const averageChromatic = (colors: string[]) => {
				const chromatic = colors.map(hexToHsl).filter(({ s }) => s > 20);
				return chromatic.reduce((sum, { l }) => sum + l, 0) / chromatic.length;
			};
			const light = palette({ tone: 90 });
			const deep = palette({ tone: 10 });
			expect(averageChromatic(light)).toBeGreaterThan(averageChromatic(deep) + 30);

			const neutralOf = (colors: string[]) => colors.map(hexToHsl).find(({ s }) => s < 20);
			expect(neutralOf(light)?.l).toBeLessThan(40);
			expect(neutralOf(deep)?.l).toBeGreaterThan(80);
		});
	});

	describe('tone mapping', () => {
		it('is lightest at the top, and only mutes towards the deep end', () => {
			expect(toneToLightness(100)).toBeGreaterThan(toneToLightness(0));
			expect(toneToSaturation(100)).toBe(toneToSaturation(50));
			expect(toneToSaturation(50)).toBeGreaterThan(toneToSaturation(0));
		});

		it('opens on the brand pink', () => {
			const [r, g, b] = [1, 3, 5].map((i) =>
				parseInt(
					swatchFor(DEFAULT_GENERATOR_INPUT.hue, DEFAULT_GENERATOR_INPUT.tone).slice(i, i + 2),
					16,
				),
			);
			// #FF91AC, give or take the rounding of the tone curve.
			expect(Math.abs(r - 0xff)).toBeLessThan(16);
			expect(Math.abs(g - 0x91)).toBeLessThan(16);
			expect(Math.abs(b - 0xac)).toBeLessThan(16);
		});

		it('swatches are hex and follow the tone', () => {
			expect(swatchFor(348, 62)).toMatch(HEX);
			expect(hexToHsl(swatchFor(200, 90)).l).toBeGreaterThan(hexToHsl(swatchFor(200, 10)).l);
		});
	});

	describe('presets', () => {
		it('start with the brand pink and all sit inside the field', () => {
			expect(AVATAR_COLOR_PRESETS[0].id).toBe('pink');
			expect(AVATAR_COLOR_PRESETS[0]).toMatchObject(DEFAULT_GENERATOR_INPUT);
			for (const preset of AVATAR_COLOR_PRESETS) {
				expect(preset.hue).toBeGreaterThanOrEqual(0);
				expect(preset.hue).toBeLessThanOrEqual(360);
				expect(preset.tone).toBeGreaterThanOrEqual(0);
				expect(preset.tone).toBeLessThanOrEqual(100);
			}
			expect(new Set(AVATAR_COLOR_PRESETS.map((preset) => preset.id)).size).toBe(
				AVATAR_COLOR_PRESETS.length,
			);
		});

		it('walk the wheel at the brand pink tone and end on a deep ink', () => {
			const ink = AVATAR_COLOR_PRESETS.at(-1);
			const chromatic = AVATAR_COLOR_PRESETS.slice(0, -1);

			expect(ink?.id).toBe('ink');
			expect(ink?.tone).toBeLessThan(25);
			for (const preset of chromatic) expect(preset.tone).toBe(DEFAULT_GENERATOR_INPUT.tone);
			const hues = chromatic.slice(1).map((preset) => preset.hue);
			expect(hues).toEqual([...hues].sort((a, b) => a - b));
		});
	});

	describe('randomSeed', () => {
		it('is short, URL-safe and fresh each time', () => {
			const seed = randomSeed();
			expect(seed).toMatch(/^[a-z0-9]{10}$/);
			expect(randomSeed()).not.toBe(seed);
		});
	});
});
