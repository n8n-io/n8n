import { Service } from '@n8n/di';

export type ExternalTokenVerificationFailureReason = 'verifier_not_registered' | 'invalid_token';

export type ExternalVerificationContext = {
	reason: ExternalTokenVerificationFailureReason;
	errorDetails?: string;
};

/** Attested facts from an externally-issued token. No `User`, no principal. */
export interface VerifiedClaim {
	sourceId: string;
	issuer: string;
	subject: string;
	audience: string | string[];
	attributes: Record<string, unknown>;
	expiresAt: Date;
}

/**
 * What the *trust source* says may be done with a verified claim — not an
 * attested fact about the caller, which is why it sits beside the claim
 * rather than inside it.
 *
 * Anything that binds a claim to an n8n user must apply this. Dropping it
 * would silently downgrade a source's `requireVerifiedEmail` and
 * `allowedRoles` to "no restriction" on whichever path forgot to pass it.
 */
export interface VerifiedClaimPolicy {
	kid: string;
	allowedRoles?: string[];
	requireVerifiedEmail: boolean;
}

export type VerifiedClaimResult =
	| { claim: VerifiedClaim; policy: VerifiedClaimPolicy; context?: undefined }
	| { claim: null; policy?: undefined; context: ExternalVerificationContext };

export interface ExternalTokenVerifier {
	/**
	 * `expectedAudience` accepts a single value or a set of acceptable values -
	 * a resource can have several accepted audiences (e.g. a multi-method
	 * webhook trigger), and the token is accepted if its `aud` matches any one
	 * of them.
	 */
	verifyExternalToken(
		token: string,
		expectedAudience: string | string[],
	): Promise<VerifiedClaimResult>;

	/**
	 * Same verification, but against the audience this instance accepts for
	 * inbound tokens on surfaces with no protected resource to resolve a
	 * per-surface audience from. Keeps that decision inside the module that
	 * owns inbound identity, so callers don't each have to know what to
	 * expect.
	 */
	verifyInboundToken(token: string): Promise<VerifiedClaimResult>;
}

/**
 * Lets modules verify externally-issued tokens without importing
 * `token-exchange` directly — same pattern as `OAuthTokenVerifierProxy`.
 */
@Service()
export class ExternalTokenVerifierProxy implements ExternalTokenVerifier {
	private provider: ExternalTokenVerifier | null = null;

	registerProvider(provider: ExternalTokenVerifier): void {
		this.provider = provider;
	}

	async verifyExternalToken(
		token: string,
		expectedAudience: string | string[],
	): Promise<VerifiedClaimResult> {
		if (!this.provider) {
			return this.notRegistered();
		}
		return await this.provider.verifyExternalToken(token, expectedAudience);
	}

	async verifyInboundToken(token: string): Promise<VerifiedClaimResult> {
		if (!this.provider) {
			return this.notRegistered();
		}
		return await this.provider.verifyInboundToken(token);
	}

	private notRegistered(): VerifiedClaimResult {
		return {
			claim: null,
			context: {
				reason: 'verifier_not_registered',
				errorDetails: 'No external token verifier is registered on this instance',
			},
		};
	}
}
