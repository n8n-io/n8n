import { z } from 'zod';

import { PROJECT_OWNER_ROLE_SLUG } from './constants.ee';
import { ALL_SCOPES } from './scope-information';

export const roleNamespaceSchema = z.enum(['global', 'project', 'credential', 'workflow']);

export const globalRoleSchema = z.enum(['global:owner', 'global:admin', 'global:member']);

export const assignableGlobalRoleSchema = globalRoleSchema.exclude([
	'global:owner', // Owner cannot be changed
]);

export const personalRoleSchema = z.enum([
	'project:personalOwner', // personalOwner is only used for personal projects
]);

export const teamRoleSchema = z.enum(['project:admin', 'project:editor', 'project:viewer']);

export const customRoleSchema = z.string().refine((val) => val !== PROJECT_OWNER_ROLE_SLUG, {
	message: `'${PROJECT_OWNER_ROLE_SLUG}' is not assignable`,
});

export const projectRoleSchema = z.union([personalRoleSchema, teamRoleSchema]);

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
});

export type Role = z.infer<typeof roleSchema>;
