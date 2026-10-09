import { converter, parse, type Rgb } from 'culori';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const toRgb = converter('rgb');
const paintProperties = new Set(['fill', 'stroke', 'stop-color']);
const opacityForPaint: Record<string, string> = {
	fill: 'fill-opacity',
	stroke: 'stroke-opacity',
	'stop-color': 'stop-opacity',
};
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
	const gradients = new Map<string, Rgb[]>();
	const references = new Set<string>();
	let hasFill = false;
	let hasUnresolvedPaint = false;
	let hasImage = false;

	const addPaint = (
		property: string,
		value: string,
		opacity: number,
		gradientId: string | null,
	) => {
		if (!paintProperties.has(property)) return;
		if (property === 'fill') hasFill = true;
		if (/url\(/i.test(value)) {
			const reference = /^url\(\s*(['"]?)#([^'"\s)]+)\1\s*\)$/i.exec(value.trim());
			if (reference?.[2]) references.add(reference[2]);
			else hasUnresolvedPaint = true;
			return;
		}
		const color = parseIconColor(value);
		if (!color) return;
		const paint = { ...color, alpha: (color.alpha ?? 1) * opacity };
		if (property === 'stop-color' && gradientId !== null) {
			gradients.get(gradientId)?.push(paint);
		} else {
			colors.push(paint);
		}
	};

	const parseDeclarations = (style: string) => {
		const declarations = new Map<string, string>();
		for (const match of style.matchAll(
			/(?:^|;)\s*(fill|stroke|stop-color|fill-opacity|stroke-opacity|stop-opacity)\s*:\s*([^;]+)/gi,
		)) {
			if (match[1] && match[2]) declarations.set(match[1].toLowerCase(), match[2].trim());
		}
		return declarations;
	};

	const parseOpacity = (value: string | undefined) => {
		if (value === undefined) return undefined;
		const parsed = Number.parseFloat(value);
		if (!Number.isFinite(parsed)) return undefined;
		return Math.max(0, Math.min(1, value.trim().endsWith('%') ? parsed / 100 : parsed));
	};

	const addDeclarations = (
		declarations: Map<string, string>,
		inherited: Record<string, number>,
		gradientId: string | null,
	) => {
		const opacity = { ...inherited };
		for (const property of Object.values(opacityForPaint)) {
			opacity[property] = parseOpacity(declarations.get(property)) ?? opacity[property] ?? 1;
		}
		for (const [property, paint] of declarations) {
			if (paintProperties.has(property)) {
				addPaint(property, paint, opacity[opacityForPaint[property] ?? ''] ?? 1, gradientId);
			}
		}
		return opacity;
	};

	const addStyle = (style: string) => {
		const blocks = [...style.matchAll(/\{([^{}]*)\}/g)];
		if (!blocks.length) addDeclarations(parseDeclarations(style), {}, null);
		for (const block of blocks) {
			if (block[1]) addDeclarations(parseDeclarations(block[1]), {}, null);
		}
	};

	const visit = (
		value: unknown,
		inherited: Record<string, number> = {},
		gradientId: string | null = null,
		inStyle = false,
	) => {
		if (!Array.isArray(value)) return;
		for (const element of value) {
			if (typeof element !== 'object' || element === null) continue;
			const entries = Object.entries(element);
			const [key, child] = entries.find(([entry]) => entry !== ':@') ?? [];
			if (key === '#text') {
				if (inStyle && typeof child === 'string') addStyle(child);
				continue;
			}
			if (key === '#cdata') {
				visit(child, inherited, gradientId, inStyle);
				continue;
			}
			if (!key) continue;

			const attributes = entries.find(([key]) => key === ':@')?.[1];
			const declarations = new Map<string, string>();
			let id: string | undefined;
			if (typeof attributes === 'object' && attributes !== null) {
				for (const [attribute, attributeValue] of Object.entries(attributes)) {
					if (typeof attributeValue !== 'string') continue;
					const name = attribute.replace(/^@_/, '').toLowerCase();
					if (name === 'id') id = attributeValue;
					else if (name === 'style') continue;
					else declarations.set(name, attributeValue);
				}
				const style = Object.entries(attributes).find(([key]) => key === '@_style')?.[1];
				if (typeof style === 'string') {
					for (const [property, paint] of parseDeclarations(style))
						declarations.set(property, paint);
				}
			}

			const tag = key.split(':').pop()?.toLowerCase();
			if (tag === 'image') hasImage = true;
			const currentGradient =
				tag === 'lineargradient' || tag === 'radialgradient' ? id : gradientId;
			if ((tag === 'lineargradient' || tag === 'radialgradient') && id) {
				gradients.set(id, []);
			}
			const opacity = addDeclarations(declarations, inherited, currentGradient ?? null);
			visit(child, opacity, currentGradient ?? null, inStyle || tag === 'style');
		}
	};

	const document: unknown = new XMLParser({
		preserveOrder: true,
		ignoreAttributes: false,
		trimValues: false,
		cdataPropName: '#cdata',
	}).parse(svg);
	visit(document);

	if (hasImage || hasUnresolvedPaint) return null;
	for (const reference of references) {
		const stops = gradients.get(reference);
		if (!stops?.length) return null;
		colors.push(...stops);
	}
	if (!hasFill) colors.push(black);
	return colors.length ? colors : null;
}
