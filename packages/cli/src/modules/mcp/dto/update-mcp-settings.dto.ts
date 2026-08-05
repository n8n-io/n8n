import { Z } from '@n8n/api-types';
import { z } from 'zod';

// `Z.class` takes a `ZodRawShape`, so it can't carry an object-level refine.
// Both fields are optional so a settings-scoped update can touch just one of
// them — the "at least one field present" check lives in the controller handler.
export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean().optional(),
	autoExposeNewWorkflows: z.boolean().optional(),
}) {}
