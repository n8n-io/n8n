import { Config, Env } from '@n8n/config';

import { ModuleArray, moduleArraySchema } from './module-types';

@Config
export class ModulesConfig {
	/** Comma-separated list of enabled modules. */
	@Env('N8N_ENABLED_MODULES', moduleArraySchema)
	enabled: ModuleArray = [];

	/** Comma-separated list of disabled modules. */
	@Env('N8N_DISABLED_MODULES', moduleArraySchema)
	disabled: ModuleArray = [];
}
