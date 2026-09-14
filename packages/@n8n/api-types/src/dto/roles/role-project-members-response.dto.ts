import { z } from 'zod';

import { roleMemberSchema } from './role-member.schema';
import { Z } from '../../zod-class';

export type RoleProjectMember = z.infer<typeof roleMemberSchema>;

export class RoleProjectMembersResponseDto extends Z.class({
	members: z.array(roleMemberSchema),
}) {}

export type RoleProjectMembersResponse = InstanceType<typeof RoleProjectMembersResponseDto>;
