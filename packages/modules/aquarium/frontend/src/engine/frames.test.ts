import { FRAME_THICKNESS, frameColorAt, frameStyleFor, type FrameStyle } from './frames';

const spec = (style: FrameStyle) => ({ style, width: 80, height: 45, seed: 'tank-1' });

describe('frameStyleFor', () => {
	it('is stable for a tank id', () => {
		expect(frameStyleFor('abc')).toBe(frameStyleFor('abc'));
	});

	it('gives a mix of styles over many tanks', () => {
		const styles = new Set(Array.from({ length: 200 }, (_, i) => frameStyleFor(`p${i}`)));

		expect(styles.size).toBeGreaterThanOrEqual(5);
		expect(styles.has('none')).toBe(false);
	});
});

describe('frameColorAt', () => {
	it.each<FrameStyle>(['wood', 'steel', 'stone', 'brass', 'glass'])(
		'%s paints the band around the tank and leaves the tank clear',
		(style) => {
			const t = FRAME_THICKNESS[style];
			const s = spec(style);

			for (let i = 0; i < t; i++) {
				expect(frameColorAt(s, i, 20)).toMatch(/^#[0-9a-f]{6}$/);
				expect(frameColorAt(s, 30, i)).toMatch(/^#[0-9a-f]{6}$/);
				expect(frameColorAt(s, t + s.width + i, 20)).toMatch(/^#[0-9a-f]{6}$/);
			}
			expect(frameColorAt(s, t, t)).toBeUndefined();
			expect(frameColorAt(s, t + 40, t + 20)).toBeUndefined();
		},
	);

	it('covers the corners of the porthole window and leaves its middle clear', () => {
		const s = spec('porthole');
		const t = FRAME_THICKNESS.porthole;

		expect(frameColorAt(s, t, t)).toBeDefined();
		expect(frameColorAt(s, t + s.width - 1, t + s.height - 1)).toBeDefined();
		expect(frameColorAt(s, t + 40, t + 22)).toBeUndefined();
		expect(frameColorAt(s, 0, 0)).toBeDefined();
	});

	it('is the same for the same seed, and can differ for another seed', () => {
		const a = Array.from({ length: 80 }, (_, x) => frameColorAt(spec('steel'), x, 1));
		const b = Array.from({ length: 80 }, (_, x) => frameColorAt(spec('steel'), x, 1));
		const other = Array.from({ length: 80 }, (_, x) =>
			frameColorAt({ ...spec('steel'), seed: 'tank-2' }, x, 1),
		);

		expect(a).toEqual(b);
		expect(other).not.toEqual(a);
	});

	it('paints nothing for the single tank', () => {
		expect(frameColorAt(spec('none'), 0, 0)).toBeUndefined();
	});

	it('keeps the corner plate of a big porthole small', () => {
		const big = { style: 'porthole' as const, width: 400, height: 220, seed: 'big' };
		const t = FRAME_THICKNESS.porthole;

		// 20 pixels in from the corner, the window is already clear.
		expect(frameColorAt(big, t + 20, t + 20)).toBeUndefined();
	});
});
