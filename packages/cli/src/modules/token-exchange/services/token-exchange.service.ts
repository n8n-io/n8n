import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { JwtService } from '@/services/jwt.service';

import { TokenExchangeConfig } from '../token-exchange.config';
import type {
	ExternalTokenClaims,
	ResolvedTrustedKey,
	TokenExchangeRequest,
} from '../token-exchange.schemas';
import { ExternalTokenClaimsSchema } from '../token-exchange.schemas';
import {
	TOKEN_EXCHANGE_ISSUER,
	type IssuedJwtPayload,
	type IssuedTokenResult,
} from '../token-exchange.types';
import { IdentityResolutionService } from './identity-resolution.service';
import { JtiStoreService } from './jti-store.service';
import { TrustedKeyService } from './trusted-key.service';

const MAX_TOKEN_LIFETIME_SECONDS = 60;
const MIN_REMAINING_LIFETIME_SECONDS = 5;

@Service()
export class TokenExchangeService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly trustedKeyStore: TrustedKeyService,
		private readonly jtiStore: JtiStoreService,
		private readonly identityResolutionService: IdentityResolutionService,
		private readonly config: TokenExchangeConfig,
		private readonly jwtService: JwtService,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	/**
	 * Verify and validate an external JWT subject token.
	 *
	 * Performs the full verification pipeline:
	 * 1. Decode and extract the `kid` from the JWT header
	 * 2. Look up the trusted key source by `kid`
	 * 3. Cryptographically verify the signature
	 * 4. Parse and validate the claims against the expected schema
	 * 5. Optionally enforce maximum token lifetime (for login tokens)
	 * 6. Consume the JTI to prevent replay attacks
	 */
	async verifyToken(
		subjectToken: string,
		{ maxLifetimeSeconds }: { maxLifetimeSeconds?: number } = {},
	): Promise<{ claims: ExternalTokenClaims; resolvedKey: ResolvedTrustedKey }> {
		const decoded = jwt.decode(subjectToken, { complete: true });
		if (!decoded || typeof decoded === 'string') {
			throw new BadRequestError('Invalid token format');
		}

		const { kid } = decoded.header;
		if (!kid) {
			throw new BadRequestError('Token header missing kid');
		}

		const decodedPayload = decoded.payload;
		const iss =
			typeof decodedPayload === 'object' && decodedPayload !== null
				? decodedPayload.iss
				: undefined;
		if (typeof iss !== 'string' || !iss) {
			throw new BadRequestError('Token payload missing iss');
		}

		const resolvedKey = await this.trustedKeyStore.getByKidAndIss(kid, iss);
		if (!resolvedKey) {
			throw new AuthError('Unknown key id');
		}

		let payload: jwt.JwtPayload;
		try {
			const result = jwt.verify(subjectToken, resolvedKey.key, {
				// EdDSA is valid at runtime but missing from @types/jsonwebtoken
				algorithms: resolvedKey.algorithms as jwt.Algorithm[],
				issuer: resolvedKey.issuer,
				audience: resolvedKey.expectedAudience,
				ignoreExpiration: false,
				ignoreNotBefore: false,
			});
			if (typeof result === 'string' || !('iat' in result)) {
				throw new AuthError('Unexpected token format');
			}
			payload = result;
		} catch (error) {
			if (error instanceof AuthError) throw error;
			const message = error instanceof Error ? error.message : 'unknown error';
			this.logger.warn('JWT verification failed', { error: message });
			throw new AuthError('Token verification failed');
		}

		const claims = ExternalTokenClaimsSchema.parse(payload);

		if (maxLifetimeSeconds !== undefined) {
			const tokenLifetime = claims.exp - claims.iat;
			if (tokenLifetime > maxLifetimeSeconds) {
				throw new AuthError('Token lifetime exceeds maximum allowed');
			}
		}

		const consumed = await this.jtiStore.consume(claims.jti, new Date(claims.exp * 1000));
		if (!consumed) {
			throw new AuthError('Token has already been used');
		}

		return { claims, resolvedKey };
	}

	async embedLogin(
		subjectToken: string,
	): Promise<{ user: User; subject: string; issuer: string; kid: string }> {
		const { claims, resolvedKey } = await this.verifyToken(subjectToken, {
			maxLifetimeSeconds: MAX_TOKEN_LIFETIME_SECONDS,
		});
		const user = await this.identityResolutionService.resolve(claims, resolvedKey.allowedRoles, {
			kid: resolvedKey.kid,
			issuer: resolvedKey.issuer,
		});
		return { user, subject: claims.sub, issuer: resolvedKey.issuer, kid: resolvedKey.kid };
	}

	async exchange(request: TokenExchangeRequest): Promise<IssuedTokenResult> {
		const subjectClaims = await this.verifyToken(request.subject_token);
		const actorClaims = request.actor_token
			? await this.verifyToken(request.actor_token)
			: undefined;

		const actor = actorClaims
			? await this.identityResolutionService.resolve(
					actorClaims.claims,
					actorClaims.resolvedKey.allowedRoles,
					actorClaims.resolvedKey,
				)
			: undefined;
		const subject = await this.identityResolutionService.resolve(
			subjectClaims.claims,
			subjectClaims.resolvedKey.allowedRoles,
			subjectClaims.resolvedKey,
		);

		const now = Math.floor(Date.now() / 1000);

		const maxTtl = this.config.maxTokenTtl;
		const exp = Math.min(
			subjectClaims.claims.exp,
			actorClaims?.claims.exp ?? Infinity,
			now + maxTtl,
		);

		if (exp <= now + MIN_REMAINING_LIFETIME_SECONDS) {
			throw new AuthError('Subject token too close to expiry to issue a new token');
		}

		const resources = request.resource?.split(' ').filter(Boolean);

		const payload: IssuedJwtPayload = {
			iss: TOKEN_EXCHANGE_ISSUER,
			sub: subject.id,
			...(actor && { act: { sub: actor.id } }),
			...(request.scope && { scope: request.scope }),
			...(resources?.length && { resource: resources }),
			iat: now,
			exp,
			jti: randomUUID(),
		};

		const accessToken = this.jwtService.sign(payload);

		return {
			accessToken,
			expiresIn: exp - now,
			subjectUserId: subject.id,
			subject: subjectClaims.claims.sub,
			issuer: subjectClaims.claims.iss,
			actor: actorClaims?.claims.sub,
			actorUserId: actor?.id,
		};
	}
}
