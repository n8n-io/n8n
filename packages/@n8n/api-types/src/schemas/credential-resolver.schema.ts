import { z } from 'zod';

/**
 * Stable, well-known id of the system-managed N8N self-connect credential resolver
 * seeded during module init. Used as the default selection in the workflow-settings
 * resolver dropdown when no resolver has been chosen.
 */
export const SYSTEM_RESOLVER_ID = 'system-n8n';

export const credentialResolverIdSchema = z.string().max(36);
export const credentialResolverNameSchema = z.string().trim().min(1).max(255);
export const credentialResolverTypeNameSchema = z.string().trim().min(1).max(255);
export const credentialResolverConfigSchema = z.record(z.unknown());

export const credentialResolverSchema = z.object({
	id: credentialResolverIdSchema,
	name: credentialResolverNameSchema,
	type: credentialResolverTypeNameSchema,
	config: z.string(), // Encrypted config
	decryptedConfig: credentialResolverConfigSchema.optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const credentialResolverTypeSchema = z.object({
	name: credentialResolverTypeNameSchema,
	displayName: z.string().trim().min(1).max(255),
	description: z.string().trim().max(1024).optional(),
	options: z.array(z.record(z.unknown())).optional(),
});

export const credentialResolverTypesSchema = z.array(credentialResolverTypeSchema);

export type CredentialResolverType = z.infer<typeof credentialResolverTypeSchema>;

export const credentialResolversSchema = z.array(credentialResolverSchema);

export type CredentialResolver = z.infer<typeof credentialResolverSchema>;

export const credentialResolverAffectedWorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export const credentialResolverAffectedWorkflowsSchema = z.array(
	credentialResolverAffectedWorkflowSchema,
);

export type CredentialResolverAffectedWorkflow = z.infer<
	typeof credentialResolverAffectedWorkflowSchema
>;
