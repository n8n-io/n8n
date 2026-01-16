import { z } from 'zod';
import { Z } from 'zod-class';

const RiskCategorySchema = z.enum(['credentials', 'database', 'nodes', 'instance', 'filesystem']);

export class RunSecurityAuditRequestDto extends Z.class({
	additionalOptions: z
		.object({
			categories: z.array(RiskCategorySchema).optional(),
			daysAbandonedWorkflow: z.number().int().positive().optional(),
		})
		.optional(),
}) {}
