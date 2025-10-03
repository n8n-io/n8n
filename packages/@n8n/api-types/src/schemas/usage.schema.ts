import { z } from 'zod';

export const usageStateSchema = z.object({
	loading: z.boolean(),
	data: z.object({
		usage: z.object({
			activeWorkflowTriggers: z.object({
				limit: z.number(),
				value: z.number(),
				warningThreshold: z.number(),
			}),
			workflowsHavingEvaluations: z.object({
				limit: z.number(),
				value: z.number(),
			}),
		}),
		license: z.object({
			planId: z.string(),
			planName: z.string(),
		}),
		managementToken: z.string().optional(),
	}),
});

export type UsageState = z.infer<typeof usageStateSchema>;
