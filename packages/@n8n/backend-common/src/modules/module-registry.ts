import type { InstanceType } from '@n8n/constants';
import { ModuleMetadata, SystemTaskMetadata } from '@n8n/decorators';
import type { EntityClass, ModuleContext, ModuleSettings } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { existsSync } from 'fs';
import type { NodeLoader } from 'n8n-workflow';
import path from 'path';
import { pathToFileURL } from 'url';

import { LicenseState } from '../license-state';
import { Logger } from '../logging/logger';
import { MissingModuleError } from './errors/missing-module.error';
import { ModuleConfusionError } from './errors/module-confusion.error';
import { PackagedModuleLoadError } from './errors/packaged-module-load.error';
import { ModulesConfig } from './modules.config';
import type { ModuleName } from './modules.config';

/**
 * Modules that live in a workspace package instead of `n8n/dist/modules`, keyed
 * by module name. Values are thunks, so an ineligible module is never imported.
 */
export type PackagedModules = Partial<Record<ModuleName, () => Promise<unknown>>>;

export const getModuleEntryUrl = (modulesDir: string, moduleName: string, isEnterprise = false) =>
	pathToFileURL(
		path.join(
			modulesDir,
			isEnterprise ? `${moduleName}.ee` : moduleName,
			`${moduleName}.module.js`,
		),
	).href;

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
		private readonly systemTaskMetadata: SystemTaskMetadata,
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
		'workflow-reviews',
		'instance-ai',
	];

	private readonly activeModules: string[] = [];

	private readonly packagedModules: PackagedModules = {};

	/**
	 * Declares which modules `loadModules` must import from a workspace package
	 * instead of the `n8n/dist/modules` filesystem path. Call this before
	 * `loadModules`; cli passes its `src/modules/modules.manifest.ts`.
	 */
	registerPackagedModules(packagedModules: PackagedModules) {
		Object.assign(this.packagedModules, packagedModules);
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
	 * Each module takes exactly one of two routes: the packaged-module manifest
	 * (see `registerPackagedModules`) or the `n8n/dist/modules` filesystem path.
	 * A name in the manifest is skipped on the filesystem route, so a module
	 * class can never be registered twice.
	 *
	 * This will not register routes or do any other kind of module related
	 * setup.
	 */
	async loadModules(modules?: ModuleName[]) {
		const modulesDir = this.resolveModulesDir();

		for (const moduleName of modules ?? this.eligibleModules) {
			const importPackagedModule = this.packagedModules[moduleName];

			if (importPackagedModule) {
				await this.loadPackagedModule(moduleName, importPackagedModule);
				continue; // explicit skip - never also load this name from the filesystem
			}

			await this.loadFilesystemModule(modulesDir, moduleName);
		}

		for (const ModuleClass of this.moduleMetadata.getClasses()) {
			const entities = await Container.get(ModuleClass).entities?.();

			if (entities?.length) this.entities.push(...entities);

			const loaders = await Container.get(ModuleClass).nodeLoaders?.();

			if (loaders?.length) this.nodeLoaders.push(...loaders);

			await Container.get(ModuleClass).commands?.();
		}
	}

	private resolveModulesDir() {
		try {
			// docker + tests
			const n8nPackagePath = require.resolve('n8n/package.json');
			const n8nRoot = path.dirname(n8nPackagePath);
			const srcDirExists = existsSync(path.join(n8nRoot, 'src'));
			const dir = process.env.NODE_ENV === 'test' && srcDirExists ? 'src' : 'dist';
			return path.join(n8nRoot, dir, 'modules');
		} catch {
			// local dev
			// n8n binary is inside the bin folder, so we need to go up two levels
			return path.resolve(process.argv[1], '../../dist/modules');
		}
	}

	private async loadPackagedModule(
		moduleName: ModuleName,
		importPackagedModule: () => Promise<unknown>,
	) {
		try {
			await importPackagedModule();
			this.logger.debug(`Loaded module "${moduleName}" from its workspace package`);
		} catch (error) {
			throw new PackagedModuleLoadError(moduleName, error instanceof Error ? error.message : '');
		}
	}

	private async loadFilesystemModule(modulesDir: string, moduleName: ModuleName) {
		try {
			await import(getModuleEntryUrl(modulesDir, moduleName));
		} catch (primaryError) {
			try {
				await import(getModuleEntryUrl(modulesDir, moduleName, true));
			} catch (error) {
				const loggedError =
					primaryError instanceof Error &&
					'code' in primaryError &&
					primaryError.code !== 'MODULE_NOT_FOUND'
						? primaryError
						: error;
				throw new MissingModuleError(
					moduleName,
					loggedError instanceof Error ? loggedError.message : '',
				);
			}
		}
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

			const systemTasks = await Container.get(ModuleClass).systemTasks?.();

			for (const taskClass of systemTasks ?? []) {
				this.systemTaskMetadata.register(taskClass);
			}

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
