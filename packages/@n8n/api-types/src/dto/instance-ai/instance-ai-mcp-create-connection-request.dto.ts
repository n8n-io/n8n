import { z } from 'zod';

import { mcpToolPermissionsSchema } from '../../schemas/mcp-tool-permissions.schema';
import { Z } from '../../zod-class';

export class InstanceAiMcpCreateConnectionRequestDto extends Z.class({
	serverSlug: z.string().min(1).max(255),
	credentialId: z.string().min(1).max(36),
	toolPermissions: mcpToolPermissionsSchema.optional(),
}) {}
