import { ExecutionError } from '@/js-task-runner/errors/execution-error';

import { DisallowedModuleError } from '../errors/disallowed-module.error';
import { createRequireResolver, type RequireResolverOpts } from '../require-resolver';

describe('require resolver', () => {
	let defaultOpts: RequireResolverOpts;

	beforeEach(() => {
		defaultOpts = {
			allowedBuiltInModules: new Set(['path', 'fs']),
			allowedExternalModules: new Set(['lodash']),
		};
	});

	describe('built-in modules', () => {
		it('should allow requiring whitelisted built-in modules', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('path')).not.toThrow();
			expect(() => resolver('fs')).not.toThrow();
		});

		it('should throw when requiring non-whitelisted built-in modules', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('crypto')).toThrow(ExecutionError);
		});

		it('should allow all built-in modules when allowedBuiltInModules is "*"', () => {
			const resolver = createRequireResolver({
				...defaultOpts,
				allowedBuiltInModules: '*',
			});

			expect(() => resolver('path')).not.toThrow();
			expect(() => resolver('crypto')).not.toThrow();
			expect(() => resolver('fs')).not.toThrow();
		});
	});

	describe('external modules', () => {
		it('should allow requiring whitelisted external modules', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('lodash')).not.toThrow();
		});

		it('should throw when requiring non-allowlisted external modules', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('express')).toThrow(
				new ExecutionError(new DisallowedModuleError('express')),
			);
		});

		it('should allow all external modules when allowedExternalModules is "*"', () => {
			const resolver = createRequireResolver({
				...defaultOpts,
				allowedExternalModules: '*',
			});

			expect(() => resolver('lodash')).not.toThrow();
			expect(() => resolver('express')).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('should wrap DisallowedModuleError in ExecutionError', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('non-existent-module')).toThrow(ExecutionError);
		});

		it('should include the module name in the error message', () => {
			const resolver = createRequireResolver(defaultOpts);
			expect(() => resolver('non-existent-module')).toThrow(
				"Module 'non-existent-module' is disallowed",
			);
		});
	});
});
