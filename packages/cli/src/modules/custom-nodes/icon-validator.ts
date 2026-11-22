import { UserError } from '@n8n/errors';

/** The largest icon the service stores, in bytes after base64 decoding. */
export const MAX_ICON_BYTES = 256 * 1024;

const DATA_URI_PATTERN = /^data:(image\/png|image\/svg\+xml);base64,([A-Za-z0-9+/]*={0,2})$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Static drawing elements. Every other element is rejected. */
const ALLOWED_ELEMENTS = new Set([
	'svg',
	'g',
	'defs',
	'path',
	'rect',
	'circle',
	'ellipse',
	'line',
	'polyline',
	'polygon',
	'linearGradient',
	'radialGradient',
	'stop',
	'clipPath',
	'mask',
	'title',
	'desc',
	'use',
]);

/** Geometry and presentation attributes of the allowed elements. Every other attribute is rejected. */
const ALLOWED_ATTRIBUTES = new Set([
	'd',
	'x',
	'y',
	'x1',
	'y1',
	'x2',
	'y2',
	'cx',
	'cy',
	'r',
	'rx',
	'ry',
	'fx',
	'fy',
	'width',
	'height',
	'points',
	'viewBox',
	'transform',
	'fill',
	'fill-rule',
	'fill-opacity',
	'clip-rule',
	'clip-path',
	'clipPathUnits',
	'mask',
	'maskUnits',
	'stroke',
	'stroke-width',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-opacity',
	'opacity',
	'offset',
	'stop-color',
	'stop-opacity',
	'gradientUnits',
	'gradientTransform',
	'spreadMethod',
	'id',
	'class',
	'xmlns',
	'xmlns:xlink',
	'version',
	'preserveAspectRatio',
	'href',
	'xlink:href',
]);

const LINK_ATTRIBUTES = new Set(['href', 'xlink:href']);
const FRAGMENT_PATTERN = /^#[A-Za-z_][\w.:-]*$/;
const LOCAL_URL_PATTERN = /url\(#[A-Za-z_][\w.:-]*\)/g;

export type IconMimeType = 'image/png' | 'image/svg+xml';

function isIconMimeType(value: string): value is IconMimeType {
	return value === 'image/png' || value === 'image/svg+xml';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function checkAttribute(element: string, name: string, value: unknown): void {
	if (!ALLOWED_ATTRIBUTES.has(name)) {
		throw new UserError(
			`The SVG icon has the attribute "${name}" on <${element}>, which is not allowed.`,
		);
	}
	const text = typeof value === 'string' ? value : '';
	// Presentation attributes are parsed as CSS, where a backslash starts an escape.
	if (text.includes('\\')) {
		throw new UserError(`The attribute "${name}" on <${element}> must not contain a backslash.`);
	}
	if (LINK_ATTRIBUTES.has(name) && !FRAGMENT_PATTERN.test(text.trim())) {
		throw new UserError(
			`The attribute "${name}" on <${element}> must link to an id in the same file, for example "#shape".`,
		);
	}
	if (/url\s*\(/i.test(text.replace(LOCAL_URL_PATTERN, ''))) {
		throw new UserError(
			`The attribute "${name}" on <${element}> may use url() only as url(#id) in the same file.`,
		);
	}
}

/** Walks the parsed tree. Each node has `#name`, optional attributes `$` and optional children `$$`. */
function checkTree(root: unknown): void {
	const stack: unknown[] = [root];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!isRecord(node)) continue;
		const name = typeof node['#name'] === 'string' ? node['#name'] : '';
		if (!ALLOWED_ELEMENTS.has(name)) {
			throw new UserError(`The SVG icon has the element <${name}>, which is not allowed.`);
		}
		const attributes = node.$;
		if (isRecord(attributes)) {
			for (const [attribute, value] of Object.entries(attributes)) {
				checkAttribute(name, attribute, value);
			}
		}
		const children = node.$$;
		if (Array.isArray(children)) stack.push(...children);
	}
}

/**
 * Accepts an SVG only when every element and attribute is on the allow lists above.
 * The check rejects and never cleans, so the stored bytes are the bytes the admin sent.
 * The route that serves the icon must also send the sandbox Content-Security-Policy and
 * `X-Content-Type-Options: nosniff`.
 */
async function checkSvg(data: Buffer): Promise<void> {
	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(data);
	} catch {
		throw new UserError('The SVG icon is not UTF-8 text.');
	}

	if (/<!DOCTYPE/i.test(text)) {
		throw new UserError('The SVG icon must not have a document type declaration.');
	}
	if (/<!ENTITY/i.test(text)) {
		throw new UserError('The SVG icon must not declare entities.');
	}
	// Only the XML declaration may appear, and only at the start.
	const withoutDeclaration = text.replace(/^﻿?\s*<\?xml\s[^?]*\?>/, '');
	if (withoutDeclaration.includes('<?')) {
		throw new UserError('The SVG icon must not contain processing instructions.');
	}

	const { Parser } = await import('xml2js');
	const parser = new Parser({
		strict: true,
		explicitRoot: true,
		explicitChildren: true,
		preserveChildrenOrder: true,
		attrkey: '$',
		childkey: '$$',
	});
	let parsed: unknown;
	try {
		parsed = await parser.parseStringPromise(text);
	} catch {
		throw new UserError('The SVG icon is not well-formed XML.');
	}

	if (!isRecord(parsed) || !isRecord(parsed.svg) || Object.keys(parsed).length !== 1) {
		throw new UserError('The root element of the SVG icon must be <svg>.');
	}
	checkTree(parsed.svg);
}

/** Decodes and checks an icon data URI. Accepts only base64 PNG and base64 SVG. */
export async function validateIcon(
	iconDataUri: string,
): Promise<{ mimeType: IconMimeType; data: Buffer }> {
	const match = DATA_URI_PATTERN.exec(iconDataUri);
	if (!match || !isIconMimeType(match[1])) {
		throw new UserError('The icon must be a base64 data URI of a PNG or SVG image.');
	}
	const mimeType = match[1];
	const base64 = match[2];
	if (base64.length % 4 !== 0) {
		throw new UserError('The icon data is not valid base64.');
	}
	// Check the encoded length first, so that a very large value is not decoded.
	if ((base64.length / 4) * 3 > MAX_ICON_BYTES + 2) {
		throw new UserError('The icon is larger than 256 KiB.');
	}
	const data = Buffer.from(base64, 'base64');
	if (data.length === 0) throw new UserError('The icon is empty.');
	if (data.length > MAX_ICON_BYTES) throw new UserError('The icon is larger than 256 KiB.');

	if (mimeType === 'image/png') {
		if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
			throw new UserError('The icon is not a PNG image.');
		}
	} else {
		await checkSvg(data);
	}
	return { mimeType, data };
}
