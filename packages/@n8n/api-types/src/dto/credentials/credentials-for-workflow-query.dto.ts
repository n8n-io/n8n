import { z } from 'zod';

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
