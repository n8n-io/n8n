import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiMcpUpdateConnectionRequestDto extends Z.class({
	credentialId: z.string().min(1).max(36).optional(),
	inclusionMode: z.enum(['all', 'selected', 'except']).optional(),
	selectedTools: z.array(z.string()).optional(),
	excludedTools: z.array(z.string()).optional(),
}) {}
