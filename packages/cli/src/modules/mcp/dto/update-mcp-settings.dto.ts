import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean(),
}) {}
