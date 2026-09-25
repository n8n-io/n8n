import { z } from 'zod';

export const workflowUsageCoverageSchema = z.object({
	totalWorkflows: z.number().int().nonnegative(),
	indexedWorkflows: z.number().int().nonnegative(),
	complete: z.boolean(),
});

export const workflowUsageScopeSchema = z.object({
	projectId: z.string().optional(),
	folderId: z.string().optional(),
	folderPath: z.string().optional(),
	recursive: z.boolean().optional(),
});

export const credentialUsageResultSchema = z.object({
	workflowsInScope: z.number().int().nonnegative(),
	eligibleWorkflowCount: z.number().int().nonnegative(),
	credentials: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
			workflowCount: z.number().int().nonnegative(),
		}),
	),
	workflows: z
		.array(z.object({ workflowId: z.string(), name: z.string(), updatedAt: z.string() }))
		.optional(),
	coverage: workflowUsageCoverageSchema,
	scope: workflowUsageScopeSchema,
	truncated: z.boolean(),
	/** These bindings stay in the denominator, but their metadata stays private. */
	unavailableWorkflowCount: z.number().int().nonnegative(),
});

export type WorkflowUsageCoverage = z.infer<typeof workflowUsageCoverageSchema>;
export type WorkflowUsageScope = z.infer<typeof workflowUsageScopeSchema>;
export type CredentialUsageResult = z.infer<typeof credentialUsageResultSchema>;
