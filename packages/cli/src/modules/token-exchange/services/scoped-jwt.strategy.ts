import type { AuthenticatedRequest, TokenGrant, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ALL_API_KEY_SCOPES } from '@n8n/permissions';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import type { AuthStrategy, AuthStrategyOptions } from '@/services/auth-strategy.types';
import { JwtService } from '@/services/jwt.service';

import { TOKEN_EXCHANGE_ISSUER, type IssuedJwtPayload } from '../token-exchange.types';

const BEARER_PREFIX = 'Bearer ';
const API_KEY_HEADER = 'x-n8n-api-key';

@Service()
export class ScopedJwtStrategy implements AuthStrategy {
	constructor(
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
	) {}

	async buildTokenGrant(
		token: string,
		options?: AuthStrategyOptions,
	): Promise<TokenGrant | false | null> {
		if (!token) return null;

		const issuer = options?.issuer ?? TOKEN_EXCHANGE_ISSUER;

		// 1. Decode (unverified) — check iss before expensive signature verification
		const decoded = this.jwtService.decode<IssuedJwtPayload>(token);
		if (!decoded || decoded.iss !== issuer) {
			return null; // Not a token-exchange JWT — pass to next strategy
		}

		// 2. Verify signature + expiry
		let payload: IssuedJwtPayload;
		try {
			payload = this.jwtService.verify<IssuedJwtPayload>(token, {
				issuer,
			});
		} catch (error) {
			if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
				return false;
			}
			throw error;
		}

		// 3. Resolve subject (sub claim)
		const subject = await this.findUser(payload.sub);
		if (!subject || subject.disabled) return false;

		// 4. Resolve actor (act.sub claim) if present — actor is optional;
		//    a missing actor is not an error, but a disabled actor is.
		let actor: User | undefined;
		if (payload.act) {
			const found = await this.findUser(payload.act.sub);
			if (found?.disabled) return false;
			actor = found ?? undefined;
		}

		// 5. Acting principal: actor (if resolved) or subject
		const actingUser = actor ?? subject;

		// 6. Scopes come from the acting user's role (role.scopes is eager: true)
		return {
			scopes: actingUser.role.scopes.map((s) => s.slug),
			apiKeyScopes: Array.from(ALL_API_KEY_SCOPES),
			subject,
			...(actor && { actor }),
		};
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		// 1. Extract token from Authorization: Bearer or x-n8n-api-key header
		const token = this.extractToken(req);
		if (!token) return null;

		// 2. Build token grant
		const tokenGrant = await this.buildTokenGrant(token);

		if (tokenGrant === false || tokenGrant === null) {
			return tokenGrant;
		}

		// 3. Acting principal: actor (if resolved) or subject
		const actingUser = tokenGrant.actor ?? tokenGrant.subject;

		// 6. Setup token grant for request
		req.tokenGrant = tokenGrant;

		req.user = actingUser;

		return true;
	}

	private async findUser(id: string) {
		return await this.userRepository.findOne({
			where: { id },
			relations: { role: true }, // role.scopes is eager: true, auto-loaded
		});
	}

	private extractToken(req: AuthenticatedRequest): string | null {
		const authHeader = req.headers.authorization;
		if (typeof authHeader === 'string' && authHeader.startsWith(BEARER_PREFIX)) {
			const token = authHeader.slice(BEARER_PREFIX.length).trim();
			if (token) return token;
		}

		const apiKeyHeader = req.headers[API_KEY_HEADER];
		if (typeof apiKeyHeader === 'string' && apiKeyHeader) {
			return apiKeyHeader;
		}

		return null;
	}
}
