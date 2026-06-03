import { createHash } from 'node:crypto';

/** Stable 12-char hash for a workspace file bundle (path + content, sorted by path). */
export function computeWorkspaceContentHash(files: Map<string, string>): string {
	const hash = createHash('sha256');
	for (const [path, content] of Array.from(files.entries()).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		hash.update(path);
		hash.update('\0');
		hash.update(content);
		hash.update('\0');
	}
	return hash.digest('hex').slice(0, 12);
}
