import { ApplicationError } from 'n8n-workflow';
import { isBuiltin } from 'node:module';

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
};

export type RequireResolver = (request: string) => unknown;

export function createRequireResolver({
	allowedBuiltInModules,
	allowedExternalModules,
}: RequireResolverOpts) {
	return (request: string) => {
		const checkIsAllowed = (allowList: Set<string> | '*', moduleName: string) => {
			return allowList === '*' || allowList.has(moduleName);
		};

		const isAllowed = isBuiltin(request)
			? checkIsAllowed(allowedBuiltInModules, request)
			: checkIsAllowed(allowedExternalModules, request);

		if (!isAllowed) {
			const error = new ApplicationError(`Cannot find module '${request}'`);
			throw new ExecutionError(error);
		}

		return require(request) as unknown;
	};
}
