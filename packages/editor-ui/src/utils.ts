import xss, { friendlyAttrValue } from 'xss';
import { Primitives, Optional, JsonSchema } from "@/Interface";

// Holds weird date formats that we encounter when working with strings
// Should be extended as new cases are found
const CUSTOM_DATE_FORMATS = [
	/\d{1,2}-\d{1,2}-\d{4}/, // Should handle dash separated dates with year at the end
	/\d{1,2}\.\d{1,2}\.\d{4}/, // Should handle comma separated dates
];

export const isValidDate = (input: string|number|Date): boolean => {
	try {
		// Try to construct date object using input
		const date = new Date(input);
		// This will not fail for wrong dates so have to check like this:
		if (date.toString() !== 'Invalid Date') {
			return true;
		} else if (typeof input === 'string') {
			// Try to cover edge cases with regex
			for (const regex of CUSTOM_DATE_FORMATS) {
				if (input.match(regex)) {
					return true;
				}
			}
			return false;
		}
		return false;
	} catch (e) {
		return false;
	}
};

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

export const checkExhaustive = (value: never): never => {
	throw new Error(`Unhandled value: ${value}`);
};

export const isObj = (obj: unknown): obj is object => !!obj && Object.getPrototypeOf(obj) === Object.prototype;

export const isNorObjectNorArray = (obj: unknown): obj is Primitives => !isObj(obj) && !Array.isArray(obj);

export const getObjectKeys = <T extends object, K extends keyof T>(o: T): K[] => Object.keys(o) as K[];

export const mergeDeep = <T extends object>(...sources: T[]): T => sources.reduce((target, source) => {
	if(Array.isArray(target) && Array.isArray(source)){
		const tLength = target.length;
		const sLength = source.length;

		if(target.every(isNorObjectNorArray) && source.every(isNorObjectNorArray)){
			return [...target, ...source];
		} else {
			if(tLength === sLength) {
				return target.map((item, index) => mergeDeep(item, source[index]));
			} else {
				const maxLength = Math.max(tLength, sLength);
				const mergedArray = new Array(maxLength);
				for(let i = 0; i < maxLength; i++){
					if(isObj(target[i]) && isObj(source[i]) || Array.isArray(target[i]) && Array.isArray(source[i])){
						mergedArray[i] = mergeDeep(target[i], source[i]);
					} else if(i < tLength){
						mergedArray[i] = target[i];
					} else {
						mergedArray[i] = source[i];
					}
				}
				return mergedArray;
			}
		}
	} else if(isObj(target) && isObj(source)){
		const targetKeys = getObjectKeys(target);
		const sourceKeys = getObjectKeys(source);
		const allKeys = [...new Set([...targetKeys, ...sourceKeys])];
		const mergedObject = Object.create(Object.prototype);
		for (const key of allKeys) {
			if (targetKeys.includes(key) && sourceKeys.includes(key)) {
				mergedObject[key] = mergeDeep(target[key] as T, source[key] as T);
			} else if (targetKeys.includes(key)) {
				mergedObject[key] = target[key];
			} else {
				mergedObject[key] = source[key];
			}
		}
		return mergedObject;
	} else {
		return source;
	}
}, (Array.isArray(sources[0]) ? [] : {}) as T);


export const isSchemaTypeObjectOrList = (type: string) => ['object', 'list'].includes(type);

export const getJsonSchema = (input: Optional<Primitives | object>, path = '', key?: string): JsonSchema => {
	let schema:JsonSchema = { type: 'undefined', value: 'undefined', path };
	switch (typeof input) {
		case 'object':
			if (input === null) {
				schema = { type: 'string', value: '[null]', path };
			} else if (input instanceof Date) {
				schema = { type: 'date', value: input.toISOString(), path };
			} else if (Array.isArray(input)) {
				schema = {
					type: 'list',
					value: input.map((item, index) => ({key: index.toString(), ...getJsonSchema(item,`${path}[${index}]`, index.toString())})),
					path,
				};
			} else if (isObj(input)) {
				schema = {
					type: 'object',
					value: Object.entries(input).map(([k, v]) => ({ key: k, ...getJsonSchema(v, path + `["${ k }"]`, k)})),
					path,
				};
			}
			break;
		case 'string':
			schema = { type: isValidDate(input) ? 'date' : 'string', value: input, path };
			break;
		case 'function':
			schema =  { type: 'function', value: ``, path };
			break;
		default:
			schema =  { type: typeof input, value: String(input), path };
	}

	if (!isSchemaTypeObjectOrList(schema.type)) {
		schema.path = path;
	}

	return schema;
};
