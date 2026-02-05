import { z } from 'zod';
import { Z } from 'zod-class';

export class CredentialsForWorkflowQueryDto extends Z.class({
	workflowId: z.string().optional(),
	projectId: z.string().optional(),
}) {
	static override safeParse(
		data: unknown,
	): z.SafeParseReturnType<
		{ workflowId?: string; projectId?: string },
		{ workflowId?: string; projectId?: string }
	> {
		const schema = z
			.object({
				workflowId: z.string().optional(),
				projectId: z.string().optional(),
			})
			.refine((d) => d.workflowId !== undefined || d.projectId !== undefined, {
				message: 'Either workflowId or projectId must be provided',
			});
		return schema.safeParse(data);
	}
}
