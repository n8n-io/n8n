import xss, { friendlyAttrValue } from 'xss';
import { Primitives, Optional, N8nJsonSchema } from "@/Interface";

export const omit = (keyToOmit: string, { [keyToOmit]: _, ...remainder }) => remainder;

export function isObjectLiteral(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null && !Array.isArray(maybeObject);
}

export function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[otherKeys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;

	return Object.keys(item).includes('json');
}

export function sanitizeHtml(dirtyHtml: string) {
	const allowedAttributes = ['href','name', 'target', 'title', 'class', 'id'];
	const allowedTags = ['p', 'strong', 'b', 'code', 'a', 'br', 'i', 'em', 'small' ];

	const sanitizedHtml = xss(dirtyHtml, {
		onTagAttr: (tag, name, value) => {
			if (tag === 'img' && name === 'src') {
				// Only allow http requests to supported image files from the `static` directory
				const isImageFile = value.split('#')[0].match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
				const isStaticImageFile = isImageFile && value.startsWith('/static/');
				if (!value.startsWith('https://') && !isStaticImageFile) {
					return '';
				}
			}

			// Allow `allowedAttributes` and all `data-*` attributes
			if(allowedAttributes.includes(name) || name.startsWith('data-')) return `${name}="${friendlyAttrValue(value)}"`;

			return;
			// Return nothing, means keep the default handling measure
		},
		onTag: (tag) => {
			if(!allowedTags.includes(tag)) return '';
			return;
		},
	});

	return sanitizedHtml;
}

export const isEmpty = (value?: unknown): boolean => {
	if (!value && value !== 0) return true;
	if(Array.isArray(value)){
		if(!value.length) return true;
		return value.every(isEmpty);
	}
	if (typeof value === 'object') {
		return Object.values(value).every(isEmpty);
	}
	return false;
};

export const intersection = <T>(...arrays: T[][]): T[] => {
	const [a, b, ...rest] = arrays;
	const ab = a.filter(v => b.includes(v));
	return [...new Set(rest.length ? intersection(ab, ...rest) : ab)];
};

export const isObj = (obj: unknown): obj is object => !!obj && Object.getPrototypeOf(obj) === Object.prototype;

export const mapObjectToSchema = (obj: object): N8nJsonSchema[] => Object.entries(obj).map(([k, v]) => ({ key: k, ...getJsonSchema(v, k)}));

export const getJsonSchema = (input: Optional<Primitives | object>, key?: string, path?: string): N8nJsonSchema => {
	let schema:N8nJsonSchema = { type: 'undefined', value: 'undefined' };
	switch (typeof input) {
		case 'object':
			if (input === null) {
				schema = { type: 'string', value: '[null]' };
			}
			if (input instanceof Date) {
				schema = { type: 'date', value: input.toISOString() };
			}
			if (Array.isArray(input)) {
				const firstItem = input[0];
				schema = { type: 'list', value: isObj(firstItem) ? mapObjectToSchema(firstItem) : typeof firstItem };
			}
			if (isObj(input)) {
				schema ={ type: 'object', value: mapObjectToSchema(input) };
			}
			break;
		case 'string':
			schema = { type: 'string', value: `"${input}"` };
			break;
		case 'function':
			schema =  { type: 'function', value: `` };
			break;
		default:
			schema =  { type: typeof input, value: String(input) };
	}

	if (key && !['object', 'list'].includes(schema.type)) {
		schema.value = schema.type;
	}

	return schema;
};
