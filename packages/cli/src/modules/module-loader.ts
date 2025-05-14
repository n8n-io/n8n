import { Memoized, ModuleMetadata } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { BaseEntity } from '@n8n/typeorm';
import glob from 'fast-glob';
import { InstanceSettings, Logger } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import assert from 'node:assert';
import path from 'node:path';

import { CLI_DIR } from '@/constants';
import { DbConnectionOptions } from '@/databases/db-connection-options';

import { ModuleLoadingMismatchError } from './errors/module-loading-mismatch.error';
import type { ModuleName, PreInitCheck } from './module-types';
import { ModulesConfig } from './modules.config';

@Service()
export class ModuleLoader {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly modulesConfig: ModulesConfig,
		private readonly dbConnectionOptions: DbConnectionOptions,
		private readonly moduleMetadata: ModuleMetadata,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('modules');
	}

	private readonly enabledByDefault: ModuleName[] = ['insights'];

	private readonly cannotBeDisabled: ModuleName[] = [];

	@Memoized
	private get eligibleModules(): ModuleName[] {
		const { enabled: enabledByConfig, disabled: disabledByConfig } = this.modulesConfig;

		const disabled = disabledByConfig.filter((m) => !this.cannotBeDisabled.includes(m));

		const mismatched = enabledByConfig.filter((m) => disabled.includes(m));

		if (mismatched.length > 0) throw new ModuleLoadingMismatchError(mismatched);

		const enabled = Array.from(new Set(this.enabledByDefault.concat(enabledByConfig)));

		return enabled.filter((m) => !disabled.includes(m));
	}

	private modulePath(moduleName: string) {
		return `../modules/${moduleName}/${moduleName}`;
	}

	/** Load all eligible module into memory. To activate them, see `ModuleRegistry.activateModules()`. */
	async loadModules() {
		for (const moduleName of this.eligibleModules) {
			const shouldLoad = await this.shouldLoad(moduleName);

			if (!shouldLoad) {
				this.logger.info(`Skipped module "${moduleName}" due to pre-init check`);
				continue;
			}

			await this.load(moduleName);
		}
	}

	private async shouldLoad(moduleName: string) {
		let check: PreInitCheck | undefined;

		const preInitCheckPath = this.modulePath(moduleName) + '.pre-init';

		try {
			check = (await import(preInitCheckPath)) as PreInitCheck;
		} catch {
			this.logger.debug(`Module "${moduleName}" has no pre-init check`);
			return true; // no pre-init exists
		}

		try {
			return check.shouldLoadModule({ instance: this.instanceSettings });
		} catch (error) {
			this.logger.error(`Pre-init check errored for module "${moduleName}"`, {
				error: ensureError(error),
			});
			return false;
		}
	}

	/** Load the entrypoint and all entities for a module. */
	async load(moduleName: string) {
		const entryPointPath = this.modulePath(moduleName) + '.module';

		try {
			await import(entryPointPath);
			await this.loadEntities(moduleName);
		} catch (error) {
			assert(error instanceof Error);
			this.logger.error(`Skipped module "${moduleName}" due to error`, { error });
			this.moduleMetadata.clear(moduleName); // in case module was loaded but entities were not
		}
	}

	private async loadEntities(moduleName: string) {
		const filePaths = await glob('**/*.entity.js', {
			cwd: path.join(CLI_DIR, 'dist', 'modules', moduleName),
			absolute: true,
		});

		if (filePaths.length === 0) return;

		type Entity = new (...args: unknown[]) => BaseEntity;
		type EntityModule = Record<string, Entity>;

		const entityClasses: Entity[] = [];

		for (const filePath of filePaths) {
			const entityModule = (await import(filePath)) as EntityModule;
			const entityClass = Object.values(entityModule).find(
				(v): v is Entity => typeof v === 'function' && v.prototype instanceof BaseEntity,
			);
			assert(entityClass);
			entityClasses.push(entityClass);
		}

		if (entityClasses.length === 0) return;

		this.dbConnectionOptions.addEntities(entityClasses);

		this.logger.debug(`Loaded ${entityClasses.length} entities for module "${moduleName}"`, {
			entityClassNames: entityClasses.map((c) => c.name),
		});
	}
}
