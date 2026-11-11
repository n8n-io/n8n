import { converter } from 'culori';
import { describe, expect, it } from 'vitest';

import { getBestContrast, getSvgPaintColors, parsePaintColor } from './icon-contrast.js';

const rgb = converter('rgb');

describe('parsePaintColor', () => {
	it.each([
		'white',
		'#fff',
		'#ffffff',
		'rgb(255, 255, 255)',
		'rgb(100% 100% 100%)',
		'hsl(0 0% 100%)',
		'hwb(0 100% 0%)',
		'lab(100% 0 0)',
		'lch(100% 0 0)',
		'oklab(100% 0 0)',
		'oklch(100% 0 0)',
		'color(display-p3 1 1 1)',
	])('parses CSS color %s', (value) => {
		const color = parsePaintColor(value);
		expect(color).toBeDefined();
		const converted = color && rgb(color);
		expect(converted?.r).toBeCloseTo(1, 3);
		expect(converted?.g).toBeCloseTo(1, 3);
		expect(converted?.b).toBeCloseTo(1, 3);
	});

	it.each(['currentColor', 'CURRENTCOLOR', 'var(--paint)', 'var(--paint, currentColor)'])(
		'uses black for %s in an image',
		(value) => expect(parsePaintColor(value)).toEqual(parsePaintColor('black')),
	);

	it.each([
		'var(--paint, #fff)',
		'var(--paint, rgb(255, 255, 255))',
		'var(--paint, var(--fallback, white))',
		'white !important',
	])('uses the fallback or color in %s', (value) => {
		const color = parsePaintColor(value);
		expect(color && rgb(color)).toMatchObject({ r: 1, g: 1, b: 1 });
	});

	it.each(['none', 'invalid', 'url(#gradient)'])('ignores %s', (value) => {
		expect(parsePaintColor(value)).toBeUndefined();
	});
});

describe('getSvgPaintColors', () => {
	it.each([
		'<svg><path fill="white" stroke="white"/></svg>',
		"<svg><path style='fill: white; stroke: rgb(255, 255, 255)'/></svg>",
		'<svg><style>.a { fill: white; stroke: white !important; }</style></svg>',
		'<svg><style><![CDATA[.a { fill: white; stroke: white; }]]></style></svg>',
	])('collects attribute and CSS paint: %s', (svg) => {
		expect(getSvgPaintColors(svg)).toHaveLength(2);
		expect(getBestContrast(getSvgPaintColors(svg) ?? [], '#fff')).toBeCloseTo(1);
	});

	it('uses black when no fill is declared', () => {
		expect(getSvgPaintColors('<svg><path/></svg>')).toEqual([parsePaintColor('black')]);
	});

	it('does not treat comments and custom properties as paint', () => {
		expect(
			getSvgPaintColors(
				'<svg><!-- <image/> --><style>/* fill: white */ :root { --fill: white; }</style><path/></svg>',
			),
		).toEqual([parsePaintColor('black')]);
	});

	it.each([
		'<stop stop-color="white"/>',
		'<stop style="stop-color: white"/>',
		'<style>stop { stop-color: white }</style><stop/>',
	])('collects gradient stops: %s', (stops) => {
		const colors = getSvgPaintColors(
			`<svg><linearGradient id="g">${stops}</linearGradient><path fill="url(#g)"/></svg>`,
		);
		expect(getBestContrast(colors ?? [], '#fff')).toBeCloseTo(1);
	});

	it('uses black for gradient stops without an explicit color', () => {
		expect(
			getSvgPaintColors(
				'<svg><linearGradient id="g"><stop/></linearGradient><path fill="url(#g)"/></svg>',
			),
		).toEqual([parsePaintColor('black')]);
	});

	it.each(['linearGradient', 'radialGradient'])('reads a referenced %s', (gradient) => {
		const colors = getSvgPaintColors(
			`<svg><defs><${gradient} id="g"><stop stop-color="white"/></${gradient}></defs><path fill="url(#g)"/></svg>`,
		);
		expect(colors).toEqual([parsePaintColor('white')]);
	});

	it.each(['url( #g )', 'url("#g")', "url('#g')", 'var(--paint, url(#g))'])(
		'reads the gradient reference in %s',
		(paint) => {
			const colors = getSvgPaintColors(
				`<svg><defs><linearGradient id="g"><stop stop-color="white"/></linearGradient></defs><path style='fill: ${paint.replaceAll("'", '&apos;')}'/></svg>`,
			);
			expect(colors).toEqual([parsePaintColor('white')]);
		},
	);

	it.each(['href', 'xlink:href'])('follows gradient stops through %s', (attribute) => {
		const colors = getSvgPaintColors(
			`<svg><defs><linearGradient id="base"><stop stop-color="white"/></linearGradient><radialGradient id="g" ${attribute}="#base"/></defs><path fill="url(#g)"/></svg>`,
		);
		expect(colors).toEqual([parsePaintColor('white')]);
	});

	it.each([
		'<path fill="url(#pattern)"/>',
		'<path style="stroke: url(#pattern)"/>',
		'<style>path { fill: url(#pattern) }</style>',
		'<linearGradient id="empty"/><path fill="url(#empty)"/>',
		'<path fill="url(#g)" stroke="url(#pattern)"/>',
		'<pattern id="pattern"><stop stop-color="white"/></pattern><path fill="url(#pattern)"/>',
		'<path fill="url(other.svg#g)"/>',
		'<path fill="url("/>',
		'<path fill="url()"/>',
		'<linearGradient><stop stop-color="white"/></linearGradient><path fill="url(#missing)"/>',
		'<linearGradient id="external" href="other.svg#g"/><path fill="url(#external)"/>',
		'<linearGradient id="a" href="#b"/><linearGradient id="b" href="#a"/><path fill="url(#a)"/>',
	])('skips unsupported paint despite unrelated gradient stops: %s', (content) => {
		expect(
			getSvgPaintColors(
				`<svg><defs><linearGradient id="g"><stop stop-color="white"/></linearGradient></defs>${content}</svg>`,
			),
		).toBeNull();
	});

	it.each([
		'<svg><image href="data:image/png;base64,AA=="/></svg>',
		'<svg><image href="other.svg"/></svg>',
		'<svg><path fill="url(#pattern)"/></svg>',
		'<svg><path style="stroke: url(#pattern)"/></svg>',
		'<svg><style>path { fill: url(#pattern) }</style></svg>',
		'<svg',
		'<svg><path></svg>',
		'<svg><style>path { fill: </style></svg>',
	])('skips icons it cannot judge: %s', (svg) => {
		expect(getSvgPaintColors(svg)).toBeNull();
	});
});

describe('getBestContrast', () => {
	it('computes the WCAG black and white contrast', () => {
		expect(getBestContrast(getSvgPaintColors('<svg/>') ?? [], '#fff')).toBeCloseTo(21);
	});

	it('keeps the black-on-dark ratio below the default minimum', () => {
		const ratio = getBestContrast(getSvgPaintColors('<svg/>') ?? [], '#2b2b2b');
		expect(ratio).toBeCloseTo(1.48, 2);
		expect(ratio).toBeLessThan(1.5);
	});

	it('selects the best color regardless of shape size or overlap', () => {
		const colors = getSvgPaintColors('<svg><path fill="black"/><path fill="white"/></svg>') ?? [];
		expect(getBestContrast(colors, '#fff')).toBeCloseTo(21);
		expect(getBestContrast(colors, '#000')).toBeCloseTo(21);
	});

	it('composites alpha before calculating contrast', () => {
		const colors = getSvgPaintColors('<svg fill="rgb(0 0 0 / 50%)"/>') ?? [];
		expect(getBestContrast(colors, '#fff')).toBeCloseTo(3.9767, 4);
	});

	it('returns no result when no visible paint or valid background is available', () => {
		expect(getBestContrast([], '#fff')).toBeNull();
		expect(
			getBestContrast(getSvgPaintColors('<svg fill="transparent"/>') ?? [], '#fff'),
		).toBeNull();
		expect(getBestContrast([], 'invalid')).toBeNull();
	});
});
