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
	/** Comma-separated list of all enabled modules */
	@Env('N8N_ENABLED_MODULES')
	modules: Modules = [];
}
