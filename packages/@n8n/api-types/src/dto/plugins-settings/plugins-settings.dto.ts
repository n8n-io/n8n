import { z } from 'zod';

import { Z } from '../../zod-class';

export class PluginsSettingsDto extends Z.class({
	mergeDevEnabled: z.boolean(),
	mergeDevApiKey: z.string(),
}) {}

export class UpdatePluginsSettingsDto extends Z.class({
	mergeDevEnabled: z.boolean().optional(),
	mergeDevApiKey: z.string().optional(),
}) {}
