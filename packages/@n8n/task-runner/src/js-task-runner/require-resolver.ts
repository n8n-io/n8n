import { exec } from 'node:child_process';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { createRequire, isBuiltin } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { DisallowedModuleError } from './errors/disallowed-module.error';
import { ExecutionError } from './errors/execution-error';

export type RequireResolverOpts = {
	/**
	 * List of built-in nodejs modules that are allowed to be required in the
	 * execution sandbox. `"*"` means all are allowed.
	 */
	allowedBuiltInModules: Set<string> | '*';

	/**
	 * List of external modules that are allowed to be required in the
	 * execution sandbox. `"*"` means all are allowed.
	 */
	allowedExternalModules: Set<string> | '*';

	dependencies?: Record<string, string>;

	nodeId: string;
};

export type RequireResolver = (request: string) => unknown;
const asyncExec = promisify(exec);

const dirExists = async (dir: string) => {
	try {
		await access(dir);
		return true;
	} catch (error) {
		return false;
	}
};

export async function createRequireResolver({
	allowedBuiltInModules,
	allowedExternalModules,
	dependencies,
	nodeId,
}: RequireResolverOpts) {
	const allowedDependencies = new Set(Object.keys(dependencies ?? {}));

	const tempDir = path.join(os.tmpdir(), `n8n-task-runner-${nodeId}`);

	if (!(await dirExists(tempDir))) {
		await mkdir(tempDir);
	}

	await writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies }));
	await asyncExec('npm install', { cwd: tempDir });

	return (request: string) => {
		const checkIsAllowed = (allowList: Set<string> | '*', moduleName: string) => {
			return allowList === '*' || allowList.has(moduleName) || allowedDependencies.has(moduleName);
		};

		const isAllowed = isBuiltin(request)
			? checkIsAllowed(allowedBuiltInModules, request)
			: checkIsAllowed(allowedExternalModules, request);

		if (!isAllowed) {
			const error = new DisallowedModuleError(request);
			throw new ExecutionError(error);
		}

		const customRequire = createRequire(path.join(tempDir, 'index.js'));

		return allowedDependencies.has(request) ? customRequire(request) : require(request);
	};
}
