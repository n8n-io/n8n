import { z } from 'zod';

import { mcpToolPermissionsSchema } from '../../schemas/mcp-tool-permissions.schema';
import { Z } from '../../zod-class';

export class InstanceAiMcpUpdateConnectionRequestDto extends Z.class({
	credentialId: z.string().min(1).max(36).optional(),
	toolPermissions: mcpToolPermissionsSchema.optional(),
}) {}
