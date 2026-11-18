import { parseResourcePath } from '@n8n/api-types';

/** Where the editor of this instance is served. `basePath` is `''` or a path such as `/n8n`. */
export type InstanceLocation = { origin: string; basePath: string };

function withoutTrailingSlash(path: string): string {
	return path.replace(/\/+$/, '');
}

/** A path has no whitespace. This keeps a pasted sentence that starts with `/` out. */
function isRelativePath(text: string): boolean {
	return text.startsWith('/') && !text.startsWith('//') && !/\s/.test(text);
}

function parseUrl(text: string): URL | undefined {
	try {
		return new URL(text);
	} catch {
		return undefined;
	}
}

/** Removes the base path of the instance. Returns `undefined` when the path is outside it. */
function withoutBasePath(pathname: string, basePath: string): string | undefined {
	const base = withoutTrailingSlash(basePath);
	const isInsideBase = pathname === base || pathname.startsWith(`${base}/`);
	return isInsideBase ? pathname.slice(base.length) || '/' : undefined;
}

/**
 * Converts an absolute URL of this instance to its instance-relative editor path.
 * A text that is already a relative path comes back unchanged.
 * Returns `undefined` for a URL of another origin, a URL outside the base path, and any other text.
 */
export function toInstanceRelativePath(
	text: string,
	instance: InstanceLocation,
): string | undefined {
	const trimmed = text.trim();
	if (isRelativePath(trimmed)) {
		return trimmed;
	}

	const url = parseUrl(trimmed);
	const isThisInstance = url !== undefined && url.origin === instance.origin;
	const path = isThisInstance ? withoutBasePath(url.pathname, instance.basePath) : undefined;
	return path !== undefined && url !== undefined ? `${path}${url.search}${url.hash}` : undefined;
}

/** Builds the absolute URL that opens an instance-relative editor path. */
export function toAbsoluteUrl(path: string, instance: InstanceLocation): string {
	return `${instance.origin}${withoutTrailingSlash(instance.basePath)}${path}`;
}

/**
 * Reads the editor path of a resource from a pasted text.
 * Returns `undefined` when the text is not the address of a resource of this instance.
 */
export function readPastedResourcePath(
	text: string,
	instance: InstanceLocation,
): string | undefined {
	const path = toInstanceRelativePath(text, instance);
	const isResource = path !== undefined && parseResourcePath(path) !== undefined;
	return isResource ? path : undefined;
}
