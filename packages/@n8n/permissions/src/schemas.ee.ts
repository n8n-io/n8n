import { z } from 'zod';

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

export const projectRoleSchema = z.enum([...personalRoleSchema.options, ...teamRoleSchema.options]);

export const credentialSharingRoleSchema = z.enum(['credential:owner', 'credential:user']);

export const workflowSharingRoleSchema = z.enum(['workflow:owner', 'workflow:editor']);

const ALL_SCOPES_LOOKUP_SET = new Set(ALL_SCOPES as string[]);

export const roleSchema = z.object({
	slug: z.string().min(1),
	displayName: z.string().min(1),
	description: z.string().nullable(),
	systemRole: z.boolean(),
	roleType: z.enum(['global', 'project', 'workflow', 'credential']),
	licensed: z.boolean(),
	scopes: z.array(z.string().refine((scope) => ALL_SCOPES_LOOKUP_SET.has(scope), 'Invalid scope')),
});

export type Role = z.infer<typeof roleSchema>;
