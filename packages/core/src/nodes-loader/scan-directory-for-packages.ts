import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import glob from 'fast-glob';
import { type NodeLoader } from 'n8n-workflow';
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
	};

	const installedPackagePaths = [
		...(await glob('n8n-nodes-*', globOptions)),
		...(await glob('@*/n8n-nodes-*', { ...globOptions, deep: 2 })),
	];

	const logger = Container.get(Logger);
	const loaders: NodeLoader[] = [];

	for (const packagePath of installedPackagePaths) {
		const packageDir = path.join(nodeModulesDir, packagePath);
		try {
			// The constructor reads `package.json` synchronously. A partial or
			// corrupt community-package install can leave a matching directory
			// without a readable `package.json`; skip it instead of crashing boot.
			loaders.push(
				new LazyPackageDirectoryLoader(packageDir, options.excludeNodes, options.includeNodes),
			);
		} catch (error) {
			logger.warn(`Failed to load community package at "${packageDir}", skipping`, { error });
		}
	}

	return loaders;
}
