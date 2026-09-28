import { z } from 'zod';

import { RsaPublicJwkSchema } from '@/jwks/jwks.schemas';

import { OAUTH_SIGNING_ALGORITHM, OAUTH_SIGNING_KEY_USE } from './oauth-signing-key.constants';

/**
 * A public access-token signing key in the instance JWKS. Narrows the generic
 * RSA shape to `use: 'sig'` and RS256. The base shape is `.strict()`, so
 * private parameters still fail parsing.
 */
export const PublicSigningJwkSchema = RsaPublicJwkSchema.extend({
	use: z.literal(OAUTH_SIGNING_KEY_USE),
	alg: z.literal(OAUTH_SIGNING_ALGORITHM),
});
export type PublicSigningJwk = z.infer<typeof PublicSigningJwkSchema>;
