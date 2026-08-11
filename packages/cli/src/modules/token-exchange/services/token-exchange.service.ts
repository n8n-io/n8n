import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import { TokenExchangeAuthError } from '@/modules/identity-substrate/identity-substrate.errors';
import { ExternalTokenVerifierService } from '@/modules/identity-substrate/services/external-token-verifier.service';
import { IdentityResolutionService } from '@/modules/identity-substrate/services/identity-resolution.service';
import { JwtService } from '@/services/jwt.service';

import { TokenExchangeConfig } from '../token-exchange.config';
import type { TokenExchangeRequest } from '../token-exchange.schemas';
import {
	TOKEN_EXCHANGE_ISSUER,
	TokenExchangeFailureReason,
	type IssuedJwtPayload,
	type IssuedTokenResult,
} from '../token-exchange.types';

const MAX_TOKEN_LIFETIME_SECONDS = 60;
const MIN_REMAINING_LIFETIME_SECONDS = 5;

@Service()
export class TokenExchangeService {
	constructor(
		private readonly externalTokenVerifierService: ExternalTokenVerifierService,
		private readonly identityResolutionService: IdentityResolutionService,
		private readonly config: TokenExchangeConfig,
		private readonly jwtService: JwtService,
	) {}

	async embedLogin(
		subjectToken: string,
	): Promise<{ user: User; subject: string; issuer: string; kid: string }> {
		const { claims, resolvedKey } = await this.externalTokenVerifierService.verifyToken(
			subjectToken,
			{ maxLifetimeSeconds: MAX_TOKEN_LIFETIME_SECONDS },
		);
		const user = await this.identityResolutionService.resolve(
			claims,
			resolvedKey.allowedRoles,
			{
				kid: resolvedKey.kid,
				issuer: resolvedKey.issuer,
				requireVerifiedEmail: resolvedKey.requireVerifiedEmail,
			},
			true,
		);
		return { user, subject: claims.sub, issuer: resolvedKey.issuer, kid: resolvedKey.kid };
	}

	async exchange(request: TokenExchangeRequest): Promise<IssuedTokenResult> {
		const subjectClaims = await this.externalTokenVerifierService.verifyToken(
			request.subject_token,
		);
		const actorClaims = request.actor_token
			? await this.externalTokenVerifierService.verifyToken(request.actor_token)
			: undefined;

		const actor = actorClaims
			? await this.identityResolutionService.resolve(
					actorClaims.claims,
					actorClaims.resolvedKey.allowedRoles,
					actorClaims.resolvedKey,
					true,
				)
			: undefined;
		const subject = await this.identityResolutionService.resolve(
			subjectClaims.claims,
			subjectClaims.resolvedKey.allowedRoles,
			subjectClaims.resolvedKey,
			true,
		);

		const now = Math.floor(Date.now() / 1000);

		const maxTtl = this.config.maxTokenTtl;
		const exp = Math.min(
			subjectClaims.claims.exp,
			actorClaims?.claims.exp ?? Infinity,
			now + maxTtl,
		);

		if (exp <= now + MIN_REMAINING_LIFETIME_SECONDS) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.TokenNearExpiry,
				'Subject token too close to expiry to issue a new token',
			);
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
