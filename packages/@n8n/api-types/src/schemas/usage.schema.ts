import { z } from 'zod';

export const usageStateSchema = z.object({
	loading: z.boolean(),
	data: z.object({
		usage: z.object({
			activeWorkflowTriggers: z.object({
				limit: z.number(), // -1 for unlimited, from license
				value: z.number(),
				warningThreshold: z.number(),
			}),
			workflowsHavingEvaluations: z.object({
				limit: z.number(), // -1 for unlimited, from license
				value: z.number(),
			}),
		}),
		license: z.object({
			planId: z.string(), // community
			planName: z.string(), // defaults to Community
		}),
		managementToken: z.string().optional(),
	}),
});

export type UsageState = z.infer<typeof usageStateSchema>;
