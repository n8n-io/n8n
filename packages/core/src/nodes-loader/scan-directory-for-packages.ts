import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import glob from 'fast-glob';
import { checkNodesApiVersion, N8N_NODES_API_VERSION, type NodeLoader } from 'n8n-workflow';
import path from 'path';

import { LazyPackageDirectoryLoader } from './lazy-package-directory-loader';

/**
 * Scan a directory for node packages and return a `LazyPackageDirectoryLoader`
 * for each. Loaders are returned uninitialized; the caller is responsible for
 * calling `loadAll()` once Node's module resolution paths are set up.
 */
export async function scanDirectoryForPackages(
	nodeModulesDir: string,
	options: { excludeNodes?: string[]; includeNodes?: string[] } = {},
): Promise<NodeLoader[]> {
	const globOptions = {
		cwd: nodeModulesDir,
		onlyDirectories: true,
		deep: 1,
		// Excludes leftover `<package>.backup-<timestamp>` directories from a crashed
		// install (see `backupPackageDirectory` in `CommunityPackagesService`), which
		// would otherwise collide with the real package and crash boot.
		ignore: ['**/*.backup-+([0-9])'],
	};

	const installedPackagePaths = [
		...(await glob('n8n-nodes-*', globOptions)),
		...(await glob('@*/n8n-nodes-*', { ...globOptions, deep: 2 })),
	];

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
						: `node API version ${String(check.declared)}, but this n8n version supports up to ${N8N_NODES_API_VERSION}`;
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
