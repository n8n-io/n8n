import sanitizeHtmlModule from 'sanitize-html';

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
	return sanitizeHtmlModule(dirtyHtml, {
		allowedAttributes: {
			'*': ['href','name', 'target', 'data-*', 'title', 'class'],
		},
		allowedTags: ['p', 'strong', 'b', 'code', 'a', 'br', 'i', 'em', 'small' ],
	});
}
