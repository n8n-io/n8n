import xss, { friendlyAttrValue } from 'xss';

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

export const intersection = <T>(a: T[], b:T[]): T[] => a.filter(Set.prototype.has, new Set(b));
