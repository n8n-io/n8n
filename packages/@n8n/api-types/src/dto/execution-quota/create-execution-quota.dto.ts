import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateExecutionQuotaDto extends Z.class({
	projectId: z.string().max(36).nullable().optional(),
	workflowId: z.string().max(36).nullable().optional(),
	period: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
	limit: z.number().int().positive(),
	enforcementMode: z.enum(['block', 'warn', 'workflow']),
	quotaWorkflowId: z.string().max(36).nullable().optional(),
	enabled: z.boolean().default(true),
}) {}
