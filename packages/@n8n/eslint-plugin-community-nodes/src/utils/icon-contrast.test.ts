import { describe, expect, it } from 'vitest';

import {
	contrastRatio,
	getSvgContrastRatio,
	parseColor,
	THEME_BACKGROUNDS,
} from './icon-contrast.js';

describe('parseColor', () => {
	it.each([
		['#000', [0, 0, 0]],
		['#FFF', [255, 255, 255]],
		['#ff0000', [255, 0, 0]],
		['#ff0000ff', [255, 0, 0]],
		['rgb(255, 0, 0)', [255, 0, 0]],
		['rgb(100%, 0%, 0%)', [255, 0, 0]],
		['rgba(0 0 0 / 0.5)', [0, 0, 0]],
		['black', [0, 0, 0]],
		['White', [255, 255, 255]],
	])('parses %s', (value, expected) => {
		expect(parseColor(value)).toEqual(expected);
	});

	it.each(['#00000000', '#0001', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 5%)'])(
		'treats invisible color %s as absent',
		(value) => {
			expect(parseColor(value)).toBeNull();
		},
	);

	it.each([
		'none',
		'currentColor',
		'url(#gradient)',
		'var(--color)',
		'hsl(0, 0%, 0%)',
		'rebeccapurple',
	])('does not parse %s', (value) => {
		expect(parseColor(value)).toBeNull();
	});
});

describe('contrastRatio', () => {
	it('is 21 for black on white', () => {
		expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
	});

	it('is 1 for identical colors', () => {
		expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBe(1);
	});

	it('is symmetric', () => {
		expect(contrastRatio([30, 60, 90], [200, 200, 200])).toBe(
			contrastRatio([200, 200, 200], [30, 60, 90]),
		);
	});
});

describe('getSvgContrastRatio', () => {
	const { light, dark } = THEME_BACKGROUNDS;

	it('assumes black when the SVG declares no paint', () => {
		const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeCloseTo(21, 1);
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(2);
	});

	it('reads fill and stroke attributes', () => {
		const svg = '<svg><rect fill="none" stroke="#ffffff"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBe(1);
		expect(getSvgContrastRatio(svg, dark)).toBeGreaterThan(10);
	});

	it('reads paint from style attributes and style blocks', () => {
		const inline = '<svg><path style="fill:#fff;stroke:none"/></svg>';
		const block = '<svg><style>.a { fill: #fff; }</style><path class="a"/></svg>';
		expect(getSvgContrastRatio(inline, dark)).toBeGreaterThan(10);
		expect(getSvgContrastRatio(block, dark)).toBeGreaterThan(10);
	});

	it('uses the best contrast across all painted colors', () => {
		const svg = '<svg><rect fill="#1a73e8"/><path fill="#ffffff"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeGreaterThan(3);
		expect(getSvgContrastRatio(svg, dark)).toBeGreaterThan(10);
	});

	it('reads gradient stop colors', () => {
		const svg =
			'<svg><defs><linearGradient id="g"><stop stop-color="#000"/><stop stop-color="#222"/></linearGradient></defs><rect fill="url(#g)"/></svg>';
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(2);
	});

	it('returns null when the icon uses currentColor', () => {
		const svg = '<svg fill="currentColor"><path d="M0 0h24v24H0z"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeNull();
	});

	it('returns null when no paint value can be parsed', () => {
		const svg = '<svg><path fill="var(--brand)"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeNull();
	});

	it('ignores invisible paint', () => {
		const svg = '<svg><rect fill="#ffffff00"/><path fill="#000"/></svg>';
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(2);
	});
});
