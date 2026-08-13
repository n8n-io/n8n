import { z } from 'zod';

import { JWE_EC_ALGORITHMS, JWE_KEY_USE, JWE_RSA_ALGORITHMS } from './oauth-jwe.constants';

/**
 * Public JWK for an RSA key (RFC 7518 §6.3.1). `.strict()` so any private
 * parameter (`d`, `p`, `q`, `dp`, `dq`, `qi`) leaking into the response fails
 * parsing — defence-in-depth on top of the service's allow-list filter.
 */
const RsaPublicJwkSchema = z
	.object({
		kty: z.literal('RSA'),
		kid: z.string().min(1),
		use: z.literal(JWE_KEY_USE),
		alg: z.enum(JWE_RSA_ALGORITHMS),
		n: z.string().min(1),
		e: z.string().min(1),
	})
	.strict();

/**
 * Public JWK for an EC key (RFC 7518 §6.2.1). `.strict()` so the EC private
 * parameter `d` cannot appear in a response.
 */
const EcPublicJwkSchema = z
	.object({
		kty: z.literal('EC'),
		kid: z.string().min(1),
		use: z.literal(JWE_KEY_USE),
		alg: z.enum(JWE_EC_ALGORITHMS),
		crv: z.enum(['P-256', 'P-384', 'P-521']),
		x: z.string().min(1),
		y: z.string().min(1),
	})
	.strict();

/**
 * A single public JWK in the instance JWKS. Discriminated on `kty` so each
 * key type validates only the parameters RFC 7518 §6 defines for it; the
 * inferred TypeScript type narrows on `kty` for consumers.
 */
export const PublicJweJwkSchema = z.discriminatedUnion('kty', [
	RsaPublicJwkSchema,
	EcPublicJwkSchema,
]);
export type PublicJweJwk = z.infer<typeof PublicJweJwkSchema>;

/** JWK Set response (RFC 7517 §5) served by the instance JWKS URI endpoint. */
export const JwksResponseSchema = z.object({
	keys: z.array(PublicJweJwkSchema),
});
export type JwksResponse = z.infer<typeof JwksResponseSchema>;
