import { z } from 'zod';

import { PROJECT_OWNER_ROLE_SLUG } from './constants.ee';

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
