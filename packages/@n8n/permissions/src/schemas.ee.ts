import { z } from 'zod';

export const roleNamespaceSchema = z.enum(['global', 'project', 'credential', 'workflow']);

export const globalRoleSchema = z.enum(['global:owner', 'global:admin', 'global:member']);

export const assignableGlobalRoleSchema = globalRoleSchema.exclude([
	'global:owner', // Owner cannot be changed
]);

export const personalRoleSchema = z.enum([
	'project:personalOwner', // personalOwner is only used for personal projects
]);

export const teamRoleSchema = z.union([
	z.enum(['project:admin', 'project:editor', 'project:viewer']),
	z.string().refine((val) => val !== 'project:personalOwner', {
		message: "'project:personalOwner' is not assignable",
	}),
]);

export const projectRoleSchema = z.union([personalRoleSchema, teamRoleSchema]);

export const credentialSharingRoleSchema = z.enum(['credential:owner', 'credential:user']);

export const workflowSharingRoleSchema = z.enum(['workflow:owner', 'workflow:editor']);
