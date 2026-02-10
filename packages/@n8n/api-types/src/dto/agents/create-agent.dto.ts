import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateAgentDto extends Z.class({
	firstName: z.string().min(1).max(32),
	avatar: z.string().max(255).nullable().optional(),
	description: z.string().max(500).optional(),
	agentAccessLevel: z.enum(['open', 'internal', 'closed']).optional(),
}) {}
