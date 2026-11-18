import { parseResourcePath } from './page-resource-path';

/** Where the editor of an instance is served. `basePath` is `''` or a path such as `/n8n`. */
export type PageInstanceLocation = { origin: string; basePath: string };

const SINGLE_MARKDOWN_LINK = /^\[[^\]]*\]\(\s*<?([^)\s>]+)>?\s*\)$/;

/** Reads the destination of a text that is one markdown link. Any other text comes back unchanged. */
function toLinkDestination(text: string): string {
	return SINGLE_MARKDOWN_LINK.exec(text)?.[1] ?? text;
}

/** A link address has no whitespace. This keeps a sentence that starts with an address out. */
function isSingleToken(text: string): boolean {
	return text !== '' && !/\s/.test(text);
}

function isRelativePath(text: string): boolean {
	return text.startsWith('/') && !text.startsWith('//');
}

function parseUrl(text: string): URL | undefined {
	try {
		return new URL(text);
	} catch {
		return undefined;
	}
}

function readPageId(path: string): string | undefined {
	const reference = parseResourcePath(path);
	return reference?.resourceType === 'page' ? reference.resourceId : undefined;
}

/** Lists the path and each shorter path that starts at a later segment, the longest first. */
function toPathSuffixes(pathname: string): string[] {
	const segments = pathname.split('/').filter((segment) => segment !== '');
	return segments.map((_, index) => `/${segments.slice(index).join('/')}`);
}

/** Reads the page id from a URL path that can start with an unknown base path. */
function readPageIdBehindAnyBasePath(pathname: string): string | undefined {
	return toPathSuffixes(pathname)
		.map(readPageId)
		.find((pageId) => pageId !== undefined);
}

/** Reads the page id from a URL path of the instance. A path outside the base path has none. */
function readPageIdBehindBasePath(pathname: string, basePath: string): string | undefined {
	const base = basePath.replace(/\/+$/, '');
	const isInsideBase = pathname.startsWith(`${base}/`);
	return isInsideBase ? readPageId(pathname.slice(base.length)) : undefined;
}

function readPageIdOfUrl(url: URL, instance: PageInstanceLocation | undefined): string | undefined {
	if (instance === undefined) {
		return readPageIdBehindAnyBasePath(url.pathname);
	}
	return url.origin === instance.origin
		? readPageIdBehindBasePath(url.pathname, instance.basePath)
		: undefined;
}

function readPageIdOfAddress(
	address: string,
	instance: PageInstanceLocation | undefined,
): string | undefined {
	if (isRelativePath(address)) {
		return readPageId(address);
	}
	const url = parseUrl(address);
	return url === undefined ? undefined : readPageIdOfUrl(url, instance);
}

/**
 * Reads the id of the page that a sticky note shows.
 * Returns an id only when the trimmed text is nothing but the address of a page:
 * an instance-relative path, an absolute URL, or one markdown link to either.
 * With `instance`, an absolute URL must be inside that instance.
 * Without `instance`, an absolute URL can have any origin and any base path.
 */
export function readShownPageId(
	stickyContent: string,
	instance?: PageInstanceLocation,
): string | undefined {
	const address = toLinkDestination(stickyContent.trim());
	return isSingleToken(address) ? readPageIdOfAddress(address, instance) : undefined;
}
