import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean(),
}) {}
