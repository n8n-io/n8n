import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import jwt from 'jsonwebtoken';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { ExternalTokenClaims, ResolvedTrustedKey } from '../token-exchange.schemas';
import { ExternalTokenClaimsSchema } from '../token-exchange.schemas';
import { IdentityResolutionService } from './identity-resolution.service';
import { JtiStoreService } from './jti-store.service';
import { TrustedKeyService } from './trusted-key.service';

const MAX_TOKEN_LIFETIME_SECONDS = 60;

@Service()
export class TokenExchangeService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly trustedKeyStore: TrustedKeyService,
		private readonly jtiStore: JtiStoreService,
		private readonly identityResolutionService: IdentityResolutionService,
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

		const resolvedKey = await this.trustedKeyStore.getByKid(kid);
		if (!resolvedKey) {
			throw new AuthError('Unknown key id');
		}

		let payload: jwt.JwtPayload;
		try {
			const result = jwt.verify(subjectToken, resolvedKey.key, {
				algorithms: resolvedKey.algorithms,
				issuer: resolvedKey.issuer,
				audience: resolvedKey.expectedAudience,
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

	async embedLogin(subjectToken: string): Promise<User> {
		const { claims, resolvedKey } = await this.verifyToken(subjectToken, {
			maxLifetimeSeconds: MAX_TOKEN_LIFETIME_SECONDS,
		});
		return await this.identityResolutionService.resolve(claims, resolvedKey.allowedRoles, {
			kid: resolvedKey.kid,
			issuer: resolvedKey.issuer,
		});
	}
}
