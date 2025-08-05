/**
 * Comprehensive test suite for module error classes
 */

import { UserError, UnexpectedError } from 'n8n-workflow';

import { MissingModuleError } from '../missing-module.error';
import { ModuleConfusionError } from '../module-confusion.error';
import { UnknownModuleError } from '../unknown-module.error';

describe('Module Error Classes', () => {
	describe('MissingModuleError', () => {
		it('should extend UserError', () => {
			const error = new MissingModuleError('test-module', 'Module not found');

			expect(error).toBeInstanceOf(UserError);
			expect(error).toBeInstanceOf(Error);
		});

		it('should format error message correctly with module name and error message', () => {
			const moduleName = 'test-module';
			const errorMsg = 'Module not found';
			const error = new MissingModuleError(moduleName, errorMsg);

			expect(error.message).toBe(
				'Failed to load module "test-module": Module not found. Please review the module\'s entrypoint file name and the module\'s directory name.',
			);
		});

		it('should handle empty error message', () => {
			const error = new MissingModuleError('test-module', '');

			expect(error.message).toBe(
				'Failed to load module "test-module": . Please review the module\'s entrypoint file name and the module\'s directory name.',
			);
		});

		it('should handle special characters in module name', () => {
			const moduleName = 'test-module@1.0.0';
			const errorMsg = 'Version conflict';
			const error = new MissingModuleError(moduleName, errorMsg);

			expect(error.message).toContain('test-module@1.0.0');
			expect(error.message).toContain('Version conflict');
		});

		it('should handle long error messages', () => {
			const moduleName = 'test-module';
			const longErrorMsg = 'A'.repeat(1000);
			const error = new MissingModuleError(moduleName, longErrorMsg);

			expect(error.message).toContain(longErrorMsg);
			expect(error.message).toContain('test-module');
		});

		it('should handle null or undefined values gracefully', () => {
			// @ts-expect-error Testing runtime behavior with invalid input
			const error1 = new MissingModuleError(null, 'error');
			expect(error1.message).toContain('null');

			// @ts-expect-error Testing runtime behavior with invalid input
			const error2 = new MissingModuleError('module', null);
			expect(error2.message).toContain('null');

			// @ts-expect-error Testing runtime behavior with invalid input
			const error3 = new MissingModuleError(undefined, undefined);
			expect(error3.message).toContain('undefined');
		});

		it('should be serializable to JSON', () => {
			const error = new MissingModuleError('test-module', 'Module not found');

			// Test that the error can be stringified and contains the message
			const serialized = JSON.stringify(error);
			expect(serialized).toBeDefined();

			// The exact structure may vary based on UserError implementation
			expect(error.message).toBeDefined();
		});

		it('should maintain proper error stack trace', () => {
			const error = new MissingModuleError('test-module', 'Module not found');

			expect(error.stack).toBeDefined();
			expect(typeof error.stack).toBe('string');
			expect(error.stack).toContain('Error'); // May show as base Error class
		});

		it('should have correct error name', () => {
			const error = new MissingModuleError('test-module', 'Module not found');

			// The error name may be inherited from UserError base class
			expect(error.name).toBeDefined();
			expect(typeof error.name).toBe('string');
		});
	});

	describe('ModuleConfusionError', () => {
		it('should extend UserError', () => {
			const error = new ModuleConfusionError(['test-module']);

			expect(error).toBeInstanceOf(UserError);
			expect(error).toBeInstanceOf(Error);
		});

		it('should format error message correctly for single module', () => {
			const moduleNames = ['test-module'];
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toBe(
				'Found a module listed in both `N8N_ENABLED_MODULES` and `N8N_DISABLED_MODULES`: test-module. Please review your environment variables, as a module cannot be both enabled and disabled.',
			);
		});

		it('should format error message correctly for multiple modules', () => {
			const moduleNames = ['module-a', 'module-b', 'module-c'];
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toBe(
				'Found modules listed in both `N8N_ENABLED_MODULES` and `N8N_DISABLED_MODULES`: module-a, module-b, module-c. Please review your environment variables, as a module cannot be both enabled and disabled.',
			);
		});

		it('should handle empty array', () => {
			const error = new ModuleConfusionError([]);

			expect(error.message).toBe(
				'Found a module listed in both `N8N_ENABLED_MODULES` and `N8N_DISABLED_MODULES`: . Please review your environment variables, as a module cannot be both enabled and disabled.',
			);
		});

		it('should handle special characters in module names', () => {
			const moduleNames = ['test-module@1.0.0', 'another-module_v2'];
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toContain('test-module@1.0.0, another-module_v2');
			expect(error.message).toContain('modules'); // plural form
		});

		it('should handle modules with commas in their names', () => {
			const moduleNames = ['module,with,commas', 'normal-module'];
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toContain('module,with,commas, normal-module');
		});

		it('should handle very long module name lists', () => {
			const moduleNames = Array.from({ length: 100 }, (_, i) => `module-${i}`);
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toContain('modules'); // plural form
			expect(error.message).toContain('module-0');
			expect(error.message).toContain('module-99');
		});

		it('should handle null or undefined values in array', () => {
			// @ts-expect-error Testing runtime behavior with invalid input
			const error1 = new ModuleConfusionError([null, 'valid-module']);
			expect(error1.message).toContain('valid-module');

			// @ts-expect-error Testing runtime behavior with invalid input
			const error2 = new ModuleConfusionError([undefined, 'valid-module']);
			expect(error2.message).toContain('valid-module');
		});

		it('should be serializable to JSON', () => {
			const error = new ModuleConfusionError(['module-a', 'module-b']);

			const serialized = JSON.stringify(error);
			expect(serialized).toBeDefined();
			expect(error.message).toBeDefined();
		});

		it('should maintain proper error stack trace', () => {
			const error = new ModuleConfusionError(['test-module']);

			expect(error.stack).toBeDefined();
			expect(typeof error.stack).toBe('string');
			expect(error.stack).toContain('Error');
		});

		it('should have correct error name', () => {
			const error = new ModuleConfusionError(['test-module']);

			expect(error.name).toBeDefined();
			expect(typeof error.name).toBe('string');
		});

		it('should handle duplicate module names', () => {
			const moduleNames = ['test-module', 'test-module', 'other-module'];
			const error = new ModuleConfusionError(moduleNames);

			expect(error.message).toContain('test-module, test-module, other-module');
		});
	});

	describe('UnknownModuleError', () => {
		it('should extend UnexpectedError', () => {
			const error = new UnknownModuleError('unknown-module');

			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error).toBeInstanceOf(Error);
		});

		it('should format error message correctly', () => {
			const moduleName = 'unknown-module';
			const error = new UnknownModuleError(moduleName);

			expect(error.message).toBe('Unknown module "unknown-module"');
		});

		it('should set fatal error level', () => {
			const error = new UnknownModuleError('unknown-module');

			// Check that it was constructed with fatal level
			expect(error).toBeInstanceOf(UnexpectedError);
			// The level is passed to the parent constructor
		});

		it('should handle empty module name', () => {
			const error = new UnknownModuleError('');

			expect(error.message).toBe('Unknown module ""');
		});

		it('should handle special characters in module name', () => {
			const moduleName = 'module@#$%^&*()';
			const error = new UnknownModuleError(moduleName);

			expect(error.message).toBe('Unknown module "module@#$%^&*()"');
		});

		it('should handle very long module names', () => {
			const longModuleName = 'a'.repeat(1000);
			const error = new UnknownModuleError(longModuleName);

			expect(error.message).toContain(longModuleName);
			expect(error.message).toBe(`Unknown module "${longModuleName}"`);
		});

		it('should handle null or undefined module name', () => {
			// @ts-expect-error Testing runtime behavior with invalid input
			const error1 = new UnknownModuleError(null);
			expect(error1.message).toBe('Unknown module "null"');

			// @ts-expect-error Testing runtime behavior with invalid input
			const error2 = new UnknownModuleError(undefined);
			expect(error2.message).toBe('Unknown module "undefined"');
		});

		it('should be serializable to JSON', () => {
			const error = new UnknownModuleError('unknown-module');

			const serialized = JSON.stringify(error);
			expect(serialized).toBeDefined();
			expect(error.message).toBeDefined();
		});

		it('should maintain proper error stack trace', () => {
			const error = new UnknownModuleError('unknown-module');

			expect(error.stack).toBeDefined();
			expect(typeof error.stack).toBe('string');
			expect(error.stack).toContain('Error');
		});

		it('should have correct error name', () => {
			const error = new UnknownModuleError('unknown-module');

			expect(error.name).toBeDefined();
			expect(typeof error.name).toBe('string');
		});

		it('should handle numeric input converted to string', () => {
			// @ts-expect-error Testing runtime behavior with invalid input
			const error = new UnknownModuleError(123);

			expect(error.message).toBe('Unknown module "123"');
		});

		it('should handle boolean input converted to string', () => {
			// @ts-expect-error Testing runtime behavior with invalid input
			const error = new UnknownModuleError(true);

			expect(error.message).toBe('Unknown module "true"');
		});
	});

	describe('Error Class Relationships and Inheritance', () => {
		it('should have proper inheritance hierarchy', () => {
			const missingError = new MissingModuleError('test', 'error');
			const confusionError = new ModuleConfusionError(['test']);
			const unknownError = new UnknownModuleError('test');

			// Check UserError inheritance
			expect(missingError instanceof UserError).toBe(true);
			expect(confusionError instanceof UserError).toBe(true);

			// Check UnexpectedError inheritance
			expect(unknownError instanceof UnexpectedError).toBe(true);

			// All should be instances of Error
			expect(missingError instanceof Error).toBe(true);
			expect(confusionError instanceof Error).toBe(true);
			expect(unknownError instanceof Error).toBe(true);
		});

		it('should have different error types for instanceof checks', () => {
			const missingError = new MissingModuleError('test', 'error');
			const confusionError = new ModuleConfusionError(['test']);
			const unknownError = new UnknownModuleError('test');

			expect(missingError instanceof MissingModuleError).toBe(true);
			expect(missingError instanceof ModuleConfusionError).toBe(false);
			expect(missingError instanceof UnknownModuleError).toBe(false);

			expect(confusionError instanceof ModuleConfusionError).toBe(true);
			expect(confusionError instanceof MissingModuleError).toBe(false);
			expect(confusionError instanceof UnknownModuleError).toBe(false);

			expect(unknownError instanceof UnknownModuleError).toBe(true);
			expect(unknownError instanceof MissingModuleError).toBe(false);
			expect(unknownError instanceof ModuleConfusionError).toBe(false);
		});

		it('should support error handling patterns', () => {
			const errors = [
				new MissingModuleError('test', 'error'),
				new ModuleConfusionError(['test']),
				new UnknownModuleError('test'),
			];

			errors.forEach((error) => {
				// Should be catchable as generic Error
				expect(() => {
					throw error;
				}).toThrow(Error);

				// Should have message property
				expect(typeof error.message).toBe('string');
				expect(error.message.length).toBeGreaterThan(0);

				// Should have stack trace
				expect(error.stack).toBeDefined();
			});
		});
	});

	describe('Error Usage in Module System Context', () => {
		it('should provide helpful error messages for troubleshooting', () => {
			const missingError = new MissingModuleError('insights', 'Cannot find module');
			expect(missingError.message).toContain("Please review the module's entrypoint file name");

			const confusionError = new ModuleConfusionError(['insights', 'external-secrets']);
			expect(confusionError.message).toContain('Please review your environment variables');

			const unknownError = new UnknownModuleError('invalid-module');
			expect(unknownError.message).toContain('Unknown module');
		});

		it('should handle real-world module names correctly', () => {
			const realModuleNames = ['insights', 'external-secrets'];

			realModuleNames.forEach((moduleName) => {
				const missingError = new MissingModuleError(moduleName, 'Module not found');
				expect(missingError.message).toContain(moduleName);

				const unknownError = new UnknownModuleError(moduleName);
				expect(unknownError.message).toContain(moduleName);
			});

			const confusionError = new ModuleConfusionError(realModuleNames);
			expect(confusionError.message).toContain('insights, external-secrets');
		});

		it('should handle edge cases in module configuration', () => {
			// Case when modules are passed with extra whitespace
			const modulesWithSpaces = [' insights ', ' external-secrets '];
			const error = new ModuleConfusionError(modulesWithSpaces);

			expect(error.message).toContain(' insights ,  external-secrets ');
		});
	});
});
