import type { InstanceType } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import type { EntityClass, ModuleContext, ModuleSettings } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { existsSync } from 'fs';
import type { NodeLoader } from 'n8n-workflow';
import path from 'path';

import { MissingModuleError } from './errors/missing-module.error';
import { ModuleConfusionError } from './errors/module-confusion.error';
import { ModulesConfig } from './modules.config';
import type { ModuleName } from './modules.config';
import { LicenseState } from '../license-state';
import { Logger } from '../logging/logger';

function isModuleNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error &&
		'code' in error &&
		(error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')
	);
}

@Service()
export class ModuleRegistry {
	readonly entities: EntityClass[] = [];

	readonly nodeLoaders: NodeLoader[] = [];

	readonly settings: Map<string, ModuleSettings> = new Map();

	readonly context: Map<string, ModuleContext> = new Map();

	constructor(
		private readonly moduleMetadata: ModuleMetadata,
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
		private readonly modulesConfig: ModulesConfig,
	) {}

	private readonly defaultModules: ModuleName[] = [
		'insights',
		'external-secrets',
		'community-packages',
		'data-table',
		// oauth-server precedes mcp: the mcp module registers its protected
		// resource with the oauth-server module's registry on init.
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
	];

	private readonly activeModules: string[] = [];

	/**
	 * Hooks run once at the start of `initModules`, before any module's `init`.
	 * Lets higher-level packages (e.g. cli) bind dependencies that package-hosted
	 * modules declare as abstract DI tokens but cannot implement themselves.
	 */
	private readonly preInitHooks: Array<() => Promise<void> | void> = [];

	registerPreInitHook(hook: () => Promise<void> | void) {
		this.preInitHooks.push(hook);
	}

	get eligibleModules(): ModuleName[] {
		const { enabledModules, disabledModules } = this.modulesConfig;

		const doubleListed = enabledModules.filter((m) => disabledModules.includes(m));

		if (doubleListed.length > 0) throw new ModuleConfusionError(doubleListed);

		const defaultPlusEnabled = [...new Set([...this.defaultModules, ...enabledModules])];

		return defaultPlusEnabled.filter((m) => !disabledModules.includes(m));
	}

	/**
	 * Loads [module name].module.ts for each eligible module.
	 * This only registers the database entities for module and should be done
	 * before instantiating the datasource.
	 *
	 * This will not register routes or do any other kind of module related
	 * setup.
	 */
	async loadModules(modules?: ModuleName[]) {
		let modulesDir: string;
		let packageResolveBase: string;

		try {
			// docker + tests
			const n8nPackagePath = require.resolve('n8n/package.json');
			const n8nRoot = path.dirname(n8nPackagePath);
			const srcDirExists = existsSync(path.join(n8nRoot, 'src'));
			const dir = process.env.NODE_ENV === 'test' && srcDirExists ? 'src' : 'dist';
			modulesDir = path.join(n8nRoot, dir, 'modules');
			packageResolveBase = n8nRoot;
		} catch {
			// local dev
			// n8n binary is inside the bin folder, so we need to go up two levels
			modulesDir = path.resolve(process.argv[1], '../../dist/modules');
			packageResolveBase = path.resolve(process.argv[1], '../..');
		}

		for (const moduleName of modules ?? this.eligibleModules) {
			await this.importModuleEntrypoint(moduleName, modulesDir, packageResolveBase);
		}

		for (const ModuleClass of this.moduleMetadata.getClasses()) {
			const entities = await Container.get(ModuleClass).entities?.();

			if (entities?.length) this.entities.push(...entities);

			const loaders = await Container.get(ModuleClass).nodeLoaders?.();

			if (loaders?.length) this.nodeLoaders.push(...loaders);

			await Container.get(ModuleClass).commands?.();
		}
	}

	/**
	 * Imports a module's entrypoint, firing its `@BackendModule` decorator.
	 *
	 * Resolution order: in-tree (`<cli>/dist/modules/<name>/<name>.module`), its
	 * `.ee` variant, then a package-hosted module at `@n8n/<name>` exposing a
	 * `./module` export. The package is resolved from the n8n (cli) root so this
	 * low-level package needs no static dependency on the module package.
	 */
	private async importModuleEntrypoint(
		moduleName: ModuleName,
		modulesDir: string,
		packageResolveBase: string,
	) {
		const attempts: Array<() => Promise<unknown>> = [
			async () => await import(`${modulesDir}/${moduleName}/${moduleName}.module`),
			async () => await import(`${modulesDir}/${moduleName}.ee/${moduleName}.module`),
			async () => {
				const entrypoint = require.resolve(`@n8n/${moduleName}/module`, {
					paths: [packageResolveBase],
				});
				return await import(entrypoint);
			},
		];

		let significantError: unknown;
		for (const attempt of attempts) {
			try {
				await attempt();
				return;
			} catch (error) {
				// A genuine load error (module found but failed to import) outranks a
				// "not found" from a resolution path that simply does not apply.
				if (isModuleNotFoundError(error)) {
					significantError ??= error;
				} else {
					significantError = error;
				}
			}
		}

		throw new MissingModuleError(
			moduleName,
			significantError instanceof Error ? significantError.message : '',
		);
	}

	/**
	 * Calls `init` on each eligible module.
	 *
	 * This will do things like registering routes, setup timers or other module
	 * specific setup.
	 *
	 * `ModuleRegistry.loadModules` must have been called before.
	 */
	async initModules(instanceType: InstanceType) {
		for (const hook of this.preInitHooks) {
			await hook();
		}

		for (const [moduleName, moduleEntry] of this.moduleMetadata.getEntries()) {
			const { licenseFlag, instanceTypes, class: ModuleClass } = moduleEntry;

			if (licenseFlag !== undefined && !this.licenseState.isLicensed(licenseFlag)) {
				this.logger.debug(`Skipped init for unlicensed module "${moduleName}"`);
				continue;
			}

			if (instanceTypes !== undefined && !instanceTypes.includes(instanceType)) {
				this.logger.debug(
					`Skipped init for module "${moduleName}" (instance type "${instanceType}" not in: ${instanceTypes.join(', ')})`,
				);
				continue;
			}

			await Container.get(ModuleClass).init?.();

			const moduleSettings = await Container.get(ModuleClass).settings?.();

			if (moduleSettings) this.settings.set(moduleName, moduleSettings);

			const moduleContext = await Container.get(ModuleClass).context?.();

			if (moduleContext) this.context.set(moduleName, moduleContext);

			this.logger.debug(`Initialized module "${moduleName}"`);

			this.activeModules.push(moduleName);
		}
	}

	/**
	 * Refreshes the settings for a specific module by calling its `settings` method.
	 * This will make sure that any changes to the module's settings are reflected in the registry
	 * and in turn available to other parts of the application (like front-end settings service).
	 * If the module does not provide settings, it removes any existing settings for that module.
	 */
	async refreshModuleSettings(moduleName: ModuleName) {
		const moduleEntry = this.moduleMetadata.get(moduleName);

		if (!moduleEntry) {
			this.logger.debug('Skipping settings refresh for unregistered module', { moduleName });
			return null;
		}

		const moduleSettings = await Container.get(moduleEntry.class).settings?.();

		if (moduleSettings) {
			this.settings.set(moduleName, moduleSettings);
		} else {
			this.settings.delete(moduleName);
		}

		return moduleSettings ?? null;
	}

	async shutdownModule(moduleName: ModuleName) {
		const moduleEntry = this.moduleMetadata.get(moduleName);

		if (!moduleEntry) {
			this.logger.debug('Skipping shutdown for unregistered module', { moduleName });
			return;
		}

		await Container.get(moduleEntry.class).shutdown?.();

		const index = this.activeModules.indexOf(moduleName);
		if (index > -1) this.activeModules.splice(index, 1);

		this.logger.debug(`Shut down module "${moduleName}"`);
	}

	isActive(moduleName: ModuleName) {
		return this.activeModules.includes(moduleName);
	}

	getActiveModules() {
		return this.activeModules;
	}
}
