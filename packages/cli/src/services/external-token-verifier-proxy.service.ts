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

export type VerifiedClaimResult =
	| { claim: VerifiedClaim; context?: undefined }
	| { claim: null; context: ExternalVerificationContext };

export interface ExternalTokenVerifier {
	verifyExternalToken(token: string, expectedAudience: string): Promise<VerifiedClaimResult>;

	/**
	 * Same verification, but against the audience this instance accepts for
	 * inbound tokens. Keeps that decision inside the module that owns inbound
	 * identity, so callers don't each have to know what to expect.
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

	async verifyExternalToken(token: string, expectedAudience: string): Promise<VerifiedClaimResult> {
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
