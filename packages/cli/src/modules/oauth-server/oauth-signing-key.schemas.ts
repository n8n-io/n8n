import { z } from 'zod';

import { EcPublicJwkSchema } from '@/jwks/jwks.schemas';

import {
	OAUTH_SIGNING_ALGORITHM,
	OAUTH_SIGNING_CURVE,
	OAUTH_SIGNING_KEY_USE,
} from './oauth-signing-key.constants';

/**
 * A public access-token signing key in the instance JWKS. Narrows the generic
 * EC shape to `use: 'sig'`, ES256 and P-256. The base shape is `.strict()`,
 * so the private parameter `d` still fails parsing.
 */
export const PublicSigningJwkSchema = EcPublicJwkSchema.extend({
	use: z.literal(OAUTH_SIGNING_KEY_USE),
	alg: z.literal(OAUTH_SIGNING_ALGORITHM),
	crv: z.literal(OAUTH_SIGNING_CURVE),
});
export type PublicSigningJwk = z.infer<typeof PublicSigningJwkSchema>;
