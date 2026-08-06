import { z } from 'zod';

export const trustedKeySourceStatusSchema = z.enum(['pending', 'healthy', 'error']);
export const trustedKeySourceManagedBySchema = z.enum(['env-config', 'sso-derived', 'api']);

/**
 * Fields every trusted key config carries, whatever its source type.
 *
 * `inboundAudiences` and `subjectClaim` belong here rather than being
 * omitted: both decide whether a presented token is accepted and who it
 * resolves to, so an admin reviewing the instance's trust configuration has
 * to be able to see them. Zod strips keys it doesn't know about, so a field
 * missing here disappears from the API response without any error.
 */
const trustedKeyConfigBaseSchema = z.object({
	issuer: z.string(),
	expectedAudience: z.string().optional(),
	inboundAudiences: z.array(z.string()).optional(),
	subjectClaim: z.string().optional(),
	allowedRoles: z.array(z.string()).optional(),
	requireVerifiedEmail: z.boolean().optional(),
});

const staticTrustedKeyConfigSchema = trustedKeyConfigBaseSchema.extend({
	kid: z.string(),
	algorithms: z.array(z.string()),
});

const jwksTrustedKeyConfigSchema = trustedKeyConfigBaseSchema.extend({
	url: z.string(),
	cacheTtlSeconds: z.number().optional(),
});

/**
 * Overrides an admin has set on a source, kept separate from `config` in the
 * response for the same reason they're a separate column: `config` is derived
 * and rewritten on every refresh, this is administered and isn't. Showing both
 * lets the UI say which values came from where.
 *
 * An absent field means "no override" — the derived value applies.
 */
export const trustedKeySourcePolicySchema = z.object({
	expectedAudience: z.string().optional(),
	inboundAudiences: z.array(z.string()).optional(),
	subjectClaim: z.string().optional(),
	requireVerifiedEmail: z.boolean().optional(),
	allowedRoles: z.array(z.string()).optional(),
});

export type TrustedKeySourcePolicy = z.infer<typeof trustedKeySourcePolicySchema>;

const trustedKeySourceBaseSchema = z.object({
	id: z.string(),
	issuer: z.string().nullable(),
	status: trustedKeySourceStatusSchema,
	lastError: z.string().nullable(),
	lastRefreshedAt: z.coerce.date().nullable(),
	managedBy: trustedKeySourceManagedBySchema,
	policy: trustedKeySourcePolicySchema.nullable(),
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
