import type { ModuleInterface, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { LicenseState } from '../../license-state';
import { ModuleConfusionError } from '../errors/module-confusion.error';
import { ModuleRegistry } from '../module-registry';
import { MODULE_NAMES } from '../modules.config';

beforeEach(() => {
	jest.resetAllMocks();
	process.env = {};
	Container.reset();
});

describe('eligibleModules', () => {
	it('should consider all default modules eligible', () => {
		// 'mcp' and 'chat-hub' aren't (yet) eligible modules by default
		const NON_DEFAULT_MODULES = ['mcp', 'chat-hub'];
		const expectedModules = MODULE_NAMES.filter((name) => !NON_DEFAULT_MODULES.includes(name));
		expect(Container.get(ModuleRegistry).eligibleModules).toEqual(expectedModules);
	});

	it('should consider a module ineligible if it was disabled via env var', () => {
		process.env.N8N_DISABLED_MODULES = 'insights';
		expect(Container.get(ModuleRegistry).eligibleModules).toEqual([
			'external-secrets',
			'community-packages',
			'data-table',
		]);
	});

	it('should consider a module eligible if it was enabled via env var', () => {
		process.env.N8N_ENABLED_MODULES = 'data-table';
		expect(Container.get(ModuleRegistry).eligibleModules).toEqual([
			'insights',
			'external-secrets',
			'community-packages',
			'data-table',
		]);
	});

	it('should throw `ModuleConfusionError` if a module is both enabled and disabled', () => {
		process.env.N8N_ENABLED_MODULES = 'insights';
		process.env.N8N_DISABLED_MODULES = 'insights';
		expect(() => Container.get(ModuleRegistry).eligibleModules).toThrow(ModuleConfusionError);
	});
});

describe('loadModules', () => {
	it('should load entities defined by modules', async () => {
		const FirstEntity = class FirstEntityClass {};
		const SecondEntity = class SecondEntityClass {};

		const ModuleClass = {
			entities: jest.fn().mockReturnValue([FirstEntity, SecondEntity]),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: jest.fn().mockReturnValue([ModuleClass]),
		});

		Container.get = jest.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([FirstEntity, SecondEntity]);
	});

	it('should load no entities if none are defined by modules', async () => {
		const ModuleClass = { entities: jest.fn().mockReturnValue([]) };
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: jest.fn().mockReturnValue([ModuleClass]),
		});

		Container.get = jest.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([]);
	});
});

describe('initModules', () => {
	it('should init module if it has no feature flag', async () => {
		const ModuleClass = { init: jest.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest
				.fn()
				.mockReturnValue([['test-module', { licenseFlag: undefined, class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules();

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should init module if it is licensed', async () => {
		const ModuleClass = { init: jest.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest
				.fn()
				.mockReturnValue([
					['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
				]),
		});
		const licenseState = mock<LicenseState>({ isLicensed: jest.fn().mockReturnValue(true) });
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock());

		await moduleRegistry.initModules();

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should skip init for unlicensed module', async () => {
		const ModuleClass = { init: jest.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest
				.fn()
				.mockReturnValue([
					['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
				]),
		});
		const licenseState = mock<LicenseState>({ isLicensed: jest.fn().mockReturnValue(false) });
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock());

		await moduleRegistry.initModules();

		expect(ModuleClass.init).not.toHaveBeenCalled();
	});

	it('should accept module without `init` method', async () => {
		const ModuleClass = {};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest
				.fn()
				.mockReturnValue([['test-module', { licenseFlag: undefined, class: ModuleClass }]]),
		});

		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules();

		await expect(moduleRegistry.initModules()).resolves.not.toThrow();
	});

	it('registers settings', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const moduleSettings = { foo: 1 };
		const ModuleClass: ModuleInterface = {
			init: jest.fn(),
			settings: jest.fn().mockReturnValue(moduleSettings),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules();

		// ASSERT
		expect(ModuleClass.settings).toHaveBeenCalled();
		expect(moduleRegistry.settings.has(moduleName)).toBe(true);
		expect(moduleRegistry.settings.get(moduleName)).toBe(moduleSettings);
	});

	it('activates module with settings', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const moduleSettings = { foo: 1 };
		const ModuleClass: ModuleInterface = {
			init: jest.fn(),
			settings: jest.fn().mockReturnValue(moduleSettings),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules();

		// ASSERT
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(moduleRegistry.isActive(moduleName as any)).toBe(true);
		expect(moduleRegistry.getActiveModules()).toEqual([moduleName]);
	});

	it('activates module without settings', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const ModuleClass: ModuleInterface = {
			init: jest.fn(),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules();

		// ASSERT
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(moduleRegistry.isActive(moduleName as any)).toBe(true);
		expect(moduleRegistry.getActiveModules()).toEqual([moduleName]);
	});

	it('registers context for module with `context` method', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const moduleContext = { proxy: 'test-proxy', config: { enabled: true } };
		const ModuleClass: ModuleInterface = {
			init: jest.fn(),
			context: jest.fn().mockReturnValue(moduleContext),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules();

		// ASSERT
		expect(ModuleClass.context).toHaveBeenCalled();
		expect(moduleRegistry.context.has(moduleName)).toBe(true);
		expect(moduleRegistry.context.get(moduleName)).toBe(moduleContext);
	});

	it('does not register context for module without `context` method', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const ModuleClass: ModuleInterface = { init: jest.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: jest.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules();

		// ASSERT
		expect(moduleRegistry.context.has(moduleName)).toBe(false);
	});
});

describe('loadDir', () => {
	it('should load dirs defined by modules', async () => {
		const TEST_LOAD_DIR = '/path/to/module/load/dir';
		const ModuleClass = {
			entities: jest.fn().mockReturnValue([]),
			loadDir: jest.fn().mockReturnValue(TEST_LOAD_DIR),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: jest.fn().mockReturnValue([ModuleClass]),
		});
		Container.get = jest.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]); // empty to skip dynamic imports

		expect(moduleRegistry.loadDirs).toEqual([TEST_LOAD_DIR]);
	});
});
