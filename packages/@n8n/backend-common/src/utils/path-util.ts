import { UnexpectedError } from 'n8n-workflow';
import { lstat } from 'node:fs/promises';
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

/** Components of an absolute path, root-first: `/a/b/c` -> [`/a`, `/a/b`, `/a/b/c`]. */
export function pathComponents(targetPath: string): string[] {
	// Start from the path root (`/` on POSIX, `C:\` on Windows) so drive-qualified
	// paths build correctly instead of being re-rooted at the bare separator.
	const root = path.parse(targetPath).root;
	const segments = targetPath.slice(root.length).split(path.sep).filter(Boolean);
	return segments.reduce<string[]>(
		(components, segment) => [...components, path.join(components.at(-1) ?? root, segment)],
		[],
	);
}

/**
 * Path segments of `descendant` below `ancestor`, or `null` if `descendant` is
 * not contained within `ancestor`. `/a/b` below `/a` -> [`b`]; equal paths -> [].
 */
export function pathSegmentsBetween(ancestor: string, descendant: string): string[] | null {
	if (!isContainedWithin(ancestor, descendant)) {
		return null;
	}
	const relative = path.relative(ancestor, descendant);
	return relative.split(path.sep).filter(Boolean);
}

export async function containsSymlinkedComponent(resolvedPath: string): Promise<boolean> {
	for (const component of pathComponents(resolvedPath)) {
		let stats;
		try {
			stats = await lstat(component);
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				(error.code === 'ENOENT' || error.code === 'ENOTDIR')
			) {
				continue;
			}
			throw error;
		}
		if (stats.isSymbolicLink()) {
			return true;
		}
	}
	return false;
}
