import { z } from 'zod';

export const trustedKeySourceStatusSchema = z.enum(['pending', 'healthy', 'error']);
export const trustedKeySourceManagedBySchema = z.enum(['env-config', 'sso-derived', 'api']);

const staticTrustedKeyConfigSchema = z.object({
	kid: z.string(),
	algorithms: z.array(z.string()),
	issuer: z.string(),
	expectedAudience: z.string().optional(),
	allowedRoles: z.array(z.string()).optional(),
	requireVerifiedEmail: z.boolean().optional(),
});

const jwksTrustedKeyConfigSchema = z.object({
	url: z.string(),
	issuer: z.string(),
	cacheTtlSeconds: z.number().optional(),
	expectedAudience: z.string().optional(),
	allowedRoles: z.array(z.string()).optional(),
	requireVerifiedEmail: z.boolean().optional(),
});

const trustedKeySourceBaseSchema = z.object({
	id: z.string(),
	issuer: z.string().nullable(),
	status: trustedKeySourceStatusSchema,
	lastError: z.string().nullable(),
	lastRefreshedAt: z.coerce.date().nullable(),
	managedBy: trustedKeySourceManagedBySchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

/**
 * Sanitized view of a trusted key source — mirrors `TrustedKeySourceEntity`
 * in `n8n-cli`'s token-exchange module, minus the raw key material, which is
 * never sent to the frontend.
 *
 * A 'static' source groups every inline key configured via env var under one
 * row, so its `config` is an array; a 'jwks' source is a single remote
 * endpoint, so its `config` is a single object.
 */
export const trustedKeySourceSchema = z.discriminatedUnion('type', [
	trustedKeySourceBaseSchema.extend({
		type: z.literal('static'),
		config: z.array(staticTrustedKeyConfigSchema),
	}),
	trustedKeySourceBaseSchema.extend({
		type: z.literal('jwks'),
		config: jwksTrustedKeyConfigSchema,
	}),
]);

export const trustedKeySourcesSchema = z.array(trustedKeySourceSchema);

export type TrustedKeySource = z.infer<typeof trustedKeySourceSchema>;
