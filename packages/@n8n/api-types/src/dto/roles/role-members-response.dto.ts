import { z } from 'zod';

import { roleMemberSchema } from './role-member.schema';
import { Z } from '../../zod-class';

export type RoleMember = z.infer<typeof roleMemberSchema>;
export class RoleMembersResponseDto extends Z.class({
	members: z.array(roleMemberSchema),
	total: z.number(),
}) {}
export type RoleMembersResponse = InstanceType<typeof RoleMembersResponseDto>;
