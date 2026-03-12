import { z } from 'zod';

import { Z } from '../../zod-class';

const pluginFieldSchema = z.object({
	key: z.string(),
	label: z.string(),
	placeholder: z.string().optional(),
	value: z.string(),
});

const pluginSchema = z.object({
	id: z.string(),
	credentialType: z.string(),
	displayName: z.string(),
	description: z.string(),
	managedToggleField: z.string(),
	enabled: z.boolean(),
	fields: z.array(pluginFieldSchema),
});

export class PluginsSettingsDto extends Z.class({
	plugins: z.array(pluginSchema),
}) {}

export class UpdatePluginSettingsDto extends Z.class({
	id: z.string(),
	enabled: z.boolean().optional(),
	fields: z.record(z.string(), z.string()).optional(),
}) {}

export type PluginFieldDto = z.infer<typeof pluginFieldSchema>;
export type PluginDto = z.infer<typeof pluginSchema>;
