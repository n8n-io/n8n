import { isAbsolute, relative } from 'node:path';

/**
 * True when `fullResolved` is strictly inside `rootResolved`. Both inputs must
 * already be absolute — callers decide whether to use `resolve()` or
 * `realpath()` depending on whether symlink containment matters.
 *
 * Rejects: equal paths, `..` traversal, and any absolute `relative()` result
 * (POSIX `/foo`, Windows drive-qualified `D:\foo`, or UNC `\\server\share`).
 */
export function isContained(rootResolved: string, fullResolved: string): boolean {
	const rel = relative(rootResolved, fullResolved);
	if (rel === '') return false;
	if (rel === '..' || rel.startsWith('..')) return false;
	if (isAbsolute(rel)) return false;
	return true;
}
