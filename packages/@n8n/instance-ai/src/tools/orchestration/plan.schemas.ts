import { planObjectSchema } from '@n8n/api-types';
import { z } from 'zod';

// Re-export shared plan schemas from @n8n/api-types (source of truth)
export { planStepSchema, planObjectSchema } from '@n8n/api-types';
export type { PlanStep, PlanObject } from '@n8n/api-types';

// Tool-specific schemas (not shared — only used by the plan tool)

export const planInputSchema = z
	.object({
		action: z
			.enum(['create', 'update', 'review'])
			.describe('create = new plan, update = modify existing, review = read current plan'),
		plan: planObjectSchema.optional().describe('Required for create/update. Omit for review.'),
	})
	.superRefine((data, ctx) => {
		if ((data.action === 'create' || data.action === 'update') && !data.plan) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'plan is required for create/update actions',
				path: ['plan'],
			});
		}
	});

export type PlanInput = z.infer<typeof planInputSchema>;

export const planOutputSchema = z.object({
	plan: planObjectSchema.nullable().describe('Current plan state (null if no plan exists)'),
	message: z.string().describe('Status message'),
});

export type PlanOutput = z.infer<typeof planOutputSchema>;
