import { projectRoleSchema } from '@n8n/permissions';
import { z } from 'zod';

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

export const userListItemSchema = z.object({
	id: z.string().optional(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	role: roleSchema.optional(),
	isPending: z.boolean().optional(),
	isOwner: z.boolean().optional(),
	signInType: z.string().optional(),
	settings: z.object({}).nullable().optional(),
	personalizationAnswers: z.object({}).nullable().optional(),
	lastActive: z.string().optional(),
	projectRelations: z.array(userProjectSchema).optional(), // Can be null if the user is the owner or is an admin
});

export const usersListSchema = z.object({
	count: z.number(),
	items: z.array(userListItemSchema),
});

export type User = z.infer<typeof userListItemSchema>;
export type UsersList = z.infer<typeof usersListSchema>;
