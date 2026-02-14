import fsPromises from 'fs/promises';
import path from 'path';

/**
 * Resolves all custom node package paths in a node_modules directory,
 * handling both scoped (@scope/pkg) and unscoped (pkg) packages.
 * Resolves symlinks to their real paths for file watching support.
 */
export async function resolveCustomNodePackagePaths(
	nodeModulesDir: string,
): Promise<string[]> {
	let entries;
	try {
		entries = await fsPromises.readdir(nodeModulesDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const packagePaths: string[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		if (entry.name.startsWith('@')) {
			// Scoped package directory: read its sub-entries to find actual packages
			const scopeDir = path.join(nodeModulesDir, entry.name);
			let scopeEntries;
			try {
				scopeEntries = await fsPromises.readdir(scopeDir, { withFileTypes: true });
			} catch {
				continue;
			}

			for (const scopeEntry of scopeEntries) {
				if (scopeEntry.name.startsWith('.')) continue;
				if (scopeEntry.isDirectory() || scopeEntry.isSymbolicLink()) {
					packagePaths.push(path.join(scopeDir, scopeEntry.name));
				}
			}
		} else if (entry.isDirectory() || entry.isSymbolicLink()) {
			packagePaths.push(path.join(nodeModulesDir, entry.name));
		}
	}

	const resolvedPaths = await Promise.all(
		packagePaths.map(async (p) => await fsPromises.realpath(p).catch(() => null)),
	);

	return resolvedPaths.filter((p): p is string => p !== null);
}
