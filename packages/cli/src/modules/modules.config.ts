import { CommaSeperatedStringArray, Config, Env } from '@n8n/config';
import { UnexpectedError } from 'n8n-workflow';

const moduleNames = ['insights'] as const;
export type ModuleName = (typeof moduleNames)[number];

class Modules extends CommaSeperatedStringArray<ModuleName> {
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
	/** Comma-separated list of all enabled modules */
	@Env('N8N_ENABLED_MODULES')
	enabledModules: Modules = [];

	/** Comma-separated list of all disabled modules */
	@Env('N8N_DISABLED_MODULES')
	disabledModules: Modules = [];

	private readonly defaultModules: ModuleName[] = ['insights'];

	// Get all modules by merging default and enabled, and filtering out disabled modules
	get modules(): ModuleName[] {
		if (this.enabledModules.some((module) => this.disabledModules.includes(module))) {
			throw new UnexpectedError('Module cannot be both enabled and disabled', { level: 'fatal' });
		}

		// Concat enabled modules with default ones
		const enabledModules = Array.from(new Set(this.defaultModules.concat(this.enabledModules)));

		// filter out disabled modules
		return enabledModules.filter((module) => !this.disabledModules.includes(module));
	}
}
