/**
 * Enhanced test suite for ModuleRegistry - Additional edge cases and error scenarios
 * Supplements the existing module-registry.test.ts with comprehensive edge case coverage
 */

import type { ModuleInterface, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { existsSync } from 'fs';
import path from 'path';

import { LicenseState } from '../../license-state';
import { Logger } from '../../logging/logger';
import { MissingModuleError } from '../errors/missing-module.error';
import { ModuleConfusionError } from '../errors/module-confusion.error';
import { ModuleRegistry } from '../module-registry';
import { ModulesConfig } from '../modules.config';

// Mock filesystem operations
jest.mock('fs');
jest.mock('path');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockPath = path as jest.Mocked<typeof path>;

beforeEach(() => {
	jest.resetAllMocks();
	process.env = {};
	Container.reset();

	// Reset mocks
	mockExistsSync.mockReturnValue(true);
	mockPath.dirname.mockImplementation((p) => p.replace('/package.json', ''));
	mockPath.join.mockImplementation((...args) => args.join('/'));
	mockPath.resolve.mockImplementation((...args) => args.join('/'));
});

describe('ModuleRegistry - Enhanced Edge Cases', () => {
	let moduleRegistry: ModuleRegistry;
	let mockModuleMetadata: jest.Mocked<ModuleMetadata>;
	let mockLicenseState: jest.Mocked<LicenseState>;
	let mockLogger: jest.Mocked<Logger>;
	let mockModulesConfig: jest.Mocked<ModulesConfig>;

	beforeEach(() => {
		mockModuleMetadata = mock<ModuleMetadata>();
		mockLicenseState = mock<LicenseState>();
		mockLogger = mock<Logger>();
		mockModulesConfig = mock<ModulesConfig>();

		moduleRegistry = new ModuleRegistry(
			mockModuleMetadata,
			mockLicenseState,
			mockLogger,
			mockModulesConfig,
		);
	});

	describe('loadModules - Path Resolution and Error Handling', () => {
		beforeEach(() => {
			// Mock require.resolve to simulate different environments
			const originalRequire = require;
			global.require = Object.assign(
				jest.fn().mockImplementation((id: string) => {
					if (id === 'n8n/package.json') {
						throw new Error('Module not found');
					}
					return originalRequire(id);
				}),
				{
					resolve: jest.fn().mockImplementation((id: string) => {
						if (id === 'n8n/package.json') {
							return '/path/to/n8n/package.json';
						}
						throw new Error('Module not found');
					}),
				},
			);
		});

		afterEach(() => {
			// Restore original require
			global.require = require;
		});

		it('should handle Docker environment path resolution', async () => {
			mockExistsSync.mockReturnValue(true);
			mockModuleMetadata.getClasses.mockReturnValue([]);

			// Mock require.resolve to return n8n package.json path
			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			await moduleRegistry.loadModules(['insights']);

			expect(mockPath.dirname).toHaveBeenCalledWith('/path/to/n8n/package.json');
			expect(mockExistsSync).toHaveBeenCalled();
		});

		it('should handle test environment with src directory', async () => {
			process.env.NODE_ENV = 'test';
			mockExistsSync.mockReturnValue(true);
			mockModuleMetadata.getClasses.mockReturnValue([]);

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			await moduleRegistry.loadModules(['insights']);

			expect(mockPath.join).toHaveBeenCalledWith('/path/to/n8n', 'src', 'modules');
		});

		it('should fall back to dist directory when src does not exist in test', async () => {
			process.env.NODE_ENV = 'test';
			mockExistsSync.mockReturnValue(false); // src directory doesn't exist
			mockModuleMetadata.getClasses.mockReturnValue([]);

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			await moduleRegistry.loadModules(['insights']);

			expect(mockPath.join).toHaveBeenCalledWith('/path/to/n8n', 'dist', 'modules');
		});

		it('should handle local development environment path resolution', async () => {
			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockImplementation(() => {
				throw new Error('Module not found');
			});

			// Mock process.argv for local dev scenario
			const originalArgv = process.argv;
			process.argv = ['/usr/bin/node', '/path/to/n8n/bin/n8n'];

			mockModuleMetadata.getClasses.mockReturnValue([]);

			await moduleRegistry.loadModules(['insights']);

			expect(mockPath.resolve).toHaveBeenCalledWith('/path/to/n8n/bin/n8n', '../../dist/modules');

			// Restore original argv
			process.argv = originalArgv;
		});

		it('should handle missing module in primary location but found in .ee location', async () => {
			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			mockModuleMetadata.getClasses.mockReturnValue([]);

			// Mock dynamic import to fail first, succeed second
			const originalImport = global.import;
			global.import = jest
				.fn()
				.mockRejectedValueOnce(new Error('Module not found'))
				.mockResolvedValueOnce({});

			await moduleRegistry.loadModules(['insights']);

			expect(global.import).toHaveBeenCalledTimes(2);
			expect(global.import).toHaveBeenNthCalledWith(
				1,
				'/path/to/n8n/dist/modules/insights/insights.module',
			);
			expect(global.import).toHaveBeenNthCalledWith(
				2,
				'/path/to/n8n/dist/modules/insights.ee/insights.module',
			);

			// Restore original import
			global.import = originalImport;
		});

		it('should throw MissingModuleError when module not found in both locations', async () => {
			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			// Mock dynamic import to fail for both attempts
			const originalImport = global.import;
			global.import = jest
				.fn()
				.mockRejectedValueOnce(new Error('Module not found'))
				.mockRejectedValueOnce(new Error('Module not found in .ee either'));

			await expect(moduleRegistry.loadModules(['nonexistent'])).rejects.toThrow(MissingModuleError);

			expect(global.import).toHaveBeenCalledTimes(2);

			// Restore original import
			global.import = originalImport;
		});

		it('should handle modules with no entities method', async () => {
			const ModuleClass = {} as any; // No entities method
			mockModuleMetadata.getClasses.mockReturnValue([ModuleClass]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			await moduleRegistry.loadModules(['insights']);

			expect(moduleRegistry.entities).toEqual([]);

			global.import = originalImport;
		});

		it('should handle modules with entities method returning null', async () => {
			const ModuleClass = { entities: jest.fn().mockReturnValue(null) } as any;
			mockModuleMetadata.getClasses.mockReturnValue([ModuleClass]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			await moduleRegistry.loadModules(['insights']);

			expect(moduleRegistry.entities).toEqual([]);

			global.import = originalImport;
		});
	});

	describe('initModules - Enhanced Scenarios', () => {
		it('should handle module init method throwing an error', async () => {
			const error = new Error('Init failed');
			const ModuleClass = {
				init: jest.fn().mockRejectedValue(error),
			} as any;
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: undefined, class: ModuleClass }],
			]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await expect(moduleRegistry.initModules()).rejects.toThrow('Init failed');
		});

		it('should handle module settings method throwing an error', async () => {
			const ModuleClass = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockImplementation(() => {
					throw new Error('Settings failed');
				}),
			} as any;
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: undefined, class: ModuleClass }],
			]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await expect(moduleRegistry.initModules()).rejects.toThrow('Settings failed');
		});

		it('should handle async settings method', async () => {
			const moduleSettings = { config: 'test' };
			const ModuleClass = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockResolvedValue(moduleSettings),
			} as any;
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: undefined, class: ModuleClass }],
			]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await moduleRegistry.initModules();

			expect(moduleRegistry.settings.get('test-module')).toBe(moduleSettings);
		});

		it('should handle license state throwing an error', async () => {
			const ModuleClass = { init: jest.fn() } as any;
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
			]);
			mockLicenseState.isLicensed.mockImplementation(() => {
				throw new Error('License check failed');
			});
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await expect(moduleRegistry.initModules()).rejects.toThrow('License check failed');
		});

		it('should log debug messages correctly for licensed modules', async () => {
			const ModuleClass = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ test: true }),
			};
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
			]);
			mockLicenseState.isLicensed.mockReturnValue(true);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await moduleRegistry.initModules();

			expect(mockLogger.debug).toHaveBeenCalledWith('Initialized module "test-module"');
		});

		it('should log debug messages correctly for unlicensed modules', async () => {
			const ModuleClass = { init: jest.fn() } as any;
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
			]);
			mockLicenseState.isLicensed.mockReturnValue(false);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await moduleRegistry.initModules();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Skipped init for unlicensed module "test-module"',
			);
			expect(ModuleClass.init).not.toHaveBeenCalled();
		});

		it('should handle multiple modules with mixed licensing', async () => {
			const LicensedModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ licensed: true }),
			} as any;
			const UnlicensedModule = { init: jest.fn() } as any;
			const NoLicenseModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ noLicense: true }),
			} as any;

			mockModuleMetadata.getEntries.mockReturnValue([
				['licensed-module', { licenseFlag: 'feat:licensed', class: LicensedModule }],
				['unlicensed-module', { licenseFlag: 'feat:unlicensed', class: UnlicensedModule }],
				['no-license-module', { licenseFlag: undefined, class: NoLicenseModule }],
			]);

			mockLicenseState.isLicensed.mockImplementation((feature) => {
				return feature === 'feat:licensed';
			});

			Container.get = jest.fn().mockImplementation((ModuleClass) => ModuleClass);

			await moduleRegistry.initModules();

			expect(LicensedModule.init).toHaveBeenCalled();
			expect(UnlicensedModule.init).not.toHaveBeenCalled();
			expect(NoLicenseModule.init).toHaveBeenCalled();

			expect(moduleRegistry.settings.has('licensed-module')).toBe(true);
			expect(moduleRegistry.settings.has('unlicensed-module')).toBe(false);
			expect(moduleRegistry.settings.has('no-license-module')).toBe(true);
		});
	});

	describe('shutdownModule - Enhanced Scenarios', () => {
		it('should handle module shutdown method throwing an error', async () => {
			const error = new Error('Shutdown failed');
			const ModuleClass = { shutdown: jest.fn().mockRejectedValue(error) } as any;
			mockModuleMetadata.get.mockReturnValue({ class: ModuleClass });
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			// Add module to active modules first
			(moduleRegistry as any).activeModules.push('test-module');

			await expect(moduleRegistry.shutdownModule('test-module' as any)).rejects.toThrow(
				'Shutdown failed',
			);
		});

		it('should handle module without shutdown method', async () => {
			const ModuleClass = {} as any; // No shutdown method
			mockModuleMetadata.get.mockReturnValue({ class: ModuleClass });
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			// Add module to active modules first
			(moduleRegistry as any).activeModules.push('test-module');

			await expect(moduleRegistry.shutdownModule('test-module' as any)).resolves.not.toThrow();

			expect(mockLogger.debug).toHaveBeenCalledWith('Shut down module "test-module"');
		});

		it('should handle shutting down unregistered module', async () => {
			mockModuleMetadata.get.mockReturnValue(undefined);

			await moduleRegistry.shutdownModule('nonexistent-module' as any);

			expect(mockLogger.debug).toHaveBeenCalledWith('Skipping shutdown for unregistered module', {
				moduleName: 'nonexistent-module',
			});
		});

		it('should remove module from active modules list', async () => {
			const ModuleClass = { shutdown: jest.fn().mockResolvedValue(undefined) } as any;
			mockModuleMetadata.get.mockReturnValue({ class: ModuleClass });
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			// Add module to active modules first
			(moduleRegistry as any).activeModules.push('test-module');
			expect(moduleRegistry.isActive('test-module' as any)).toBe(true);

			await moduleRegistry.shutdownModule('test-module' as any);

			expect(moduleRegistry.isActive('test-module' as any)).toBe(false);
			expect(moduleRegistry.getActiveModules()).toEqual([]);
		});

		it('should handle module not in active modules list', async () => {
			const ModuleClass = { shutdown: jest.fn().mockResolvedValue(undefined) } as any;
			mockModuleMetadata.get.mockReturnValue({ class: ModuleClass });
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			// Don't add to active modules list
			expect(moduleRegistry.isActive('test-module' as any)).toBe(false);

			await moduleRegistry.shutdownModule('test-module' as any);

			expect(ModuleClass.shutdown).toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Shut down module "test-module"');
		});
	});

	describe('eligibleModules - Edge Cases', () => {
		it('should handle modules config throwing an error', () => {
			Object.defineProperty(mockModulesConfig, 'enabledModules', {
				get: () => {
					throw new Error('Config error');
				},
			});

			expect(() => moduleRegistry.eligibleModules).toThrow('Config error');
		});

		it('should handle duplicate modules in enabled list', () => {
			Object.defineProperty(mockModulesConfig, 'enabledModules', {
				get: () => ['insights', 'insights', 'external-secrets'],
			});
			Object.defineProperty(mockModulesConfig, 'disabledModules', {
				get: () => [],
			});

			const eligible = moduleRegistry.eligibleModules;

			// Should deduplicate
			expect(eligible).toEqual(['insights', 'external-secrets']);
		});

		it('should handle empty enabled and disabled modules', () => {
			Object.defineProperty(mockModulesConfig, 'enabledModules', {
				get: () => [],
			});
			Object.defineProperty(mockModulesConfig, 'disabledModules', {
				get: () => [],
			});

			const eligible = moduleRegistry.eligibleModules;

			// Should return default modules
			expect(eligible).toEqual(['insights', 'external-secrets']);
		});

		it('should handle all default modules being disabled', () => {
			Object.defineProperty(mockModulesConfig, 'enabledModules', {
				get: () => [],
			});
			Object.defineProperty(mockModulesConfig, 'disabledModules', {
				get: () => ['insights', 'external-secrets'],
			});

			const eligible = moduleRegistry.eligibleModules;

			expect(eligible).toEqual([]);
		});

		it('should throw ModuleConfusionError for multiple conflicted modules', () => {
			Object.defineProperty(mockModulesConfig, 'enabledModules', {
				get: () => ['insights', 'external-secrets'],
			});
			Object.defineProperty(mockModulesConfig, 'disabledModules', {
				get: () => ['insights', 'external-secrets'],
			});

			expect(() => moduleRegistry.eligibleModules).toThrow(ModuleConfusionError);
		});
	});

	describe('getActiveModules and isActive - Edge Cases', () => {
		it('should handle isActive with null or undefined module name', () => {
			// @ts-expect-error Testing runtime behavior
			expect(moduleRegistry.isActive(null)).toBe(false);
			// @ts-expect-error Testing runtime behavior
			expect(moduleRegistry.isActive(undefined)).toBe(false);
		});

		it('should handle concurrent modifications to active modules', async () => {
			const ModuleClass = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({}),
			};
			mockModuleMetadata.getEntries.mockReturnValue([
				['test-module-1', { class: ModuleClass }],
				['test-module-2', { class: ModuleClass }],
			]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			// Initialize modules concurrently
			const initPromises = [moduleRegistry.initModules(), moduleRegistry.initModules()];

			await Promise.all(initPromises);

			// Should handle concurrent access gracefully
			const activeModules = moduleRegistry.getActiveModules();
			expect(Array.isArray(activeModules)).toBe(true);
		});

		it('should maintain active modules order', async () => {
			const modules = ['module-a', 'module-b', 'module-c'];
			const ModuleClass = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({}),
			};

			mockModuleMetadata.getEntries.mockReturnValue(
				modules.map((name) => [name, { class: ModuleClass }]),
			);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			await moduleRegistry.initModules();

			expect(moduleRegistry.getActiveModules()).toEqual(modules);
		});
	});

	describe('Container Integration Edge Cases', () => {
		it('should handle Container.get throwing an error', async () => {
			const ModuleClass = {} as any;
			mockModuleMetadata.getClasses.mockReturnValue([ModuleClass]);
			Container.get = jest.fn().mockImplementation(() => {
				throw new Error('Container error');
			});

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			await expect(moduleRegistry.loadModules(['insights'])).rejects.toThrow('Container error');

			global.import = originalImport;
		});

		it('should handle entities method returning a promise', async () => {
			const entities = [class TestEntity {}];
			const ModuleClass = {
				entities: jest.fn().mockResolvedValue(entities),
			} as any;
			mockModuleMetadata.getClasses.mockReturnValue([ModuleClass]);
			Container.get = jest.fn().mockReturnValue(ModuleClass);

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve.mockReturnValue('/path/to/n8n/package.json');

			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			await moduleRegistry.loadModules(['insights']);

			expect(moduleRegistry.entities).toEqual(entities);

			global.import = originalImport;
		});
	});
});
