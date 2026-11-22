import { UnexpectedError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

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

/** The part of the `sax` parser inside `xml2js` that the check uses. */
interface SaxParser {
	write(text: string): SaxParser;
	close(): SaxParser;
}

function isSaxParser(value: unknown): value is SaxParser {
	return isRecord(value) && typeof value.write === 'function' && typeof value.close === 'function';
}

/**
 * Every event that the installed `sax` parser can emit (`sax.EVENTS`). `checkSvg` sets a
 * handler for each of them, so no event reaches a handler of xml2js or no handler at all.
 * A test compares this list with the installed parser.
 */
export const SAX_EVENTS = [
	'text',
	'processinginstruction',
	'sgmldeclaration',
	'doctype',
	'comment',
	'opentagstart',
	'attribute',
	'opentag',
	'closetag',
	'opencdata',
	'cdata',
	'closecdata',
	'error',
	'end',
	'ready',
	'script',
	'opennamespace',
	'closenamespace',
] as const;

type SaxEvent = (typeof SAX_EVENTS)[number];

/** Elements whose text content is allowed. Text elsewhere may only be whitespace. */
const TEXT_ELEMENTS = new Set(['title', 'desc']);

const nameOf = (value: unknown) =>
	isRecord(value) && typeof value.name === 'string' ? value.name : '';

const notWellFormed = () => new UserError('The SVG icon is not well-formed XML.');

/**
 * `packages/cli` has no direct `sax` dependency, so the check uses the `sax` parser of an
 * `xml2js` Parser. The xml2js result is not used: it stops at the end of the root element
 * and drops attributes such as `__proto__`. The sax events show every element, every
 * attribute, and everything before and after the root element.
 */
async function createSaxParser(): Promise<SaxParser> {
	const { Parser } = await import('xml2js');
	const saxParser: unknown = Reflect.get(new Parser({ strict: true }), 'saxParser');
	if (!isSaxParser(saxParser)) {
		throw new UnexpectedError('The XML parser does not expose a sax parser');
	}
	return saxParser;
}

/**
 * Accepts an SVG only when the whole text is one well-formed XML document with the root
 * element `svg`, and every element and attribute is on the allow lists above.
 * Outside the root element, only whitespace, plain comments and a leading XML declaration are
 * allowed. Every parser event has a rule. An event without a specific rule rejects the icon.
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

	const sax = await createSaxParser();
	const open: string[] = [];
	let rootClosed = false;
	let sawEvent = false;
	let element = '';

	const reject = (message: string) => () => {
		throw new UserError(message);
	};
	const rejectOutsideRoot = () => {
		throw new UserError(
			rootClosed
				? 'The SVG icon has content after the root element.'
				: 'The SVG icon has content before the root element.',
		);
	};

	const handlers: Record<SaxEvent, (payload: unknown) => void> = {
		ready: () => {},
		end: () => {},
		error: () => {
			throw notWellFormed();
		},
		processinginstruction: (instruction) => {
			// One XML declaration, and only as the first characters of the file.
			if (sawEvent || nameOf(instruction) !== 'xml' || !text.startsWith('<?xml')) {
				throw new UserError('The SVG icon must not contain processing instructions.');
			}
			sawEvent = true;
		},
		sgmldeclaration: () => {
			throw notWellFormed();
		},
		doctype: reject('The SVG icon must not have a document type declaration or entities.'),
		comment: (comment) => {
			sawEvent = true;
			// A plain note is fine. Markup characters in a comment are not needed in an icon.
			if (typeof comment !== 'string' || /[<>]/.test(comment)) {
				throw new UserError('A comment in the SVG icon must not contain "<" or ">".');
			}
		},
		opentagstart: (tag) => {
			sawEvent = true;
			element = nameOf(tag);
			if (rootClosed) rejectOutsideRoot();
			if (open.length === 0 && element !== 'svg') {
				throw new UserError('The root element of the SVG icon must be <svg>.');
			}
			if (!ALLOWED_ELEMENTS.has(element)) {
				throw new UserError(`The SVG icon has the element <${element}>, which is not allowed.`);
			}
		},
		attribute: (attribute) => {
			const value = isRecord(attribute) ? attribute.value : undefined;
			checkAttribute(element, nameOf(attribute), value);
		},
		opentag: (tag) => {
			open.push(nameOf(tag));
		},
		closetag: () => {
			open.pop();
			if (open.length === 0) rootClosed = true;
		},
		text: (chunk) => {
			sawEvent = true;
			if (typeof chunk !== 'string') throw notWellFormed();
			if (chunk.trim() === '') return;
			if (open.length === 0) rejectOutsideRoot();
			const parent = open[open.length - 1];
			if (!TEXT_ELEMENTS.has(parent)) {
				throw new UserError(
					`The SVG icon has text inside <${parent}>. Only <title> and <desc> may have text.`,
				);
			}
		},
		opencdata: reject('The SVG icon must not contain CDATA sections.'),
		cdata: reject('The SVG icon must not contain CDATA sections.'),
		closecdata: reject('The SVG icon must not contain CDATA sections.'),
		script: reject('The SVG icon must not contain scripts.'),
		opennamespace: () => {
			throw notWellFormed();
		},
		closenamespace: () => {
			throw notWellFormed();
		},
	};
	// Replace every handler, including the ones xml2js installed for its own tree.
	for (const event of SAX_EVENTS) {
		Reflect.set(sax, `on${event}`, handlers[event]);
	}

	try {
		sax.write(text).close();
	} catch (error) {
		if (error instanceof UserError) throw error;
		throw notWellFormed();
	}
	if (!rootClosed) throw notWellFormed();
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
