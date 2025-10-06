import { ModuleMetadata } from '@n8n/decorators';
import type { EntityClass, ModuleContext, ModuleSettings } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { existsSync } from 'fs';
import path from 'path';

import { MissingModuleError } from './errors/missing-module.error';
import { ModuleConfusionError } from './errors/module-confusion.error';
import { ModulesConfig } from './modules.config';
import type { ModuleName } from './modules.config';
import { LicenseState } from '../license-state';
import { Logger } from '../logging/logger';

@Service()
export class ModuleRegistry {
	readonly entities: EntityClass[] = [];

	readonly loadDirs: string[] = [];

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
	];

	private readonly activeModules: string[] = [];

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

		try {
			// docker + tests
			const n8nPackagePath = require.resolve('n8n/package.json');
			const n8nRoot = path.dirname(n8nPackagePath);
			const srcDirExists = existsSync(path.join(n8nRoot, 'src'));
			const dir = process.env.NODE_ENV === 'test' && srcDirExists ? 'src' : 'dist';
			modulesDir = path.join(n8nRoot, dir, 'modules');
		} catch {
			// local dev
			// n8n binary is inside the bin folder, so we need to go up two levels
			modulesDir = path.resolve(process.argv[1], '../../dist/modules');
		}

		for (const moduleName of modules ?? this.eligibleModules) {
			try {
				await import(`${modulesDir}/${moduleName}/${moduleName}.module`);
			} catch {
				try {
					await import(`${modulesDir}/${moduleName}.ee/${moduleName}.module`);
				} catch (error) {
					throw new MissingModuleError(moduleName, error instanceof Error ? error.message : '');
				}
			}
		}

		for (const ModuleClass of this.moduleMetadata.getClasses()) {
			const entities = await Container.get(ModuleClass).entities?.();

			if (entities?.length) this.entities.push(...entities);

			const loadDir = await Container.get(ModuleClass).loadDir?.();

			if (loadDir) this.loadDirs.push(loadDir);
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
	async initModules() {
		for (const [moduleName, moduleEntry] of this.moduleMetadata.getEntries()) {
			const { licenseFlag, class: ModuleClass } = moduleEntry;

			if (licenseFlag && !this.licenseState.isLicensed(licenseFlag)) {
				this.logger.debug(`Skipped init for unlicensed module "${moduleName}"`);
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
