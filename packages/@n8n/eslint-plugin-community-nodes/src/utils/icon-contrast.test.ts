import { formatHex } from 'culori';
import { describe, expect, it } from 'vitest';

import { getSvgContrastRatio, parseColor, THEME_BACKGROUNDS } from './icon-contrast.js';

describe('parseColor', () => {
	it.each([
		['#000', '#000000'],
		['#FFF', '#ffffff'],
		['#ff0000', '#ff0000'],
		['#ff0000ff', '#ff0000'],
		['rgb(255, 0, 0)', '#ff0000'],
		['rgb(100%, 0%, 0%)', '#ff0000'],
		['rgba(0 0 0 / 0.5)', '#000000'],
		['hsl(0, 100%, 50%)', '#ff0000'],
		['black', '#000000'],
		['White', '#ffffff'],
		['red', '#ff0000'],
		['aquamarine', '#7fffd4'],
	])('parses %s', (value, expected) => {
		const color = parseColor(value);
		expect(color).not.toBeNull();
		expect(formatHex(color ?? undefined)).toBe(expected);
	});

	it.each(['#00000000', '#0001', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 5%)', 'transparent'])(
		'treats invisible color %s as absent',
		(value) => {
			expect(parseColor(value)).toBeNull();
		},
	);

	it.each(['none', 'currentColor', 'url(#gradient)', 'var(--color)', 'inherit'])(
		'does not parse %s',
		(value) => {
			expect(parseColor(value)).toBeNull();
		},
	);
});

describe('getSvgContrastRatio', () => {
	const { light, dark } = THEME_BACKGROUNDS;

	it('is 21 for black on white and symmetric', () => {
		const black = '<svg><path fill="#000"/></svg>';
		const white = '<svg><path fill="#fff"/></svg>';
		expect(getSvgContrastRatio(black, '#ffffff')).toBeCloseTo(21, 1);
		expect(getSvgContrastRatio(white, '#000000')).toBeCloseTo(21, 1);
	});

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

	it('reads named colors and hsl()', () => {
		const svg = '<svg><rect fill="white"/><path fill="red"/><path fill="hsl(0 0% 0%)"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeCloseTo(21, 1);
		expect(getSvgContrastRatio(svg, dark)).toBeGreaterThan(10);
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

	it('treats currentColor as black, as an img tag renders it', () => {
		const svg = '<svg fill="currentColor"><path d="M0 0h24v24H0z"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeCloseTo(21, 1);
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(1.5);
	});

	it('treats var() without a fallback as black', () => {
		const svg = '<svg><path fill="var(--brand)"/></svg>';
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(1.5);
	});

	it('uses the fallback of var()', () => {
		const svg = '<svg><path fill="var(--brand, #fff)" stroke="var(--line, var(--x, red))"/></svg>';
		expect(getSvgContrastRatio(svg, dark)).toBeGreaterThan(10);
		expect(getSvgContrastRatio(svg, light)).toBeGreaterThan(3);
	});

	it('returns null when no paint value can be parsed', () => {
		const svg = '<svg><path fill="brandcolor"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeNull();
	});

	it('returns null for url() paint without gradient stops', () => {
		const svg = '<svg><rect fill="white"/><path fill="url(#pattern)"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeNull();
	});

	it('returns null when the SVG embeds an image', () => {
		const svg = '<svg><rect fill="white"/><image href="data:image/png;base64,AAAA"/></svg>';
		expect(getSvgContrastRatio(svg, light)).toBeNull();
	});

	it('ignores invisible paint', () => {
		const svg = '<svg><rect fill="#ffffff00"/><path fill="#000"/></svg>';
		expect(getSvgContrastRatio(svg, dark)).toBeLessThan(2);
	});
});
