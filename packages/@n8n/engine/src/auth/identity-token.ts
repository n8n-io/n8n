import jwt from 'jsonwebtoken';
import { z } from 'zod';

import type { AuthenticatedCaller, IdentityVerifier } from './identity.types';

export const IDENTITY_ISSUER = 'n8n-cp';
export const IDENTITY_AUDIENCE = 'n8n-engine-dp';
export const IDENTITY_TOKEN_TTL_SECONDS = 60;
export const MIN_SECRET_LENGTH = 32;

const identityClaimsSchema = z.object({
	sub: z.string().min(1),
	tenant_id: z.string().min(1),
});

/** Every rejection path throws this one type, so the middleware cannot leak which check failed. */
export class InvalidIdentityTokenError extends Error {}

/** Signs an identity token the engine's {@link SharedSecretIdentityVerifier} accepts. */
export function mintIdentityToken(secret: string, caller: AuthenticatedCaller): string {
	return jwt.sign({ sub: caller.cpId, tenant_id: caller.tenantId }, secret, {
		algorithm: 'HS256',
		issuer: IDENTITY_ISSUER,
		audience: IDENTITY_AUDIENCE,
		expiresIn: IDENTITY_TOKEN_TTL_SECONDS,
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
		let claims: unknown;
		try {
			// `algorithms` is pinned: an unpinned verify accepts whatever `alg` the
			// token names, including `none`. `clockTolerance` allows for clock skew
			// between the CP and DP hosts.
			claims = jwt.verify(token, this.secret, {
				algorithms: ['HS256'],
				issuer: IDENTITY_ISSUER,
				audience: IDENTITY_AUDIENCE,
				clockTolerance: 30,
			});
		} catch {
			throw new InvalidIdentityTokenError();
		}

		const parsed = identityClaimsSchema.safeParse(claims);
		if (!parsed.success) throw new InvalidIdentityTokenError();

		return { cpId: parsed.data.sub, tenantId: parsed.data.tenant_id };
	}
}
