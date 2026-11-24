import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { checkNodesApiVersion, N8N_NODES_API_VERSION, type NodeLoader } from 'n8n-workflow';
import path from 'path';

import { isDirectoryEntry, readDirectoryEntries } from './fs-utils';
import { LazyPackageDirectoryLoader } from './lazy-package-directory-loader';

// Excludes leftover `<package>.backup-<timestamp>` directories from a crashed
// install (see `backupPackageDirectory` in `CommunityPackagesService`), which
// would otherwise collide with the real package and crash boot.
const BACKUP_DIRECTORY_PATTERN = /\.backup-[0-9]+$/;

async function findInstalledPackagePaths(nodeModulesDir: string): Promise<string[]> {
	const topLevelEntries = await readDirectoryEntries(nodeModulesDir);
	const unscoped: string[] = [];
	const scoped: string[] = [];

	for (const entry of topLevelEntries) {
		if (BACKUP_DIRECTORY_PATTERN.test(entry.name)) continue;

		if (entry.name.startsWith('n8n-nodes-')) {
			if (await isDirectoryEntry(nodeModulesDir, entry)) {
				unscoped.push(entry.name);
			}
		} else if (entry.name.startsWith('@')) {
			if (!(await isDirectoryEntry(nodeModulesDir, entry))) continue;

			const scopeDir = path.join(nodeModulesDir, entry.name);
			const scopedEntries = await readDirectoryEntries(scopeDir);
			for (const scopedEntry of scopedEntries) {
				if (
					scopedEntry.name.startsWith('n8n-nodes-') &&
					!BACKUP_DIRECTORY_PATTERN.test(scopedEntry.name) &&
					(await isDirectoryEntry(scopeDir, scopedEntry))
				) {
					scoped.push(`${entry.name}/${scopedEntry.name}`);
				}
			}
		}
	}

	return [...unscoped, ...scoped];
}

/**
 * Scan a directory for node packages and return a `LazyPackageDirectoryLoader`
 * for each. Loaders are returned uninitialized; the caller is responsible for
 * calling `loadAll()` once Node's module resolution paths are set up.
 */
export async function scanDirectoryForPackages(
	nodeModulesDir: string,
	options: { excludeNodes?: string[]; includeNodes?: string[] } = {},
): Promise<NodeLoader[]> {
	const installedPackagePaths = await findInstalledPackagePaths(nodeModulesDir);

	const logger = Container.get(Logger);
	const loaders: NodeLoader[] = [];

	for (const packagePath of installedPackagePaths) {
		try {
			const loader = new LazyPackageDirectoryLoader(
				path.join(nodeModulesDir, packagePath),
				options.excludeNodes,
				options.includeNodes,
			);

			// Checked before any loader is registered so incompatible node code is
			// never imported. Second line of defence: the install/update guard
			// rejects these packages up front, this covers versions on disk already.
			const check = checkNodesApiVersion(loader.packageJson);
			if (!check.compatible) {
				const requirement =
					check.reason === 'malformed'
						? `an invalid n8nNodesApiVersion (${JSON.stringify(check.declared)})`
						: `node API version ${check.required}, but this n8n version supports up to ${N8N_NODES_API_VERSION}`;
				logger.warn(
					`Skipping package "${loader.packageName}": it requires ${requirement}. Upgrade n8n to use this package, or uninstall it in Settings > Community nodes.`,
				);
				continue;
			}

			loaders.push(loader);
		} catch (error) {
			logger.warn(
				`Skipping package directory "${packagePath}": failed to load package metadata. The package may be partially installed or corrupted.`,
				{ error },
			);
		}
	}

	return loaders;
}
