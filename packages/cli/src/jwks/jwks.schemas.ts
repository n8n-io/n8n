import { z } from 'zod';

const JWK_USES = ['enc', 'sig'] as const;

/**
 * Public JWK for an RSA key (RFC 7518 §6.3.1). `.strict()` so any private
 * parameter (`d`, `p`, `q`, `dp`, `dq`, `qi`) leaking into the response fails
 * parsing.
 */
export const RsaPublicJwkSchema = z
	.object({
		kty: z.literal('RSA'),
		kid: z.string().min(1),
		use: z.enum(JWK_USES),
		alg: z.string().min(1),
		n: z.string().min(1),
		e: z.string().min(1),
	})
	.strict();

/**
 * Public JWK for an EC key (RFC 7518 §6.2.1). `.strict()` so the EC private
 * parameter `d` cannot appear in a response.
 */
export const EcPublicJwkSchema = z
	.object({
		kty: z.literal('EC'),
		kid: z.string().min(1),
		use: z.enum(JWK_USES),
		alg: z.string().min(1),
		crv: z.enum(['P-256', 'P-384', 'P-521']),
		x: z.string().min(1),
		y: z.string().min(1),
	})
	.strict();

/**
 * A single public JWK in the instance JWKS, for encryption or signing.
 * Discriminated on `kty` so each key type validates only the parameters
 * RFC 7518 §6 defines for it. Providers apply stricter rules for their own
 * keys, e.g. the allowed `alg` values.
 */
export const PublicJwkSchema = z.discriminatedUnion('kty', [RsaPublicJwkSchema, EcPublicJwkSchema]);
export type PublicJwk = z.infer<typeof PublicJwkSchema>;

/** JWK Set response (RFC 7517 §5) served by the instance JWKS URI endpoint. */
export const JwksResponseSchema = z.object({
	keys: z.array(PublicJwkSchema),
});
export type JwksResponse = z.infer<typeof JwksResponseSchema>;
