import { UnexpectedError } from 'n8n-workflow';
import * as path from 'node:path';

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
