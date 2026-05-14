import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateAgentDto extends Z.class({
	name: z.string().optional(),
	updatedAt: z.string().optional(),
	description: z.string().optional(),
}) {}
