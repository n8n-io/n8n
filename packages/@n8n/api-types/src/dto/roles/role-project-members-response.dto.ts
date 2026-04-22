import { z } from 'zod';

import { Z } from '../../zod-class';

const roleProjectMemberSchema = z.object({
	userId: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string(),
	role: z.string(),
});

export type RoleProjectMember = z.infer<typeof roleProjectMemberSchema>;

export class RoleProjectMembersResponseDto extends Z.class({
	members: z.array(roleProjectMemberSchema),
}) {}

export type RoleProjectMembersResponse = InstanceType<typeof RoleProjectMembersResponseDto>;
