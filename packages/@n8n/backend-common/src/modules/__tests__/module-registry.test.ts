import type { ModuleInterface, ModuleMetadata, SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { mock } from 'vitest-mock-extended';

import type { LicenseState } from '../../license-state';
import { MissingModuleError } from '../errors/missing-module.error';
import { ModuleConfusionError } from '../errors/module-confusion.error';
import { ModuleLoadError } from '../errors/module-load.error';
import { getModuleEntryUrl, ModuleRegistry } from '../module-registry';

beforeEach(() => {
	vi.resetAllMocks();
	process.env = {};
	Container.reset();
});

describe('getModuleEntryUrl', () => {
	it.each([
		['community module', false, '/insights/insights.module.js'],
		['enterprise module', true, '/insights.ee/insights.module.js'],
	])('should return a file URL for a %s', (_, isEnterprise, expectedPathSuffix) => {
		const url = new URL(
			getModuleEntryUrl(path.join(process.cwd(), 'dist', 'modules'), 'insights', isEnterprise),
		);

		expect(url.protocol).toBe('file:');
		expect(url.pathname.endsWith(expectedPathSuffix)).toBe(true);
	});
});

describe('eligibleModules', () => {
	it('should not include opt-in modules by default', () => {
		const eligible = Container.get(ModuleRegistry).eligibleModules;
		expect(eligible).not.toContain('agents');
		expect(eligible).not.toContain('policy-infrastructure');
	});

	it('should include instance-ai by default', () => {
		expect(Container.get(ModuleRegistry).eligibleModules).toContain('instance-ai');
	});

	it('should allow opting out of a default module via env var', () => {
		process.env.N8N_DISABLED_MODULES = 'instance-ai';
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('instance-ai');
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
			'workflow-reviews',
			'instance-ai',
		]);
	});

	it('should consider a module eligible if it was enabled via env var', () => {
		process.env.N8N_ENABLED_MODULES = 'agents';
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
			'workflow-reviews',
			'instance-ai',
			'agents',
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
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([FirstEntity, SecondEntity]);
	});

	it('should load no entities if none are defined by modules', async () => {
		const ModuleClass = { entities: vi.fn().mockReturnValue([]) };
		const moduleMetadata = mock<ModuleMetadata>({
			getClasses: vi.fn().mockReturnValue([ModuleClass]),
		});

		Container.get = vi.fn().mockReturnValue(ModuleClass);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

		await moduleRegistry.loadModules([]);

		expect(moduleRegistry.entities).toEqual([]);
	});

	describe('entrypoint resolution', () => {
		const MISSING_DEPENDENCY = 'n8n-fixture-absent-dependency';

		let tmpDir: string;
		let originalArgv1: string;

		/** Writes `<modulesDir>/<dirName>/<moduleName>.module.js`. */
		const writeEntrypoint = async (
			dirName: string,
			moduleName: string,
			contents: string,
			packageJson?: string,
		) => {
			const moduleDir = path.join(tmpDir, 'dist', 'modules', dirName);
			await fs.mkdir(moduleDir, { recursive: true });
			await fs.writeFile(path.join(moduleDir, `${moduleName}.module.js`), contents);
			if (packageJson) await fs.writeFile(path.join(moduleDir, 'package.json'), packageJson);
		};

		const loadModule = async (moduleName: string) => {
			const moduleMetadata = mock<ModuleMetadata>({ getClasses: vi.fn().mockReturnValue([]) });
			const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return await moduleRegistry.loadModules([moduleName as any]);
		};

		beforeAll(async () => {
			tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-module-registry-'));

			// Mark the tree as CommonJS, so each entrypoint below is evaluated as CJS
			// unless its own directory says otherwise.
			await fs.writeFile(path.join(tmpDir, 'package.json'), '{ "type": "commonjs" }');

			// Entrypoints that are present but cannot resolve a dependency. This is what
			// an incomplete install produces. CommonJS reports `MODULE_NOT_FOUND`, ESM
			// reports `ERR_MODULE_NOT_FOUND` with no `url`, so neither may be mistaken
			// for an absent entrypoint.
			await writeEntrypoint(
				'cjs-module',
				'cjs-module',
				`require(${JSON.stringify(MISSING_DEPENDENCY)});\n`,
			);
			await writeEntrypoint(
				'esm-module',
				'esm-module',
				`import ${JSON.stringify(MISSING_DEPENDENCY)};\n`,
				'{ "type": "module" }',
			);

			// A module that lives only in the enterprise directory.
			await writeEntrypoint('ee-module.ee', 'ee-module', 'module.exports = {};\n');
		});

		afterAll(async () => {
			await fs.rm(tmpDir, { recursive: true, force: true });
		});

		beforeEach(() => {
			originalArgv1 = process.argv[1];
			// `n8n` is not a dependency of this package, so `loadModules` falls back to
			// deriving `modulesDir` from the n8n binary path, two levels up.
			process.argv[1] = path.join(tmpDir, 'bin', 'n8n');
		});

		afterEach(() => {
			process.argv[1] = originalArgv1;
		});

		it.each(['cjs-module', 'esm-module'])(
			'should report the missing dependency of a %s entrypoint, not the enterprise fallback path',
			async (moduleName) => {
				const loading = loadModule(moduleName);

				// The user must see the dependency that could not be resolved. Retrying
				// with the `.ee` path - a directory that never existed - would replace it
				// with a "cannot find module" error and send the user looking for a
				// naming mistake.
				await expect(loading).rejects.toThrow(ModuleLoadError);
				await expect(loading).rejects.toThrow(MISSING_DEPENDENCY);
				await expect(loading).rejects.not.toThrow(`${moduleName}.ee`);
			},
		);

		it('should fall back to the enterprise directory when only that entrypoint exists', async () => {
			await expect(loadModule('ee-module')).resolves.not.toThrow();
		});

		it('should throw `MissingModuleError` if neither entrypoint exists', async () => {
			await expect(loadModule('absent-module')).rejects.toThrow(MissingModuleError);
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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

		await moduleRegistry.initModules('main');

		expect(ModuleClass.init).toHaveBeenCalled();
	});

	it('should register the system tasks returned by a module', async () => {
		const TaskClass = class TestTask {};
		const ModuleClass = { init: vi.fn(), systemTasks: vi.fn().mockReturnValue([TaskClass]) };
		const moduleMetadata = mock<ModuleMetadata>({
			getEntries: vi
				.fn()
				.mockReturnValue([['test-module', { licenseFlag: undefined, class: ModuleClass }]]),
		});
		const systemTaskMetadata = mock<SystemTaskMetadata>();
		Container.get = vi.fn().mockReturnValue(ModuleClass);

		const moduleRegistry = new ModuleRegistry(
			moduleMetadata,
			mock(),
			mock(),
			mock(),
			systemTaskMetadata,
		);

		await moduleRegistry.initModules('main');

		expect(ModuleClass.systemTasks).toHaveBeenCalled();
		expect(systemTaskMetadata.register).toHaveBeenCalledTimes(1);
		expect(systemTaskMetadata.register).toHaveBeenCalledWith(TaskClass);
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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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

		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

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
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());

		await moduleRegistry.loadModules([]); // empty to skip dynamic imports

		expect(moduleRegistry.nodeLoaders).toEqual([TEST_LOADER]);
	});
});
