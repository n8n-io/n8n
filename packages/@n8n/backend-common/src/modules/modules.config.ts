import { CommaSeparatedStringArray, Config, Env } from '@n8n/config';
import type { ModuleName } from '@n8n/decorators';
import { MODULE_NAMES } from '@n8n/decorators';

import { UnknownModuleError } from './errors/unknown-module.error';

class ModuleArray extends CommaSeparatedStringArray<ModuleName> {
	constructor(str: string) {
		super(str);

		for (const moduleName of this) {
			if (!MODULE_NAMES.includes(moduleName)) throw new UnknownModuleError(moduleName);
		}
	}
}

@Config
export class ModulesConfig {
	/** Comma-separated list of all enabled modules. */
	@Env('N8N_ENABLED_MODULES')
	enabledModules: ModuleArray = [];

	/** Comma-separated list of all disabled modules. */
	@Env('N8N_DISABLED_MODULES')
	disabledModules: ModuleArray = [];
}
