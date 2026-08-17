import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class RolePublicDto extends Z.class({
	slug: z.string(),
	displayName: z.string(),
	description: z.string().nullable(),
	systemRole: z.boolean(),
	roleType: z.enum(['project', 'global']),
	scopes: z.array(z.string()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}) {}

const roleGroupSchema = <T extends 'global' | 'project'>(roleType: T) =>
	RolePublicDto.schema.extend({
		roleType: z.literal(roleType),
		licensed: z.boolean(),
		usedByUsers: z.number().optional(),
		usedByProjects: z.number().optional(),
	});

export class RoleListPublicDto extends Z.class({
	global: z.array(roleGroupSchema('global')),
	project: z.array(roleGroupSchema('project')),
}) {}

export class RoleListQueryPublicDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}

export class RoleGetPublicDto extends RolePublicDto.extend({
	licensed: z.boolean(),
	usedByUsers: z.number().optional(),
	usedByProjects: z.number().optional(),
}) {}
