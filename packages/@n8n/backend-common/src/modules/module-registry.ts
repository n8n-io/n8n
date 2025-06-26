import { ModuleMetadata } from '@n8n/decorators';
import type { EntityClass, ModuleSettings } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
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

	readonly settings: Map<string, ModuleSettings> = new Map();

	constructor(
		private readonly moduleMetadata: ModuleMetadata,
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
		private readonly modulesConfig: ModulesConfig,
	) {}

	private readonly defaultModules: ModuleName[] = ['insights', 'external-secrets'];

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
			// docker
			const n8nPackagePath = require.resolve('n8n/package.json');
			const n8nRoot = path.dirname(n8nPackagePath);
			modulesDir = path.join(n8nRoot, 'dist', 'modules');
		} catch {
			// local dev
			const dir = process.env.NODE_ENV === 'test' ? 'src' : 'dist';
			modulesDir = path.resolve(__dirname, `../../../../cli/${dir}/modules`);
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
			const entities = Container.get(ModuleClass).entities?.();

			if (!entities || entities.length === 0) continue;

			this.entities.push(...entities);
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

			if (!moduleSettings) continue;

			this.settings.set(moduleName, moduleSettings);

			this.logger.debug(`Initialized module "${moduleName}"`);

			this.activeModules.push(moduleName);
		}
	}

	isActive(moduleName: ModuleName) {
		return this.activeModules.includes(moduleName);
	}

	getActiveModules() {
		return this.activeModules;
	}
}
