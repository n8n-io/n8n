import { CommaSeparatedStringArray, Config, Env } from '@n8n/config';
import { UnexpectedError } from 'n8n-workflow';

const moduleNames = ['insights'] as const;
type ModuleName = (typeof moduleNames)[number];

class Modules extends CommaSeparatedStringArray<ModuleName> {
	constructor(str: string) {
		super(str);

		for (const moduleName of this) {
			if (!moduleNames.includes(moduleName)) {
				throw new UnexpectedError(`Unknown module name ${moduleName}`, { level: 'fatal' });
			}
		}
	}
}

@Config
export class ModulesConfig {
	private readonly dbConfig = Container.get(GlobalConfig).database;

	/** Comma-separated list of all enabled modules */
	@Env('N8N_ENABLED_MODULES')
	enabledModules: Modules = [];

	/** Comma-separated list of all disabled modules */
	@Env('N8N_DISABLED_MODULES')
	disabledModules: Modules = [];

	// Get all modules by merging default and enabled, and filtering out disabled modules
	get modules(): ModuleName[] {
		if (this.enabledModules.some((module) => this.disabledModules.includes(module))) {
			throw new UnexpectedError('Module cannot be both enabled and disabled', { level: 'fatal' });
		}

		// Enable insights module by default for all databases except postgres
		const defaultModules: ModuleName[] = this.dbConfig.type !== 'postgresdb' ? ['insights'] : [];

		// Add enabled modules to default modules
		const enabledModules = Array.from(new Set(defaultModules.concat(this.enabledModules)));
		const disabledModules = new Set(this.disabledModules);

		// Force disable insights for sqlite without pool size
		if (this.dbConfig.type === 'sqlite' && !this.dbConfig.sqlite.poolSize) {
			disabledModules.add('insights');
		}

		// filter out disabled modules
		return enabledModules.filter((module) => !disabledModules.has(module));
	}
}
