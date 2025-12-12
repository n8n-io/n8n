import { z } from 'zod';

export const WorkflowExecutionStatusSchema = z.object({
	workflowId: z.string(),
	credentials: z
		.array(
			z.object({
				credentialId: z.string(),
				credentialType: z.string(),
				credentialStatus: z.enum(['missing', 'configured']),
				authorizationUrl: z.string().optional(),
			}),
		)
		.optional(),
	readyToExecute: z.boolean(),
});

export type WorkflowExecutionStatus = z.infer<typeof WorkflowExecutionStatusSchema>;
