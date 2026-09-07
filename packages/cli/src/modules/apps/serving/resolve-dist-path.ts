import path from 'node:path';

/**
 * Absolute path of the requested file inside an extracted dist, or undefined
 * when the segments would leave `distDir`. `distDir` itself (no segments)
 * resolves to `distDir`, which the caller turns into `index.html`.
 */
export function resolveDistPath(distDir: string, segments: string[]): string | undefined {
	const root = path.resolve(distDir);
	const target = path.resolve(root, ...segments);
	return target === root || target.startsWith(root + path.sep) ? target : undefined;
}
