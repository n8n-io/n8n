import { Config, Env } from '@n8n/config';
import { z } from 'zod';

import { UnknownModuleError } from './errors/unknown-module.error';

const MODULE_NAMES = ['insights'] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

const moduleNameSchema = z.enum(MODULE_NAMES);

const moduleArraySchema = z
	.string()
	.transform((value) => (value ? value.split(',') : []))
	.pipe(
		z.array(moduleNameSchema).refine((moduleNames) => {
			for (const m of moduleNames) {
				if (!MODULE_NAMES.includes(m)) throw new UnknownModuleError(m);
			}
			return true;
		}),
	);

type ModuleArray = z.infer<typeof moduleArraySchema>;

@Config
export class ModulesConfig {
	/** Comma-separated list of enabled modules. */
	@Env('N8N_ENABLED_MODULES', moduleArraySchema)
	enabledModules: ModuleArray = [];

	/** Comma-separated list of disabled modules. */
	@Env('N8N_DISABLED_MODULES', moduleArraySchema)
	disabledModules: ModuleArray = [];
}
