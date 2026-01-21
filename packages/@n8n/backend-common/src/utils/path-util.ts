import { UnexpectedError } from 'n8n-workflow';
import * as path from 'node:path';

/**
 * Normalizes a URL path segment by ensuring it starts with `/` (if not empty)
 * and does not end with `/`.
 */
function normalizePathSegment(segment: string): string {
	if (!segment || segment === '/') return '';
	let normalized = segment;
	if (!normalized.startsWith('/')) normalized = '/' + normalized;
	if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
	return normalized;
}

/**
 * Combines and normalizes the base path (N8N_BASE_PATH) and path (N8N_PATH) into
 * a single normalized URL path for use across the application.
 *
 * The result:
 * - Starts with `/` if not empty
 * - Does NOT end with `/`
 * - Returns `/` for root path (when both inputs resolve to empty)
 *
 * @example
 * normalizeBasePath('', '/') // '/'
 * normalizeBasePath('', '/app') // '/app'
 * normalizeBasePath('/prefix', '/') // '/prefix'
 * normalizeBasePath('/prefix', '/app') // '/prefix/app'
 * normalizeBasePath('prefix/', 'app/') // '/prefix/app'
 */
export function normalizeBasePath(basePath: string, urlPath: string): string {
	const result = normalizePathSegment(basePath) + normalizePathSegment(urlPath);
	return result || '/';
}

/**
 * Checks if the given childPath is contained within the parentPath. Resolves
 * the paths before comparing them, so that relative paths are also supported.
 */
export function isContainedWithin(parentPath: string, childPath: string): boolean {
	parentPath = path.resolve(parentPath);
	childPath = path.resolve(childPath);

	if (parentPath === childPath) {
		return true;
	}

	return childPath.startsWith(parentPath + path.sep);
}

/**
 * Joins the given paths to the parentPath, ensuring that the resulting path
 * is still contained within the parentPath. If not, it throws an error to
 * prevent path traversal vulnerabilities.
 *
 * @throws {UnexpectedError} If the resulting path is not contained within the parentPath.
 */
export function safeJoinPath(parentPath: string, ...paths: string[]): string {
	const candidate = path.join(parentPath, ...paths);

	if (!isContainedWithin(parentPath, candidate)) {
		throw new UnexpectedError(
			`Path traversal detected, refusing to join paths: ${parentPath} and ${JSON.stringify(paths)}`,
		);
	}

	return candidate;
}
