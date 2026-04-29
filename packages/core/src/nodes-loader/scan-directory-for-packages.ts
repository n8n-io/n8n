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

	return installedPackagePaths.map(
		(packagePath) =>
			new LazyPackageDirectoryLoader(
				path.join(nodeModulesDir, packagePath),
				options.excludeNodes,
				options.includeNodes,
			),
	);
}
