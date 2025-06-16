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

export const userListItemSchema = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().email().nullable(),
	role: roleSchema,
	isPending: z.boolean(),
	lastActive: z.string().nullable(),
	projects: z.array(z.string()).nullable(), // Can be null if the user is the owner or is an admin
});

export const usersListSchema = z.object({
	count: z.number(),
	data: z.array(userListItemSchema),
});

export type UsersList = z.infer<typeof usersListSchema>;
