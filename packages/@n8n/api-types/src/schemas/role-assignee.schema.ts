import { z } from 'zod';

export const roleAssigneeSchema = z.object({
	userId: z.string(),
	email: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	projectId: z.string(),
	projectName: z.string(),
});

export type RoleAssigneeDto = z.infer<typeof roleAssigneeSchema>;
