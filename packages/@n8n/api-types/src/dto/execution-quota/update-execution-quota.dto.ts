import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateExecutionQuotaDto extends Z.class({
	period: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
	limit: z.number().int().positive().optional(),
	enforcementMode: z.enum(['block', 'warn', 'workflow']).optional(),
	quotaWorkflowId: z.string().max(36).nullable().optional(),
	enabled: z.boolean().optional(),
}) {}
