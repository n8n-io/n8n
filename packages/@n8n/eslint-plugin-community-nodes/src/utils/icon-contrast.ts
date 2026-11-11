import { converter, parse, wcagContrast, type Color, type Rgb } from 'culori';
import { parse as parseCss } from 'postcss';
import { SaxesParser } from 'saxes';

const rgb = converter('rgb');

export function parsePaintColor(paint: string): Color | undefined {
	let value = paint
		.trim()
		.replace(/\s*!important\s*$/i, '')
		.trim();
	// An SVG in an <img> cannot read the page's CSS variables or text color.
	while (/^var\(/i.test(value) && value.endsWith(')')) {
		const comma = value.indexOf(',');
		value = comma === -1 ? 'black' : value.slice(comma + 1, -1).trim() || 'black';
	}
	return parse(/^currentcolor$/i.test(value) ? 'black' : value);
}

/** Read declarations only. Shape size, overlap, and the CSS cascade are out of scope. */
export function getSvgPaintColors(svg: string): Color[] | null {
	const paints: string[] = [];
	let hasFill = false;
	let hasStops = false;
	let hasStopColor = false;
	let hasImage = false;
	let inStyle = false;
	let stylesheet = '';
	const collect = (property: string, value: string) => {
		if (property === 'fill') hasFill = true;
		if (property === 'stop-color') hasStopColor = true;
		if (['fill', 'stroke', 'stop-color'].includes(property)) paints.push(value);
	};
	const collectCss = (css: string) => {
		parseCss(css).walkDecls((declaration) => {
			collect(declaration.prop.toLowerCase(), declaration.value);
		});
	};
	const parser = new SaxesParser();
	parser.on('opentag', (tag) => {
		const name = tag.name.split(':').pop();
		if (name === 'image' || name === 'foreignObject') hasImage = true;
		if (name === 'stop') hasStops = true;
		if (name === 'style') inStyle = true;
		for (const [property, value] of Object.entries(tag.attributes)) {
			if (property === 'style') collectCss(`svg { ${value} }`);
			else collect(property, value);
		}
	});
	parser.on('text', (text) => {
		if (inStyle) stylesheet += text;
	});
	parser.on('cdata', (text) => {
		if (inStyle) stylesheet += text;
	});
	parser.on('closetag', (tag) => {
		if (tag.name.split(':').pop() === 'style') {
			collectCss(stylesheet);
			stylesheet = '';
			inStyle = false;
		}
	});
	try {
		parser.write(svg).close();
	} catch {
		// Invalid XML or CSS cannot give a reliable contrast result.
		return null;
	}
	if (hasImage || (!hasStops && paints.some((paint) => /url\s*\(/i.test(paint)))) return null;
	if (!hasFill || (hasStops && !hasStopColor)) paints.push('black');
	return paints.map(parsePaintColor).filter((color) => color !== undefined);
}

export function getBestContrast(colors: Color[], background: string): number | null {
	const backdrop = rgb(background);
	if (!backdrop) return null;
	let best: number | null = null;
	for (const color of colors) {
		const paint = rgb(color);
		const alpha = Math.min(1, Math.max(0, paint.alpha ?? 1));
		if (alpha === 0) continue;
		const composite: Rgb = {
			mode: 'rgb',
			r: Math.min(1, Math.max(0, paint.r)) * alpha + backdrop.r * (1 - alpha),
			g: Math.min(1, Math.max(0, paint.g)) * alpha + backdrop.g * (1 - alpha),
			b: Math.min(1, Math.max(0, paint.b)) * alpha + backdrop.b * (1 - alpha),
		};
		best = Math.max(best ?? 1, wcagContrast(composite, backdrop));
	}
	return best;
}
