import { z } from 'zod';

import type { AuthenticatedCaller, IdentityVerifier } from './identity.types';
import {
	MIN_SECRET_LENGTH,
	signSharedSecretToken,
	verifySharedSecretToken,
	type SharedSecretTokenSpec,
} from './shared-secret-token';

export { MIN_SECRET_LENGTH };

/** The token the control plane presents to the engine. */
export const IDENTITY_TOKEN: SharedSecretTokenSpec = Object.freeze({
	issuer: 'n8n-cp',
	audience: 'n8n-engine-dp',
	ttlSeconds: 60,
	clockToleranceSeconds: 30,
});

const identityClaimsSchema = z.object({
	sub: z.string().min(1),
	tenant_id: z.string().min(1),
	iat: z.number().int(),
	exp: z.number().int(),
});

/** Every rejection path throws this one type, so the middleware cannot leak which check failed. */
export class InvalidIdentityTokenError extends Error {}

/** Signs an identity token the engine's {@link SharedSecretIdentityVerifier} accepts. */
export function mintIdentityToken(secret: string, caller: AuthenticatedCaller): string {
	return signSharedSecretToken(IDENTITY_TOKEN, secret, {
		sub: caller.cpId,
		tenant_id: caller.tenantId,
	});
}

/** Verifies an identity token against a shared secret. The trust source for CP → DP today. */
export class SharedSecretIdentityVerifier implements IdentityVerifier {
	constructor(private readonly secret: string) {
		if (!secret || secret.length < MIN_SECRET_LENGTH) {
			throw new Error(`Identity verifier secret must be at least ${MIN_SECRET_LENGTH} chars`);
		}
	}

	verify(token: string): AuthenticatedCaller {
		const claims = verifySharedSecretToken(
			IDENTITY_TOKEN,
			this.secret,
			token,
			identityClaimsSchema,
		);
		if (!claims) throw new InvalidIdentityTokenError();

		return { cpId: claims.sub, tenantId: claims.tenant_id };
	}
}
