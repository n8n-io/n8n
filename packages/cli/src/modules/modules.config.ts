import { CommaSeparatedStringArray, Config, Env } from '@n8n/config';
import type { DatabaseConfig } from '@n8n/config/src/configs/database.config';
import type { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

export type ModulePreInitContext = {
	instance: InstanceSettings;
	database: DatabaseConfig;
};

export type ModulePreInit = {
	shouldLoadModule: (ctx: ModulePreInitContext) => boolean;
};

const moduleNames = ['insights'] as const;
export type ModuleName = (typeof moduleNames)[number];

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
	/** Comma-separated list of all modules enabled */
	@Env('N8N_ENABLED_MODULES')
	enabledModules: Modules = [];

	/** Comma-separated list of all disabled modules */
	@Env('N8N_DISABLED_MODULES')
	disabledModules: Modules = [];

	// Default modules are always enabled unless explicitly disabled
	private readonly defaultModules: ModuleName[] = ['insights'];

	// Loaded modules are the ones that have been loaded so far by the instance
	readonly loadedModules = new Set<ModuleName>();

	// Get all modules by merging default and enabled, and filtering out disabled modules
	get modules(): ModuleName[] {
		if (this.enabledModules.some((module) => this.disabledModules.includes(module))) {
			throw new UnexpectedError('Module cannot be both enabled and disabled', { level: 'fatal' });
		}

		const enabledModules = Array.from(new Set(this.defaultModules.concat(this.enabledModules)));

		return enabledModules.filter((module) => !this.disabledModules.includes(module));
	}

	addLoadedModule(module: ModuleName) {
		this.loadedModules.add(module);
	}
}
