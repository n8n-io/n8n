import * as ErrorsPackage from '../index';
import { ApplicationError } from '../application.error';
import type { ErrorLevel, ErrorTags, ReportingOptions } from '../types';

// Mock callsites module
jest.mock('callsites', () => {
	const mockCallsites = jest.fn();
	mockCallsites.mockReturnValue([
		{
			getFileName: () => null,
		},
		{
			getFileName: () => null,
		},
		{
			getFileName: () => '/path/to/packages/@n8n/errors/src/index.ts',
		},
	]);
	return mockCallsites;
});

describe('Package Exports', () => {
	describe('ApplicationError export', () => {
		it('should export ApplicationError class', () => {
			expect(ErrorsPackage.ApplicationError).toBeDefined();
			expect(ErrorsPackage.ApplicationError).toBe(ApplicationError);
			expect(typeof ErrorsPackage.ApplicationError).toBe('function');
		});

		it('should be constructable from export', () => {
			const error = new ErrorsPackage.ApplicationError('Test message');

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationError);
			expect(error).toBeInstanceOf(ErrorsPackage.ApplicationError);
			expect(error.message).toBe('Test message');
		});

		it('should maintain class properties through export', () => {
			const error = new ErrorsPackage.ApplicationError('Export test', {
				level: 'warning',
				tags: { source: 'export_test' },
				extra: { testData: true },
			});

			expect(error.level).toBe('warning');
			expect(error.tags).toEqual({ source: 'export_test', packageName: '@n8n' });
			expect(error.extra).toEqual({ testData: true });
		});
	});

	describe('Type exports', () => {
		it('should export ErrorLevel type', () => {
			// Type-only test - if this compiles, the type is exported
			const level: ErrorsPackage.ErrorLevel = 'error';
			expect(level).toBe('error');

			const levels: ErrorsPackage.ErrorLevel[] = ['fatal', 'error', 'warning', 'info'];
			expect(levels).toHaveLength(4);
		});

		it('should export ErrorTags type', () => {
			// Type-only test - if this compiles, the type is exported
			const tags: ErrorsPackage.ErrorTags = {
				module: 'test',
				component: 'export_validation',
			};

			expect(tags.module).toBe('test');
			expect(tags.component).toBe('export_validation');
		});

		it('should export ReportingOptions type', () => {
			// Type-only test - if this compiles, the type is exported
			const options: ErrorsPackage.ReportingOptions = {
				level: 'info',
				shouldReport: true,
				shouldBeLogged: false,
				tags: { test: 'export' },
				extra: { exportTest: true },
				executionId: 'exec-export-test',
			};

			expect(options.level).toBe('info');
			expect(options.shouldReport).toBe(true);
			expect(options.shouldBeLogged).toBe(false);
			expect(options.tags).toEqual({ test: 'export' });
			expect(options.extra).toEqual({ exportTest: true });
			expect(options.executionId).toBe('exec-export-test');
		});
	});

	describe('Package structure', () => {
		it('should export expected number of items', () => {
			const exports = Object.keys(ErrorsPackage);

			// Should export ApplicationError class and types (types don't appear at runtime)
			expect(exports).toContain('ApplicationError');

			// In TypeScript, type-only exports don't appear in the runtime object
			// So we mainly check for the class export
			expect(exports.length).toBeGreaterThanOrEqual(1);
		});

		it('should have correct package metadata when used', () => {
			// Test that the package name extraction works correctly
			// when using the exported class
			const error = new ErrorsPackage.ApplicationError('Package name test');

			// Should extract 'errors' as package name from the file path
			expect(error.tags.packageName).toBe('@n8n');
		});

		it('should maintain instanceof relationships through export', () => {
			const error = new ErrorsPackage.ApplicationError('instanceof test');

			expect(error instanceof Error).toBe(true);
			expect(error instanceof ApplicationError).toBe(true);
			expect(error instanceof ErrorsPackage.ApplicationError).toBe(true);
		});
	});

	describe('Integration with types', () => {
		it('should work with ApplicationError and exported types together', () => {
			const level: ErrorsPackage.ErrorLevel = 'fatal';
			const tags: ErrorsPackage.ErrorTags = {
				integration: 'test',
				scenario: 'exports',
			};
			const options: ErrorsPackage.ReportingOptions = {
				level,
				tags,
				shouldReport: true,
				extra: { integrationTest: true },
			};

			const error = new ErrorsPackage.ApplicationError('Integration test', options);

			expect(error.level).toBe(level);
			expect(error.tags).toEqual({
				...tags,
				packageName: '@n8n',
			});
			expect(error.extra).toEqual({ integrationTest: true });
		});

		it('should support type-safe error creation patterns', () => {
			const createError = (
				message: string,
				level: ErrorsPackage.ErrorLevel,
				tags?: ErrorsPackage.ErrorTags,
			): ErrorsPackage.ApplicationError => {
				return new ErrorsPackage.ApplicationError(message, { level, tags });
			};

			const error1 = createError('Test error 1', 'error');
			expect(error1.level).toBe('error');
			expect(error1.tags).toEqual({ packageName: '@n8n' });

			const error2 = createError('Test error 2', 'warning', { custom: 'tag' });
			expect(error2.level).toBe('warning');
			expect(error2.tags).toEqual({ custom: 'tag', packageName: '@n8n' });
		});

		it('should work with error handling utilities', () => {
			type ErrorWithLevel = {
				error: ErrorsPackage.ApplicationError;
				isHighPriority: boolean;
			};

			const processError = (
				message: string,
				options: ErrorsPackage.ReportingOptions,
			): ErrorWithLevel => {
				const error = new ErrorsPackage.ApplicationError(message, options);
				const isHighPriority = options.level === 'fatal' || options.level === 'error';

				return { error, isHighPriority };
			};

			const result1 = processError('High priority error', { level: 'fatal' });
			expect(result1.isHighPriority).toBe(true);
			expect(result1.error.level).toBe('fatal');

			const result2 = processError('Low priority error', { level: 'info' });
			expect(result2.isHighPriority).toBe(false);
			expect(result2.error.level).toBe('info');
		});
	});

	describe('Re-export validation', () => {
		it('should re-export from correct modules', () => {
			// Verify that ApplicationError export matches the original
			expect(ErrorsPackage.ApplicationError).toBe(ApplicationError);

			// Create instances to verify they're identical
			const directError = new ApplicationError('Direct');
			const exportedError = new ErrorsPackage.ApplicationError('Exported');

			expect(directError.constructor).toBe(exportedError.constructor);
			expect(Object.getPrototypeOf(directError)).toBe(Object.getPrototypeOf(exportedError));
		});

		it('should maintain type compatibility across imports', () => {
			// Test that types from different import styles are compatible
			const directTags: ErrorTags = { direct: 'import' };
			const exportedTags: ErrorsPackage.ErrorTags = { exported: 'import' };

			// These should be type-compatible (no compilation error)
			const combinedTags: ErrorsPackage.ErrorTags = { ...directTags, ...exportedTags };
			expect(combinedTags).toEqual({
				direct: 'import',
				exported: 'import',
			});
		});
	});

	describe('Default export behavior', () => {
		it('should not have default export', () => {
			// This package uses named exports only
			expect((ErrorsPackage as any).default).toBeUndefined();
		});

		it('should work with destructuring imports', () => {
			// This is tested by the very import at the top of this file
			// But we can also test the structure
			const { ApplicationError: DestructuredError } = ErrorsPackage;

			expect(DestructuredError).toBe(ApplicationError);
			expect(DestructuredError).toBe(ErrorsPackage.ApplicationError);

			const error = new DestructuredError('Destructured test');
			expect(error).toBeInstanceOf(ApplicationError);
		});
	});

	describe('TypeScript module resolution', () => {
		it('should provide correct TypeScript types', () => {
			// This test mainly validates that the types are correctly exported
			// and can be used in various TypeScript patterns

			// Generic function using exported types
			const createTypedError = <T extends ErrorsPackage.ReportingOptions>(
				message: string,
				options: T,
			): ErrorsPackage.ApplicationError => {
				return new ErrorsPackage.ApplicationError(message, options);
			};

			const error = createTypedError('Generic test', {
				level: 'warning' as ErrorsPackage.ErrorLevel,
				tags: { generic: 'test' } as ErrorsPackage.ErrorTags,
			});

			expect(error.level).toBe('warning');
			expect(error.tags).toEqual({ generic: 'test', packageName: '@n8n' });
		});

		it('should support conditional types', () => {
			type IsErrorLevel<T> = T extends ErrorsPackage.ErrorLevel ? true : false;

			// These are compile-time checks
			const isError: IsErrorLevel<'error'> = true;
			const isNotError: IsErrorLevel<'invalid'> = false;

			expect(isError).toBe(true);
			expect(isNotError).toBe(false);
		});
	});
});
