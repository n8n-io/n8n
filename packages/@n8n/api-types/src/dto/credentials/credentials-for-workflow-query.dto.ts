import { z } from 'zod';

// Note: This DTO uses a different pattern than others (manual class + static safeParse)
// because Z.class doesn't support .refine() validation. The refine ensures at least
// one of workflowId or projectId is provided.
const credentialsForWorkflowQuerySchema = z
	.object({
		workflowId: z.string().optional(),
		projectId: z.string().optional(),
	})
	.refine((data) => data.workflowId !== undefined || data.projectId !== undefined, {
		message: 'Either workflowId or projectId must be provided',
	});

export class CredentialsForWorkflowQueryDto {
	workflowId?: string;
	projectId?: string;

	static safeParse(data: unknown) {
		return credentialsForWorkflowQuerySchema.safeParse(data);
	}
}
