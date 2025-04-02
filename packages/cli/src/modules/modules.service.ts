import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { ModuleName } from './modules.config';
import { ModulesConfig } from './modules.config';

@Service()
export class ModulesService {
	constructor(
		private readonly moduleConfig: ModulesConfig,
		private readonly globalConfig: GlobalConfig,
	) {}

	private getDefaultModules(): ModuleName[] {
		// Enable insights module by default for all databases except postgres
		// for performance impact reasons (waiting for insights buffering)
		return this.globalConfig.database.type !== 'postgresdb' ? ['insights'] : [];
	}

	private getDisabledModules(): Set<ModuleName> {
		const disabledModules = new Set(this.moduleConfig.disabledModules);

		// Force disable insights for sqlite without pool size
		if (
			this.globalConfig.database.type === 'sqlite' &&
			!this.globalConfig.database.sqlite.poolSize
		) {
			disabledModules.add('insights');
		}
		return disabledModules;
	}

	// Get all modules by merging default and enabled, and filtering out disabled modules
	getModulesToLoad(): ModuleName[] {
		if (
			this.moduleConfig.enabledModules.some((module) =>
				this.moduleConfig.disabledModules.includes(module),
			)
		) {
			throw new UnexpectedError('Module cannot be both enabled and disabled', { level: 'fatal' });
		}

		// Concat enabled modules with default ones
		const enabledModules = Array.from(
			new Set(this.getDefaultModules().concat(this.moduleConfig.enabledModules)),
		);

		// filter out disabled modules
		return enabledModules.filter((module) => !this.getDisabledModules().has(module));
	}
}
