import { converter, parse, type Rgb } from 'culori';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const toRgb = converter('rgb');
const paintProperties = new Set(['fill', 'stroke', 'stop-color']);
const black: Rgb = { mode: 'rgb', r: 0, g: 0, b: 0 };

export function parseIconColor(value: string): Rgb | undefined {
	const paint = value.trim();
	if (paint.toLowerCase() === 'currentcolor') return black;

	if (paint.toLowerCase().startsWith('var(')) {
		const variable = /^var\(\s*--[^,()]+(?:,\s*(.+))?\)$/is.exec(paint);
		return variable ? parseIconColor(variable[1] ?? '#000') : undefined;
	}

	return toRgb(parse(paint));
}

function luminance(color: Rgb): number {
	const linear = (channel: number) => {
		const value = Math.max(0, Math.min(1, channel));
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrastRatio(paint: Rgb, background: Rgb): number {
	const alpha = Math.max(0, Math.min(1, paint.alpha ?? 1));
	const displayed: Rgb = {
		mode: 'rgb',
		r: paint.r * alpha + background.r * (1 - alpha),
		g: paint.g * alpha + background.g * (1 - alpha),
		b: paint.b * alpha + background.b * (1 - alpha),
	};
	const a = luminance(displayed);
	const b = luminance(background);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function getSvgPaintColors(svg: string): Rgb[] | null {
	if (XMLValidator.validate(svg) !== true) return null;

	const colors: Rgb[] = [];
	let hasFill = false;
	let hasUrlPaint = false;
	let hasStops = false;
	let hasImage = false;

	const addPaint = (property: string, value: string) => {
		if (!paintProperties.has(property.toLowerCase())) return;
		if (property.toLowerCase() === 'fill') hasFill = true;
		if (/url\(/i.test(value)) hasUrlPaint = true;
		const color = parseIconColor(value);
		if (color) colors.push(color);
	};

	const addStyle = (style: string) => {
		for (const match of style.matchAll(/(?:^|[;{])\s*(fill|stroke|stop-color)\s*:\s*([^;}]+)/gi)) {
			if (match[1] && match[2]) addPaint(match[1], match[2].trim());
		}
	};

	const visit = (value: unknown, inStyle = false) => {
		if (Array.isArray(value)) {
			for (const item of value) visit(item, inStyle);
			return;
		}
		if (typeof value !== 'object' || value === null) return;

		for (const [key, child] of Object.entries(value)) {
			if (key === ':@' && typeof child === 'object' && child !== null) {
				for (const [attribute, attributeValue] of Object.entries(child)) {
					if (typeof attributeValue !== 'string') continue;
					const name = attribute.replace(/^@_/, '').toLowerCase();
					if (name === 'style') addStyle(attributeValue);
					else addPaint(name, attributeValue);
				}
			} else if (key === '#text' && inStyle && typeof child === 'string') {
				addStyle(child);
			} else {
				const tag = key.split(':').pop()?.toLowerCase();
				if (tag === 'image') hasImage = true;
				if (tag === 'stop') hasStops = true;
				visit(child, inStyle || tag === 'style');
			}
		}
	};

	const document: unknown = new XMLParser({
		preserveOrder: true,
		ignoreAttributes: false,
		trimValues: false,
		cdataPropName: '#cdata',
	}).parse(svg);
	visit(document);

	if (hasImage || (hasUrlPaint && !hasStops)) return null;
	if (!hasFill) colors.push(black);
	return colors.length ? colors : null;
}
