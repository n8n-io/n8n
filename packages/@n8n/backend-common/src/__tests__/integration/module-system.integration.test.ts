/**
 * Integration tests for the complete module system functionality
 * Tests how ModuleRegistry, ModulesConfig, LicenseState, and error handling work together
 */

import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ModuleMetadata } from '@n8n/decorators';

import { LicenseState } from '../../license-state';
import { Logger } from '../../logging/logger';
import { ModuleRegistry } from '../../modules/module-registry';
import { ModulesConfig } from '../../modules/modules.config';
import { ModuleConfusionError } from '../../modules/errors/module-confusion.error';
import { UnknownModuleError } from '../../modules/errors/unknown-module.error';
import type { LicenseProvider } from '../../types';

describe('Module System Integration Tests', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		jest.resetAllMocks();
		Container.reset();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('Complete Module Lifecycle', () => {
		it('should handle full module lifecycle from configuration to shutdown', async () => {
			// Setup environment
			process.env.N8N_ENABLED_MODULES = 'insights';

			// Setup license provider
			const mockLicenseProvider = mock<LicenseProvider>();
			mockLicenseProvider.isLicensed.mockReturnValue(true);

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			// Setup module metadata
			const mockModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ enabled: true }),
				shutdown: jest.fn().mockResolvedValue(undefined),
				entities: jest.fn().mockReturnValue([class TestEntity {}]),
			} as any;

			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getClasses.mockReturnValue([mockModule]);
			mockModuleMetadata.getEntries.mockReturnValue([
				['insights', { licenseFlag: 'feat:insights:viewDashboard', class: mockModule }],
			]);
			mockModuleMetadata.get.mockReturnValue({ class: mockModule });

			// Create registry
			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				Container.get(ModulesConfig),
			);

			// Mock container to return the module
			Container.get = jest.fn().mockReturnValue(mockModule);

			// Mock dynamic imports
			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			// Mock require.resolve for path resolution
			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve = jest.fn().mockReturnValue('/path/to/n8n/package.json');

			try {
				// 1. Load modules
				await moduleRegistry.loadModules();
				expect(moduleRegistry.entities).toHaveLength(1);

				// 2. Initialize modules
				await moduleRegistry.initModules();
				expect(mockModule.init).toHaveBeenCalled();
				expect(moduleRegistry.isActive('insights' as any)).toBe(true);
				expect(moduleRegistry.settings.has('insights')).toBe(true);

				// 3. Verify license checking
				expect(mockLicenseProvider.isLicensed).toHaveBeenCalledWith('feat:insights:viewDashboard');

				// 4. Shutdown module
				await moduleRegistry.shutdownModule('insights' as any);
				expect(mockModule.shutdown).toHaveBeenCalled();
				expect(moduleRegistry.isActive('insights' as any)).toBe(false);
			} finally {
				global.import = originalImport;
			}
		});

		it('should handle unlicensed modules in full lifecycle', async () => {
			// Setup environment
			process.env.N8N_ENABLED_MODULES = 'external-secrets';

			// Setup license provider that denies access
			const mockLicenseProvider = mock<LicenseProvider>();
			mockLicenseProvider.isLicensed.mockReturnValue(false);

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			// Setup module metadata
			const mockModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ enabled: true }),
				entities: jest.fn().mockReturnValue([]),
			} as any;

			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getClasses.mockReturnValue([mockModule]);
			mockModuleMetadata.getEntries.mockReturnValue([
				['external-secrets', { licenseFlag: 'feat:externalSecrets', class: mockModule }],
			]);

			// Create registry
			const mockLogger = mock<Logger>();
			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mockLogger,
				Container.get(ModulesConfig),
			);

			Container.get = jest.fn().mockReturnValue(mockModule);

			// Mock dynamic imports
			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve = jest.fn().mockReturnValue('/path/to/n8n/package.json');

			try {
				// Load and initialize
				await moduleRegistry.loadModules();
				await moduleRegistry.initModules();

				// Module should not be initialized due to license
				expect(mockModule.init).not.toHaveBeenCalled();
				expect(moduleRegistry.isActive('external-secrets' as any)).toBe(false);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Skipped init for unlicensed module "external-secrets"',
				);
			} finally {
				global.import = originalImport;
			}
		});
	});

	describe('Configuration Integration', () => {
		it('should integrate ModulesConfig with ModuleRegistry for enabled/disabled modules', () => {
			process.env.N8N_ENABLED_MODULES = 'insights';
			process.env.N8N_DISABLED_MODULES = 'external-secrets';

			const moduleRegistry = Container.get(ModuleRegistry);
			const eligibleModules = moduleRegistry.eligibleModules;

			// Should include enabled module, exclude disabled one
			expect(eligibleModules).toContain('insights');
			expect(eligibleModules).not.toContain('external-secrets');
		});

		it('should handle configuration conflicts', () => {
			// Set up conflicting configuration
			process.env.N8N_ENABLED_MODULES = 'insights';
			process.env.N8N_DISABLED_MODULES = 'insights';

			const moduleRegistry = Container.get(ModuleRegistry);

			expect(() => moduleRegistry.eligibleModules).toThrow(ModuleConfusionError);
		});

		it('should handle invalid module names in configuration', () => {
			process.env.N8N_ENABLED_MODULES = 'invalid-module';

			expect(() => Container.get(ModulesConfig)).toThrow(UnknownModuleError);
		});

		it('should handle comma-separated module lists', () => {
			process.env.N8N_ENABLED_MODULES = 'insights,external-secrets';
			process.env.N8N_DISABLED_MODULES = '';

			const moduleRegistry = Container.get(ModuleRegistry);
			const eligibleModules = moduleRegistry.eligibleModules;

			expect(eligibleModules).toContain('insights');
			expect(eligibleModules).toContain('external-secrets');
		});

		it('should handle whitespace in module configuration', () => {
			process.env.N8N_ENABLED_MODULES = ' insights , external-secrets ';

			const moduleRegistry = Container.get(ModuleRegistry);
			const eligibleModules = moduleRegistry.eligibleModules;

			expect(eligibleModules).toContain('insights');
			expect(eligibleModules).toContain('external-secrets');
		});
	});

	describe('License Integration', () => {
		it('should integrate LicenseState with module initialization', async () => {
			const mockLicenseProvider = mock<LicenseProvider>();
			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			// Setup different license scenarios
			mockLicenseProvider.isLicensed.mockImplementation((feature) => {
				return feature === 'feat:insights:viewDashboard';
			});

			const licensedModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({}),
			} as any;

			const unlicensedModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({}),
			} as any;

			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([
				['insights', { licenseFlag: 'feat:insights:viewDashboard', class: licensedModule }],
				['external-secrets', { licenseFlag: 'feat:externalSecrets', class: unlicensedModule }],
			]);

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			Container.get = jest.fn().mockImplementation((cls) => {
				if (cls === licensedModule) return licensedModule;
				if (cls === unlicensedModule) return unlicensedModule;
				throw new Error('Unknown class');
			});

			await moduleRegistry.initModules();

			// Only licensed module should be initialized
			expect(licensedModule.init).toHaveBeenCalled();
			expect(unlicensedModule.init).not.toHaveBeenCalled();
			expect(moduleRegistry.isActive('insights' as any)).toBe(true);
			expect(moduleRegistry.isActive('external-secrets' as any)).toBe(false);
		});

		it('should handle license provider errors gracefully', async () => {
			const mockLicenseProvider = mock<LicenseProvider>();
			mockLicenseProvider.isLicensed.mockImplementation(() => {
				throw new Error('License service unavailable');
			});

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			const mockModule = { init: jest.fn() } as any;
			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([
				['insights', { licenseFlag: 'feat:insights:viewDashboard', class: mockModule }],
			]);

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			await expect(moduleRegistry.initModules()).rejects.toThrow('License service unavailable');
		});

		it('should handle missing license provider', async () => {
			const licenseState = Container.get(LicenseState);
			// Don't set a license provider

			const mockModule = { init: jest.fn() } as any;
			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([
				['insights', { licenseFlag: 'feat:insights:viewDashboard', class: mockModule }],
			]);

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			await expect(moduleRegistry.initModules()).rejects.toThrow(
				'Cannot query license state because license provider has not been set',
			);
		});
	});

	describe('Error Handling Integration', () => {
		it('should propagate configuration errors through the system', () => {
			// Invalid configuration should be caught at the config level
			process.env.N8N_ENABLED_MODULES = 'nonexistent-module';

			expect(() => {
				Container.get(ModuleRegistry);
			}).toThrow(UnknownModuleError);
		});

		it('should handle module loading errors gracefully', async () => {
			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getClasses.mockImplementation(() => {
				throw new Error('Metadata loading failed');
			});

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				mock<LicenseState>(),
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			// Mock imports
			const originalImport = global.import;
			global.import = jest.fn().mockResolvedValue({});

			const mockRequire = require as jest.MockedFunction<NodeRequire> & {
				resolve: jest.MockedFunction<NodeRequire['resolve']>;
			};
			mockRequire.resolve = jest.fn().mockReturnValue('/path/to/n8n/package.json');

			try {
				await expect(moduleRegistry.loadModules([])).rejects.toThrow('Metadata loading failed');
			} finally {
				global.import = originalImport;
			}
		});

		it('should handle cascading errors in module system', async () => {
			// Setup a scenario where multiple components fail
			const failingLicenseProvider = mock<LicenseProvider>();
			failingLicenseProvider.isLicensed.mockImplementation(() => {
				throw new Error('License system failure');
			});

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(failingLicenseProvider);

			const mockModule = { init: jest.fn() } as any;
			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([
				['insights', { licenseFlag: 'feat:insights:viewDashboard', class: mockModule }],
			]);

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			// Should fail at license check, not proceed to module init
			await expect(moduleRegistry.initModules()).rejects.toThrow('License system failure');
			expect(mockModule.init).not.toHaveBeenCalled();
		});
	});

	describe('Environment Integration', () => {
		it('should work correctly in different NODE_ENV settings', async () => {
			const scenarios = ['development', 'production', 'test'];

			for (const env of scenarios) {
				process.env.NODE_ENV = env;

				// Test that module system still works
				const moduleRegistry = Container.get(ModuleRegistry);
				const eligibleModules = moduleRegistry.eligibleModules;

				// Should always include default modules
				expect(eligibleModules).toContain('insights');
				expect(eligibleModules).toContain('external-secrets');

				Container.reset();
			}
		});

		it('should handle undefined NODE_ENV', async () => {
			delete process.env.NODE_ENV;

			const moduleRegistry = Container.get(ModuleRegistry);
			const eligibleModules = moduleRegistry.eligibleModules;

			expect(eligibleModules).toContain('insights');
			expect(eligibleModules).toContain('external-secrets');
		});
	});

	describe('Concurrent Operations', () => {
		it('should handle concurrent module operations safely', async () => {
			const mockLicenseProvider = mock<LicenseProvider>();
			mockLicenseProvider.isLicensed.mockReturnValue(true);

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			const mockModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({}),
				shutdown: jest.fn().mockResolvedValue(undefined),
			} as any;

			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([['insights', { class: mockModule }]]);
			mockModuleMetadata.get.mockReturnValue({ class: mockModule });

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			Container.get = jest.fn().mockReturnValue(mockModule);

			// Perform concurrent operations
			const operations = [
				moduleRegistry.initModules(),
				moduleRegistry.initModules(), // Duplicate init
			];

			await Promise.all(operations);

			// Should handle concurrent access gracefully
			expect(moduleRegistry.isActive('insights' as any)).toBe(true);
		});

		it('should handle rapid license state changes', () => {
			const mockLicenseProvider = mock<LicenseProvider>();
			const licenseState = Container.get(LicenseState);

			// Rapid provider changes
			for (let i = 0; i < 100; i++) {
				const provider = mock<LicenseProvider>();
				licenseState.setLicenseProvider(provider);
			}

			// Final provider should be set
			licenseState.setLicenseProvider(mockLicenseProvider);
			expect(licenseState.licenseProvider).toBe(mockLicenseProvider);
		});
	});

	describe('Memory and Resource Management', () => {
		it('should clean up resources properly during shutdown', async () => {
			const mockLicenseProvider = mock<LicenseProvider>();
			mockLicenseProvider.isLicensed.mockReturnValue(true);

			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(mockLicenseProvider);

			const mockModule = {
				init: jest.fn().mockResolvedValue(undefined),
				settings: jest.fn().mockReturnValue({ resource: 'allocated' }),
				shutdown: jest.fn().mockResolvedValue(undefined),
			} as any;

			const mockModuleMetadata = mock<ModuleMetadata>();
			mockModuleMetadata.getEntries.mockReturnValue([['insights', { class: mockModule }]]);
			mockModuleMetadata.get.mockReturnValue({ class: mockModule });

			const moduleRegistry = new ModuleRegistry(
				mockModuleMetadata,
				licenseState,
				mock<Logger>(),
				mock<ModulesConfig>(),
			);

			Container.get = jest.fn().mockReturnValue(mockModule);

			// Initialize module
			await moduleRegistry.initModules();
			expect(moduleRegistry.settings.has('insights')).toBe(true);
			expect(moduleRegistry.isActive('insights' as any)).toBe(true);

			// Shutdown should clean up
			await moduleRegistry.shutdownModule('insights' as any);
			expect(mockModule.shutdown).toHaveBeenCalled();
			expect(moduleRegistry.isActive('insights' as any)).toBe(false);
		});

		it('should handle Container reset properly', () => {
			const licenseState1 = Container.get(LicenseState);
			const moduleRegistry1 = Container.get(ModuleRegistry);

			Container.reset();

			const licenseState2 = Container.get(LicenseState);
			const moduleRegistry2 = Container.get(ModuleRegistry);

			// Should get new instances after reset
			expect(licenseState1).not.toBe(licenseState2);
			expect(moduleRegistry1).not.toBe(moduleRegistry2);
		});
	});
});
