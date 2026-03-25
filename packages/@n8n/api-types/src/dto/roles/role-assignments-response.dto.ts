import { z } from 'zod';

import { Z } from '../../zod-class';

const roleProjectAssignmentSchema = z.object({
	projectId: z.string(),
	projectName: z.string(),
	projectIcon: z
		.object({
			type: z.string(),
			value: z.string(),
		})
		.nullable(),
	memberCount: z.number(),
	lastAssigned: z.string().nullable(),
});

export type RoleProjectAssignment = z.infer<typeof roleProjectAssignmentSchema>;

export class RoleAssignmentsResponseDto extends Z.class({
	projects: z.array(roleProjectAssignmentSchema),
	totalProjects: z.number(),
}) {}

export type RoleAssignmentsResponse = InstanceType<typeof RoleAssignmentsResponseDto>;
