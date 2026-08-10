import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import jwt from 'jsonwebtoken';

import { InboundAudienceService } from '@/modules/token-exchange/context-establishment-hooks/inbound-audience.service';
import {
	TokenExchangeAuthError,
	TokenExchangeRequestError,
} from '@/modules/token-exchange/token-exchange.errors';
import type {
	ExternalTokenClaims,
	ResolvedTrustedKey,
	ResourceServerTokenClaims,
} from '@/modules/token-exchange/token-exchange.schemas';
import {
	ExternalTokenClaimsSchema,
	ResourceServerTokenClaimsSchema,
} from '@/modules/token-exchange/token-exchange.schemas';
import { TokenExchangeFailureReason } from '@/modules/token-exchange/token-exchange.types';
import type {
	ExternalTokenVerifier,
	VerifiedClaimResult,
} from '@/services/external-token-verifier-proxy.service';

import { JtiStoreService } from './jti-store.service';
import { TrustedKeyService } from './trusted-key.service';

/**
 * Verifies externally-issued JWTs against trusted key sources.
 *
 * This is the verify primitive `InboundClaimVerificationHook` calls on every
 * context establishment (via `ExternalTokenVerifierProxy`), and the one the
 * token-exchange consumer's `embedLogin()`/`exchange()` build on. Registered
 * as the `ExternalTokenVerifierProxy` provider by `IdentitySubstrateModule`
 * so it verifies even when the RFC 8693 consumer module is disabled or
 * unlicensed.
 */
@Service()
export class ExternalTokenVerifierService implements ExternalTokenVerifier {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly trustedKeyStore: TrustedKeyService,
		private readonly jtiStore: JtiStoreService,
		private readonly inboundAudienceService: InboundAudienceService,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	/**
	 * Some IdPs put a mutable identifier (e.g. the user's login) in `sub` on
	 * access tokens, while an immutable one lives in a differently-named
	 * claim (e.g. Okta's `uid`). When a trust source configures
	 * `subjectClaim`, its value substitutes for `sub` so every downstream
	 * consumer - the SSO bridge, qualified-sub binding, JIT provisioning -
	 * keys on the stable identifier without needing to know about this.
	 */
	private resolveEffectiveSubject(payload: jwt.JwtPayload, subjectClaim: string): string {
		const configuredSubject: unknown = payload[subjectClaim];
		if (typeof configuredSubject !== 'string' || !configuredSubject) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.InvalidClaims,
				`Configured subject claim '${subjectClaim}' is missing or not a string`,
			);
		}
		return configuredSubject;
	}

	/**
	 * The `aud` values `jwt.verify` will accept (it matches if any one of a
	 * set matches).
	 *
	 * A caller that states an `expectedAudience` is verifying a token
	 * presented inbound to n8n, so the source's own `inboundAudiences` count
	 * too — that's how an admin says "this issuer stamps *this* audience on
	 * tokens meant for us", scoped to one trust source instead of instance-
	 * wide. Without the caller's expectation this is the plain exchange path,
	 * which stays on the source's `expectedAudience` alone: an inbound
	 * audience must never widen what the exchange endpoint accepts.
	 *
	 * Returns `undefined` only when nothing is configured anywhere, which
	 * `jwt.verify` reads as "skip the audience check". That is safe for the
	 * exchange path (JTI replay protection applies there); the `consumeJti:
	 * false` overload separately requires an `expectedAudience`, so it can
	 * never reach that case.
	 */
	private acceptedAudiences(
		expectedAudience: string | string[] | undefined,
		hasExpectedAudience: boolean,
		resolvedKey: ResolvedTrustedKey,
	): string | string[] | undefined {
		if (!hasExpectedAudience) return resolvedKey.expectedAudience;
		const expected =
			expectedAudience === undefined
				? []
				: Array.isArray(expectedAudience)
					? expectedAudience
					: [expectedAudience];
		return [...new Set([...expected, ...(resolvedKey.inboundAudiences ?? [])])];
	}

	/**
	 * Verify and validate an external JWT subject token.
	 *
	 * Performs the full verification pipeline:
	 * 1. Decode and extract the `kid` from the JWT header
	 * 2. Look up the trusted key source by `kid`
	 * 3. Cryptographically verify the signature (audience: `expectedAudience`,
	 *    falling back to the trust source's configured audience)
	 * 4. Parse and validate the claims against the expected schema
	 * 5. Optionally enforce maximum token lifetime (for login tokens)
	 * 6. Consume the JTI to prevent replay attacks, unless `consumeJti` is `false`
	 *
	 * `consumeJti: false` is for callers that present the same token on every
	 * request (e.g. a resource server validating a bearer token) rather than a
	 * one-shot exchange — such callers can't use JTI-based replay protection, so
	 * `expectedAudience` becomes mandatory instead: `jsonwebtoken` silently skips
	 * audience validation when `audience` is `undefined`, and a caller that can't
	 * rely on replay protection must not also silently skip audience checks.
	 *
	 * `expectedAudience` accepts a single value or a set of acceptable values -
	 * a resource can have several accepted audiences (e.g. a multi-method
	 * webhook trigger unions every method's URL), and the token is accepted if
	 * its `aud` matches any one of them.
	 */
	async verifyToken(
		subjectToken: string,
		options?: {
			expectedAudience?: string | string[];
			consumeJti?: true;
			requireJti?: true;
			maxLifetimeSeconds?: number;
		},
	): Promise<{ claims: ExternalTokenClaims; resolvedKey: ResolvedTrustedKey }>;
	async verifyToken(
		subjectToken: string,
		options: {
			expectedAudience: string | string[];
			consumeJti: false;
			requireJti?: boolean;
			maxLifetimeSeconds?: number;
		},
	): Promise<{
		claims: ExternalTokenClaims | ResourceServerTokenClaims;
		resolvedKey: ResolvedTrustedKey;
	}>;
	async verifyToken(
		subjectToken: string,
		{
			expectedAudience,
			consumeJti = true,
			requireJti = true,
			maxLifetimeSeconds,
		}: {
			expectedAudience?: string | string[];
			consumeJti?: boolean;
			requireJti?: boolean;
			maxLifetimeSeconds?: number;
		} = {},
	): Promise<{
		claims: ExternalTokenClaims | ResourceServerTokenClaims;
		resolvedKey: ResolvedTrustedKey;
	}> {
		const hasExpectedAudience =
			expectedAudience !== undefined &&
			(!Array.isArray(expectedAudience) || expectedAudience.length > 0);
		if (!consumeJti && !hasExpectedAudience) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.AudienceRequired,
				'expectedAudience is required when JTI consumption is disabled',
			);
		}

		const decoded = jwt.decode(subjectToken, { complete: true });
		if (!decoded || typeof decoded === 'string') {
			throw new TokenExchangeRequestError(
				TokenExchangeFailureReason.InvalidFormat,
				'Invalid token format',
			);
		}

		const { kid } = decoded.header;
		if (!kid) {
			throw new TokenExchangeRequestError(
				TokenExchangeFailureReason.MissingKid,
				'Token header missing kid',
			);
		}

		const decodedPayload = decoded.payload;
		const iss =
			typeof decodedPayload === 'object' && decodedPayload !== null
				? decodedPayload.iss
				: undefined;
		if (typeof iss !== 'string' || !iss) {
			throw new TokenExchangeRequestError(
				TokenExchangeFailureReason.MissingIss,
				'Token payload missing iss',
			);
		}

		const resolvedKey = await this.trustedKeyStore.getByKidAndIss(kid, iss);
		if (!resolvedKey) {
			throw new TokenExchangeAuthError(TokenExchangeFailureReason.UnknownKey, 'Unknown key id');
		}

		let payload: jwt.JwtPayload;
		try {
			const result = jwt.verify(subjectToken, resolvedKey.key, {
				// EdDSA is valid at runtime but missing from @types/jsonwebtoken
				algorithms: resolvedKey.algorithms as jwt.Algorithm[],
				issuer: resolvedKey.issuer,
				audience: this.toVerifyAudience(
					this.acceptedAudiences(expectedAudience, hasExpectedAudience, resolvedKey),
				),
				ignoreExpiration: false,
				ignoreNotBefore: false,
			});
			if (typeof result === 'string' || !('iat' in result)) {
				throw new TokenExchangeAuthError(
					TokenExchangeFailureReason.InvalidFormat,
					'Unexpected token format',
				);
			}
			payload = result;
		} catch (error) {
			if (error instanceof TokenExchangeAuthError) throw error;
			const message = error instanceof Error ? error.message : 'unknown error';
			this.logger.warn('JWT verification failed', { error: message });
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.InvalidSignature,
				'Token verification failed',
			);
		}

		const claims = requireJti
			? ExternalTokenClaimsSchema.parse(payload)
			: ResourceServerTokenClaimsSchema.parse(payload);

		if (resolvedKey.subjectClaim !== 'sub') {
			claims.sub = this.resolveEffectiveSubject(payload, resolvedKey.subjectClaim);
		}

		if (maxLifetimeSeconds !== undefined) {
			const tokenLifetime = claims.exp - claims.iat;
			if (tokenLifetime > maxLifetimeSeconds) {
				throw new TokenExchangeAuthError(
					TokenExchangeFailureReason.TokenTooLong,
					'Token lifetime exceeds maximum allowed',
				);
			}
		}

		if (consumeJti) {
			if (!claims.jti) {
				throw new TokenExchangeAuthError(
					TokenExchangeFailureReason.InvalidClaims,
					'Token missing jti required for replay protection',
				);
			}
			const consumed = await this.jtiStore.consume(claims.jti, new Date(claims.exp * 1000));
			if (!consumed) {
				throw new TokenExchangeAuthError(
					TokenExchangeFailureReason.TokenReplay,
					'Token has already been used',
				);
			}
		}

		return { claims, resolvedKey };
	}

	/**
	 * `jsonwebtoken`'s `VerifyOptions.audience` wants a non-empty tuple, not a
	 * general array, so a plain `string[]` doesn't structurally satisfy it even
	 * though it's runtime-equivalent. `hasExpectedAudience` already guarantees
	 * a non-empty array reaches here for the call-parameter case; the
	 * source-level fallback is always a single string or undefined.
	 */
	private toVerifyAudience(audience: string | string[] | undefined): jwt.VerifyOptions['audience'] {
		if (audience === undefined || typeof audience === 'string') return audience;
		const [first, ...rest] = audience;
		return [first, ...rest];
	}

	/** Registered as the `ExternalTokenVerifierProxy` provider on module init. Never throws. */
	async verifyExternalToken(
		token: string,
		expectedAudience: string | string[],
	): Promise<VerifiedClaimResult> {
		try {
			const { claims, resolvedKey } = await this.verifyToken(token, {
				expectedAudience,
				consumeJti: false,
				requireJti: false,
			});
			const { sub, iss, aud, iat, exp, jti, ...attributes } = claims;

			return {
				claim: {
					sourceId: resolvedKey.sourceId,
					issuer: iss,
					subject: sub,
					audience: aud,
					attributes,
					expiresAt: new Date(exp * 1000),
				},
				policy: {
					kid: resolvedKey.kid,
					allowedRoles: resolvedKey.allowedRoles,
					requireVerifiedEmail: resolvedKey.requireVerifiedEmail,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown error';
			this.logger.warn('External token verification failed', { error: message });
			return { claim: null, context: { reason: 'invalid_token', errorDetails: message } };
		}
	}

	/**
	 * Verify an inbound token against the audience this instance accepts for
	 * inbound identity. Same decision as the context-establishment hook, so a
	 * token that establishes a claim on a webhook also verifies on the
	 * credential-connect routes.
	 */
	async verifyInboundToken(token: string): Promise<VerifiedClaimResult> {
		return await this.verifyExternalToken(token, this.inboundAudienceService.getExpectedAudience());
	}
}
