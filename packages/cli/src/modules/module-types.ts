import type { InstanceSettings } from 'n8n-core';
import { z } from 'zod';

import { UnknownModuleError } from './errors/unknown-module.error';

export const MODULE_NAMES = ['insights'] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

export type PreInitCheck = {
	shouldLoadModule: (ctx: PreInitContext) => boolean;
};

export type PreInitContext = {
	instance: InstanceSettings;
};

export const moduleArraySchema = z
	.string()
	.transform((value) => (value ? value.split(',') : []))
	.pipe(
		z.array(z.enum(MODULE_NAMES)).refine((moduleNames) => {
			for (const m of moduleNames) {
				if (!MODULE_NAMES.includes(m)) throw new UnknownModuleError(m);
			}
			return true;
		}),
	);

export type ModuleArray = z.infer<typeof moduleArraySchema>;
