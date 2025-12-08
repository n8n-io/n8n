import { z } from 'zod';

export const credentialResolverIdSchema = z.string().max(36);
export const credentialResolverNameSchema = z.string().trim().min(1).max(255);
export const credentialResolverTypeSchema = z.string().trim().min(1).max(255);
export const credentialResolverConfigSchema = z.record(z.unknown());

export const credentialResolverSchema = z.object({
	id: credentialResolverIdSchema,
	name: credentialResolverNameSchema,
	type: credentialResolverTypeSchema,
	config: z.string(), // Encrypted config
	decryptedConfig: credentialResolverConfigSchema.optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const credentialResolversSchema = z.array(credentialResolverSchema);

export type CredentialResolver = z.infer<typeof credentialResolverSchema>;
