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

	// Get all modules by merging default and enabled, and filtering out disabled modules
	getModules(): ModuleName[] {
		if (
			this.moduleConfig.enabledModules.some((module) =>
				this.moduleConfig.disabledModules.includes(module),
			)
		) {
			throw new UnexpectedError('Module cannot be both enabled and disabled', { level: 'fatal' });
		}

		// Enable insights module by default for all databases except postgres
		const dbConfig = this.globalConfig.database;
		const defaultModules: ModuleName[] = dbConfig.type !== 'postgresdb' ? ['insights'] : [];

		// Add enabled modules to default modules
		const enabledModules = Array.from(
			new Set(defaultModules.concat(this.moduleConfig.enabledModules)),
		);
		const disabledModules = new Set(this.moduleConfig.disabledModules);

		// Force disable insights for sqlite without pool size
		if (dbConfig.type === 'sqlite' && !dbConfig.sqlite.poolSize) {
			disabledModules.add('insights');
		}

		// filter out disabled modules
		return enabledModules.filter((module) => !disabledModules.has(module));
	}
}
