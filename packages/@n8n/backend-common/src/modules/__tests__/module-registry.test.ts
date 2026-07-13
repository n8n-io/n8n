import type { ModuleInterface, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { mock } from 'vitest-mock-extended';

import type { LicenseState } from '../../license-state';
import type { Logger } from '../../logging/logger';
import { MissingModuleError } from '../errors/missing-module.error';
import { ModuleConfusionError } from '../errors/module-confusion.error';
import { ModuleRegistry } from '../module-registry';
import type { ModuleName } from '../modules.config';

beforeEach(() => {
	vi.resetAllMocks();
	process.env = {};
	Container.reset();
});

describe('eligibleModules', () => {
	it('should not include opt-in modules by default', () => {
		const eligible = Container.get(ModuleRegistry).eligibleModules;
		expect(eligible).not.toContain('instance-ai');
	});

	it('should consider a module ineligible if it was disabled via env var', () => {
		process.env.N8N_DISABLED_MODULES = 'insights';
		expect(Container.get(ModuleRegistry).eligibleModules).toEqual([
			'external-secrets',
			'community-packages',
			'data-table',
			'oauth-server',
			'mcp',
			'provisioning',
			'breaking-changes',
			'source-control',
			'dynamic-credentials',
			'chat-hub',
			'sso-oidc',
			'sso-saml',
			'log-streaming',
			'ldap',
			'quick-connect',
			'workflow-builder',
			'favorites',
			'redaction',
			'instance-registry',
			'otel',
			'token-exchange',
			'instance-version-history',
			'encryption-key-manager',
			'oauth-jwe',
			'n8n-packages',
			'runtime-credentials',
			'mcp-registry',
		]);
	});

	it('should consider a module eligible if it was enabled via env var', () => {
		process.env.N8N_ENABLED_MODULES = 'instance-ai';
		expect(Container.get(ModuleRegistry).eligibleModules).toEqual([
			'insights',
			'external-secrets',
			'community-packages',
			'data-table',
			'oauth-server',
			'mcp',
			'provisioning',
			'breaking-changes',
			'source-control',
			'dynamic-credentials',
			'chat-hub',
			'sso-oidc',
			'sso-saml',
			'log-streaming',
			'ldap',
			'quick-connect',
			'workflow-builder',
			'favorites',
			'redaction',
			'instance-registry',
			'otel',
			'token-exchange',
			'instance-version-history',
			'encryption-key-manager',
			'oauth-jwe',
			'n8n-packages',
			'runtime-credentials',
			'mcp-registry',
			'instance-ai',
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
			entities: vi.fn().mockReturnValue([FirstEntity, SecondEntity]),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: vi.fn().mockReturnValue([ModuleClass]),
		});

		Container.get = vi.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([FirstEntity, SecondEntity]);
	});

	it('should load no entities if none are defined by modules', async () => {
		const ModuleClass = { entities: vi.fn().mockReturnValue([]) };
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: vi.fn().mockReturnValue([ModuleClass]),
		});

		Container.get = vi.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([]);
	});

	describe('module path selection', () => {
		let tempRoot: string;
		let modulesDir: string;
		let originalProcessArgv1: string | undefined;
		let createdGlobalKeys: string[];

		const createTestModuleName = (suffix: string) =>
			`module-registry-test-${suffix}-${Math.random().toString(36).slice(2)}` as ModuleName;

		const registerGlobalKey = (key: string) => {
			createdGlobalKeys.push(key);
			return key;
		};

		const writeModuleFile = (directoryName: string, moduleName: string, contents: string) => {
			const moduleDir = path.join(modulesDir, directoryName);
			mkdirSync(moduleDir, { recursive: true });
			writeFileSync(path.join(moduleDir, `${moduleName}.module.ts`), `${contents}\nexport {};\n`);
		};

		const createModuleRegistry = (logger: Logger = mock<Logger>()) => {
			const moduleMetadata = mock<ModuleMetadata>({
				getClasses: vi.fn().mockReturnValue([]),
			});

			return new ModuleRegistry(moduleMetadata, mock(), logger, mock());
		};

		beforeEach(() => {
			tempRoot = mkdtempSync(path.join('D:\\AI', 'module-registry-'));
			modulesDir = path.join(tempRoot, 'dist', 'modules');
			createdGlobalKeys = [];

			mkdirSync(modulesDir, { recursive: true });
			mkdirSync(path.join(tempRoot, 'bin'), { recursive: true });

			originalProcessArgv1 = process.argv[1];
			process.argv[1] = path.join(tempRoot, 'bin', 'n8n');
		});

		afterEach(() => {
			process.argv[1] = originalProcessArgv1 ?? '';
			rmSync(tempRoot, { recursive: true, force: true });

			for (const key of createdGlobalKeys) {
				Reflect.deleteProperty(globalThis, key);
			}
		});

		it('should skip module gracefully when neither CE nor EE directory exists and log debug message', async () => {
			const moduleName = createTestModuleName('missing');
			const logger = mock<Logger>();
			const moduleRegistry = createModuleRegistry(logger);

			await expect(moduleRegistry.loadModules([moduleName])).resolves.not.toThrow();

			expect(logger.debug).toHaveBeenCalledWith(`Module "${moduleName}" not found, skipping`);
		});

		it('should keep the CE selection error and avoid EE fallback when the CE directory exists', async () => {
			const moduleName = createTestModuleName('ce-error');
			const ceLoadedKey = registerGlobalKey(`${moduleName}-ce-loaded`);
			const eeLoadedKey = registerGlobalKey(`${moduleName}-ee-loaded`);
			const ceErrorMessage = `${moduleName} ce import failed`;
			const moduleRegistry = createModuleRegistry();

			writeModuleFile(
				moduleName,
				moduleName,
				`Reflect.set(globalThis, ${JSON.stringify(ceLoadedKey)}, true);\nthrow new Error(${JSON.stringify(ceErrorMessage)});`,
			);
			writeModuleFile(
				`${moduleName}.ee`,
				moduleName,
				`Reflect.set(globalThis, ${JSON.stringify(eeLoadedKey)}, true);`,
			);

			const loadPromise = moduleRegistry.loadModules([moduleName]);

			await expect(loadPromise).rejects.toBeInstanceOf(MissingModuleError);
			await expect(loadPromise).rejects.toMatchObject({
				message: expect.stringContaining(ceErrorMessage),
			});
			expect(Reflect.get(globalThis, ceLoadedKey)).toBe(true);
			expect(Reflect.get(globalThis, eeLoadedKey)).toBeUndefined();
		});

		it('should select the EE path when only the EE directory exists', async () => {
			const moduleName = createTestModuleName('ee-only');
			const eeLoadedKey = registerGlobalKey(`${moduleName}-ee-loaded`);
			const moduleRegistry = createModuleRegistry();

			writeModuleFile(
				`${moduleName}.ee`,
				moduleName,
				`Reflect.set(globalThis, ${JSON.stringify(eeLoadedKey)}, true);`,
			);

			await expect(moduleRegistry.loadModules([moduleName])).resolves.not.toThrow();

			expect(Reflect.get(globalThis, eeLoadedKey)).toBe(true);
		});

		it('should prefer the CE path when both CE and EE directories exist', async () => {
			const moduleName = createTestModuleName('ce-priority');
			const ceLoadedKey = registerGlobalKey(`${moduleName}-ce-loaded`);
			const eeLoadedKey = registerGlobalKey(`${moduleName}-ee-loaded`);
			const moduleRegistry = createModuleRegistry();

			writeModuleFile(
				moduleName,
				moduleName,
				`Reflect.set(globalThis, ${JSON.stringify(ceLoadedKey)}, true);`,
			);
			writeModuleFile(
				`${moduleName}.ee`,
				moduleName,
				`Reflect.set(globalThis, ${JSON.stringify(eeLoadedKey)}, true);`,
			);

			await expect(moduleRegistry.loadModules([moduleName])).resolves.not.toThrow();

			expect(Reflect.get(globalThis, ceLoadedKey)).toBe(true);
			expect(Reflect.get(globalThis, eeLoadedKey)).toBeUndefined();
		});
	});
});

describe('initModules', () => {
	it('should init module if it has no feature flag', async () => {
		const ModuleClass = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([['test-module', { licenseFlag: undefined, class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should init module if it is licensed', async () => {
		const ModuleClass = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([
					['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
				]),
		});
		const licenseState = mock<LicenseState>({ isLicensed: vi.fn().mockReturnValue(true) });
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should skip init for unlicensed module', async () => {
		const ModuleClass = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([
					['test-module', { licenseFlag: 'feat:testFeature', class: ModuleClass }],
				]),
		});
		const licenseState = mock<LicenseState>({ isLicensed: vi.fn().mockReturnValue(false) });
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).not.toHaveBeenCalled();
	});

	it('should accept module without `init` method', async () => {
		const ModuleClass = {};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([['test-module', { licenseFlag: undefined, class: ModuleClass }]]),
		});

		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules('main');

		await expect(moduleRegistry.initModules('main')).resolves.not.toThrow();
	});

	it('registers settings', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const moduleSettings = { foo: 1 };
		const ModuleClass: ModuleInterface = {
			init: vi.fn(),
			settings: vi.fn().mockReturnValue(moduleSettings),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules('main');

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
			init: vi.fn(),
			settings: vi.fn().mockReturnValue(moduleSettings),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules('main');

		// ASSERT
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(moduleRegistry.isActive(moduleName as any)).toBe(true);
		expect(moduleRegistry.getActiveModules()).toEqual([moduleName]);
	});

	it('activates module without settings', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const ModuleClass: ModuleInterface = {
			init: vi.fn(),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules('main');

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
			init: vi.fn(),
			context: vi.fn().mockReturnValue(moduleContext),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules('main');

		// ASSERT
		expect(ModuleClass.context).toHaveBeenCalled();
		expect(moduleRegistry.context.has(moduleName)).toBe(true);
		expect(moduleRegistry.context.get(moduleName)).toBe(moduleContext);
	});

	it('does not register context for module without `context` method', async () => {
		// ARRANGE
		const moduleName = 'test-module';
		const ModuleClass: ModuleInterface = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi.fn().mockReturnValue([[moduleName, { class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		// ACT
		await moduleRegistry.initModules('main');

		// ASSERT
		expect(moduleRegistry.context.has(moduleName)).toBe(false);
	});

	it('should init module with matching instance type', async () => {
		const ModuleClass = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([
					['test-module', { instanceTypes: ['main', 'worker'], class: ModuleClass }],
				]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should skip init for module with non-matching instance type', async () => {
		const ModuleClass = { init: vi.fn() };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([['test-module', { instanceTypes: ['worker'], class: ModuleClass }]]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).not.toHaveBeenCalled();
	});
});

describe('nodeLoaders', () => {
	it('should collect node loaders defined by modules', async () => {
		const TEST_LOADER = { packageName: 'test-loader' };
		const ModuleClass = {
			entities: vi.fn().mockReturnValue([]),
			nodeLoaders: vi.fn().mockResolvedValue([TEST_LOADER]),
		};
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: vi.fn().mockReturnValue([ModuleClass]),
		});
		Container.get = vi.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock());

		await moduleRegistry.loadModules([]); // empty to skip dynamic imports

		expect(moduleRegistry.nodeLoaders).toEqual([TEST_LOADER]);
	});
});
