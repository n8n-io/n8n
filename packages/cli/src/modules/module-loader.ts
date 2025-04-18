import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { Logger } from 'n8n-core';

import { registry } from '@/decorators/module';

import { ModuleLoadingMismatchError } from './errors/module-loading-mismatch.error';
import type { ModuleName } from './modules.config';
import { ModulesConfig } from './modules.config';

@Service()
export class ModuleLoader {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly moduleConfig: ModulesConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('module-loader');
	}

	/** Modules always enabled, unless explicitly disabled. */
	private readonly defaultModules: ModuleName[] = ['insights'];

	/** Modules that this n8n instance has successfully loaded. */
	readonly loadedModules: string[] = [];

	/** Modules that we skipped loading because this n8n instance does not support them. */
	private readonly skippedModules: string[] = [];

	/** Modules that this n8n instance should try to load. */
	get modules(): ModuleName[] {
		const { enabledModules, disabledModules } = this.moduleConfig;

		const mismatched = enabledModules.filter((m) => disabledModules.includes(m));

		if (mismatched.length > 0) throw new ModuleLoadingMismatchError(mismatched);

		const defaultPlusEnabled = Array.from(new Set(this.defaultModules.concat(enabledModules)));

		return defaultPlusEnabled.filter((m) => !disabledModules.includes(m));
	}

	/** Load all enabled modules supported by this n8n instance. */
	async load() {
		for (const moduleName of this.modules) {
			const shouldLoad = await this.shouldLoad(moduleName);

			if (!shouldLoad) {
				this.skippedModules.push(moduleName);
				continue;
			}

			await import(`../modules/${moduleName}/${moduleName}.module`); //  register internally

			this.loadedModules.push(moduleName);
		}

		if (this.skippedModules.length > 0) {
			this.logger.debug('Skipped modules', { moduleNames: this.skippedModules });
		}

		// @TODO: Create context

		for (const ModuleClass of registry.keys()) {
			Container.get(ModuleClass).init();
		}

		// @TODO: A module class's init might fail

		if (this.loadedModules.length > 0) {
			this.logger.debug('Loaded modules', { moduleNames: this.loadedModules });
		}
	}

	/** Check whether this n8n instance supports a given module. */
	async shouldLoad(moduleName: string) {
		type PreInit = {
			shouldLoad: (globalConfig: GlobalConfig) => boolean;
		};

		let preInit: PreInit | undefined;

		try {
			preInit = (await import(`../modules/${moduleName}/${moduleName}.pre-init`)) as PreInit;
		} catch {
			return true; // no pre-init found
		}

		return preInit.shouldLoad(this.globalConfig);
	}

	private createModuleContext() {
		// @TODO
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		for (const ModuleClass of registry.keys()) {
			Container.get(ModuleClass).registerLifecycleHooks?.(hooks);
		}
	}
}
