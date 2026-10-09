import { expect, test } from 'vitest';

import { contrastRatio, getSvgPaintColors, parseIconColor } from './icon-contrast.js';

test.each([
	['rebeccapurple', '#663399'],
	['rgb(255 0 0 / 50%)', '#ff000080'],
	['hsl(120 100% 50%)', '#00ff00'],
	['currentColor', '#000'],
	['var(--icon, #fff)', '#fff'],
	['var(--icon)', '#000'],
	['var(--icon, rgb(255, 255, 255))', '#fff'],
])('parses %s as a CSS color', (input, expected) => {
	const actual = parseIconColor(input);
	const reference = parseIconColor(expected);
	if (!actual || !reference) throw new Error('Expected a parsed color');
	expect(actual.r).toBeCloseTo(reference.r, 2);
	expect(actual.g).toBeCloseTo(reference.g, 2);
	expect(actual.b).toBeCloseTo(reference.b, 2);
	expect(actual.alpha ?? 1).toBeCloseTo(reference.alpha ?? 1, 2);
});

test('parses wide-gamut CSS colors', () => {
	expect(parseIconColor('color(display-p3 1 0 0)')).toBeDefined();
});

test('computes WCAG contrast, including partial transparency', () => {
	const black = parseIconColor('#000');
	const white = parseIconColor('#fff');
	const dark = parseIconColor('#2b2b2b');
	const translucent = parseIconColor('rgb(0 0 0 / 50%)');
	if (!black || !white || !dark || !translucent) throw new Error('Expected parsed colors');
	expect(contrastRatio(black, white)).toBeCloseTo(21);
	expect(contrastRatio(black, dark)).toBeCloseTo(1.48, 2);
	expect(contrastRatio(translucent, white)).toBeCloseTo(3.98, 2);
});

test('collects attributes, inline styles, style blocks, and gradient stops', () => {
	const colors = getSvgPaintColors(`<svg xmlns="http://www.w3.org/2000/svg">
		<style>.shape { fill: hsl(120 100% 50%); stroke: rebeccapurple }</style>
		<defs><linearGradient id="paint"><stop style="stop-color: #fff" /></linearGradient></defs>
		<path fill="url(#paint)" style="stroke: rgb(255 0 0)" d="M0 0" />
	</svg>`);
	expect(colors).toHaveLength(4);
});

test('reads declarations in a CDATA-backed style block', () => {
	const colors = getSvgPaintColors(
		'<svg><style><![CDATA[.shape { fill: #fff }]]></style><path class="shape" /></svg>',
	);
	expect(colors).toEqual([{ ...parseIconColor('#fff'), alpha: 1 }]);
});

test.each([
	['fill', 'fill-opacity', '#000', '50%', 0.5],
	['stroke', 'stroke-opacity', '#0008', '0.5', (8 / 15) * 0.5],
	['stop-color', 'stop-opacity', '#fff', '.25', 0.25],
] as const)('applies %s opacity to the paint alpha', (property, opacity, paint, value, alpha) => {
	const svg = `<svg><path ${property}="${paint}" ${opacity}="${value}" /></svg>`;
	const colors = getSvgPaintColors(svg);
	expect(colors?.[0]?.alpha).toBeCloseTo(alpha);
});

test('applies inline style opacity to the paint alpha', () => {
	const colors = getSvgPaintColors('<svg><path style="fill: #000; fill-opacity: 0.5" /></svg>');
	expect(colors?.[0]?.alpha).toBeCloseTo(0.5);
});

test('inherits paint opacity from an SVG group', () => {
	const colors = getSvgPaintColors('<svg><g fill-opacity="0.25"><path fill="#0008" /></g></svg>');
	expect(colors?.[0]?.alpha).toBeCloseTo((8 / 15) * 0.25);
});

test('uses only the referenced gradient stops', () => {
	const colors = getSvgPaintColors(`<svg>
		<defs>
			<linearGradient id="used"><stop stop-color="#000" stop-opacity="0.5" /></linearGradient>
			<linearGradient id="unused"><stop stop-color="#fff" /></linearGradient>
		</defs>
		<path fill="url(#used)" />
	</svg>`);
	expect(colors).toEqual([{ ...parseIconColor('#000'), alpha: 0.5 }]);
});

test('uses black when the SVG has no fill declaration', () => {
	expect(getSvgPaintColors('<svg><path d="M0 0" /></svg>')).toEqual([parseIconColor('#000')]);
});

test.each([
	'<svg><image href="data:image/png;base64,a" /></svg>',
	'<svg><path fill="url(#unknown)" /></svg>',
	'<svg><defs><linearGradient id="known"><stop stop-color="white" /></linearGradient></defs><path fill="url(#unknown)" /></svg>',
	'<svg><path fill="none" /></svg>',
	'<svg><path></svg>',
])('skips SVG paint that cannot be judged', (svg) => {
	expect(getSvgPaintColors(svg)).toBeNull();
});
