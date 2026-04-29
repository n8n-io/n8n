import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import glob from 'fast-glob';
import { ensureError, type NodeLoader } from 'n8n-workflow';
import path from 'path';

import { ErrorReporter } from '@/errors/error-reporter';

import { LazyPackageDirectoryLoader } from './lazy-package-directory-loader';

/**
 * Scan a directory for node packages and return a `LazyPackageDirectoryLoader`
 */
export async function scanDirectoryForPackages(
	nodeModulesDir: string,
	options: { excludeNodes?: string[]; includeNodes?: string[] } = {},
): Promise<NodeLoader[]> {
	const logger = Container.get(Logger);
	const errorReporter = Container.get(ErrorReporter);

	const globOptions = {
		cwd: nodeModulesDir,
		onlyDirectories: true,
		deep: 1,
	};

	const installedPackagePaths = [
		...(await glob('n8n-nodes-*', globOptions)),
		...(await glob('@*/n8n-nodes-*', { ...globOptions, deep: 2 })),
	];

	const loaders: NodeLoader[] = [];

	for (const packagePath of installedPackagePaths) {
		const loader = new LazyPackageDirectoryLoader(
			path.join(nodeModulesDir, packagePath),
			options.excludeNodes,
			options.includeNodes,
		);
		try {
			await loader.loadAll();
			loaders.push(loader);
		} catch (error) {
			logger.error(`Failed to load package at "${packagePath}"`, {
				error: ensureError(error),
			});
			errorReporter.error(error, { extra: { packagePath } });
		}
	}

	return loaders;
}
