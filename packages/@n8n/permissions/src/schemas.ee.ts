import { z } from 'zod';

import { PROJECT_OWNER_ROLE_SLUG } from './constants.ee';
import { ALL_SCOPES } from './scope-information';

export const roleNamespaceSchema = z.enum(['global', 'project', 'credential', 'workflow']);

export const globalRoleSchema = z.enum(['global:owner', 'global:admin', 'global:member']);

const customGlobalRoleSchema = z
	.string()
	.nonempty()
	.refine((val) => !globalRoleSchema.safeParse(val).success, {
		message: 'This global role value is not assignable',
	});

export const assignableGlobalRoleSchema = z.union([
	globalRoleSchema.exclude([
		'global:owner', // Owner cannot be changed
	]),
	customGlobalRoleSchema,
]);

export const personalRoleSchema = z.enum([
	'project:personalOwner', // personalOwner is only used for personal projects
]);

// Those are the system roles for projects assignable to a user
export const teamRoleSchema = z.enum(['project:admin', 'project:editor', 'project:viewer']);

// Custom project role can be anything but the system roles
export const customProjectRoleSchema = z
	.string()
	.nonempty()
	.refine((val) => val !== PROJECT_OWNER_ROLE_SLUG && !teamRoleSchema.safeParse(val).success, {
		message: 'This global role value is not assignable',
	});

// Those are all the system roles for projects
export const systemProjectRoleSchema = z.union([personalRoleSchema, teamRoleSchema]);

// Those are the roles that can be assigned to a user for a project (all roles except personalOwner)
export const assignableProjectRoleSchema = z.union([teamRoleSchema, customProjectRoleSchema]);

export const projectRoleSchema = z.union([systemProjectRoleSchema, customProjectRoleSchema]);

export const credentialSharingRoleSchema = z.enum(['credential:owner', 'credential:user']);

export const workflowSharingRoleSchema = z.enum(['workflow:owner', 'workflow:editor']);

const ALL_SCOPES_LOOKUP_SET = new Set(ALL_SCOPES as string[]);

export const scopeSchema = z.string().refine((val) => ALL_SCOPES_LOOKUP_SET.has(val), {
	message: 'Invalid scope',
});

export const roleSchema = z.object({
	slug: z.string().min(1),
	displayName: z.string().min(1),
	description: z.string().nullable(),
	systemRole: z.boolean(),
	roleType: roleNamespaceSchema,
	licensed: z.boolean(),
	scopes: z.array(scopeSchema),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
	usedByUsers: z.number().optional(),
});

export type Role = z.infer<typeof roleSchema>;
