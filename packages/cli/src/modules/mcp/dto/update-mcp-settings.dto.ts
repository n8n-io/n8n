import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean().optional(),
	autoExposeNewWorkflows: z.boolean().optional(),
}) {}

// `Z.class` returns a plain `z.object`, which has no `.refine`. Both fields are
// optional so a settings-scoped update can touch just one of them, but an empty
// body must still be rejected — override the static parsers with a refined schema.
const atLeastOneField = (data: {
	mcpAccessEnabled?: boolean;
	autoExposeNewWorkflows?: boolean;
}): boolean => data.mcpAccessEnabled !== undefined || data.autoExposeNewWorkflows !== undefined;

const refined = UpdateMcpSettingsDto.schema.refine(atLeastOneField, {
	message: 'Provide at least one of mcpAccessEnabled or autoExposeNewWorkflows',
});

UpdateMcpSettingsDto.safeParse = (data: unknown) => refined.safeParse(data);
UpdateMcpSettingsDto.parse = (data: unknown) => refined.parse(data);
