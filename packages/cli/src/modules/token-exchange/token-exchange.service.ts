import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import { JwtService } from '@/services/jwt.service';

import {
	ExternalTokenClaimsSchema,
	type ExternalTokenClaims,
	type TokenExchangeRequest,
} from './token-exchange.schemas';
import type { IssuedJwtPayload, IssuedTokenResult } from './token-exchange.types';

@Service()
export class TokenExchangeService {
	private static readonly ISSUER = 'n8n';

	private readonly jwtService = Container.get(JwtService);

	private readonly globalConfig = Container.get(GlobalConfig);

	async exchange(request: TokenExchangeRequest): Promise<IssuedTokenResult> {
		const subjectClaims = this.decodeAndValidate(request.subject_token);
		const actorClaims = request.actor_token
			? this.decodeAndValidate(request.actor_token)
			: undefined;

		const now = Math.floor(Date.now() / 1000);
		const maxTtl = this.globalConfig.tokenExchange.maxTokenTtl;
		const exp = Math.min(subjectClaims.exp, actorClaims?.exp ?? Infinity, now + maxTtl);

		const scopes = request.scope?.split(' ').filter(Boolean);

		const payload: IssuedJwtPayload = {
			iss: TokenExchangeService.ISSUER,
			sub: subjectClaims.sub,
			...(actorClaims && { act: { sub: actorClaims.sub } }),
			...(scopes?.length && { scope: scopes }),
			...(request.resource && { resource: request.resource }),
			iat: now,
			exp,
			jti: randomUUID(),
		};

		const accessToken = this.jwtService.sign(payload);

		return {
			accessToken,
			expiresIn: exp - now,
			subject: subjectClaims.sub,
			issuer: subjectClaims.iss,
			actor: actorClaims?.sub,
		};
	}

	private decodeAndValidate(token: string): ExternalTokenClaims {
		const decoded = this.jwtService.decode<unknown>(token);
		return ExternalTokenClaimsSchema.parse(decoded);
	}
}
