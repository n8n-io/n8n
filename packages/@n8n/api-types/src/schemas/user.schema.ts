import { projectRoleSchema } from '@n8n/permissions';
import { z } from 'zod';

import { userSettingsSchema } from './user-settings.schema';

export const ROLE = {
	Owner: 'global:owner',
	Member: 'global:member',
	Admin: 'global:admin',
	Default: 'default', // default user with no email when setting up instance
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

// Ensuring the array passed to z.enum is correctly typed as non-empty.
const roleValuesForSchema = Object.values(ROLE) as [Role, ...Role[]];
export const roleSchema = z.enum(roleValuesForSchema);

export const userProjectSchema = z.object({
	id: z.string(),
	role: projectRoleSchema,
	name: z.string(),
});

export const userBaseSchema = z.object({
	id: z.string(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	role: roleSchema.optional(),
});

export const userDetailSchema = userBaseSchema.extend({
	isPending: z.boolean().optional(),
	isOwner: z.boolean().optional(),
	signInType: z.string().optional(),
	settings: userSettingsSchema.nullable().optional(),
	personalizationAnswers: z.object({}).passthrough().nullable().optional(),
	projectRelations: z.array(userProjectSchema).nullable().optional(),
	mfaEnabled: z.boolean().optional(),
	lastActiveAt: z.string().nullable().optional(),
	inviteAcceptUrl: z.string().optional(),
});

export const usersListSchema = z.object({
	count: z.number(),
	items: z.array(userDetailSchema),
});

export type User = z.infer<typeof userDetailSchema>;
export type UsersList = z.infer<typeof usersListSchema>;
