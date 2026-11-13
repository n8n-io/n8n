import { principalTypeSchema } from '@n8n/permissions';
import { z } from 'zod';

import { roleMemberSchema } from './role-member.schema';
import { Z } from '../../zod-class';

// Only the project-role listing sends the kind. The global role listing shares `roleMemberSchema`.
const roleProjectMemberSchema = roleMemberSchema.extend({ kind: principalTypeSchema });

export type RoleProjectMember = z.infer<typeof roleProjectMemberSchema>;

export class RoleProjectMembersResponseDto extends Z.class({
	members: z.array(roleProjectMemberSchema),
}) {}

export type RoleProjectMembersResponse = InstanceType<typeof RoleProjectMembersResponseDto>;
