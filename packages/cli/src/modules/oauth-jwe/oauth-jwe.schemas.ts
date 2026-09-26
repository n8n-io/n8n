import { z } from 'zod';

import { EcPublicJwkSchema, RsaPublicJwkSchema } from '@/jwks/jwks.schemas';

import { JWE_EC_ALGORITHMS, JWE_KEY_USE, JWE_RSA_ALGORITHMS } from './oauth-jwe.constants';

/**
 * A single public JWE key in the instance JWKS. Narrows the generic JWKS
 * shapes to `use: 'enc'` and the JWE algorithms this module supports. The
 * base shapes are `.strict()`, so private parameters still fail parsing.
 */
export const PublicJweJwkSchema = z.discriminatedUnion('kty', [
	RsaPublicJwkSchema.extend({
		use: z.literal(JWE_KEY_USE),
		alg: z.enum(JWE_RSA_ALGORITHMS),
	}),
	EcPublicJwkSchema.extend({
		use: z.literal(JWE_KEY_USE),
		alg: z.enum(JWE_EC_ALGORITHMS),
	}),
]);
export type PublicJweJwk = z.infer<typeof PublicJweJwkSchema>;
