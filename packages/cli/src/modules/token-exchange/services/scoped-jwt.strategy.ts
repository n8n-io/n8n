import type { AuthenticatedRequest, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import type { AuthStrategy } from '@/services/auth-strategy.types';
import { JwtService } from '@/services/jwt.service';

import { ALL_API_KEY_SCOPES } from '@n8n/permissions';
import { TOKEN_EXCHANGE_ISSUER, type IssuedJwtPayload } from '../token-exchange.types';

const BEARER_PREFIX = 'Bearer ';
const API_KEY_HEADER = 'x-n8n-api-key';

@Service()
export class ScopedJwtStrategy implements AuthStrategy {
	constructor(
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
	) {}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		// 1. Extract token from Authorization: Bearer or x-n8n-api-key header
		const token = this.extractToken(req);
		if (!token) return null;

		// 2. Decode (unverified) — check iss before expensive signature verification
		const decoded = this.jwtService.decode<IssuedJwtPayload>(token);
		if (!decoded || decoded.iss !== TOKEN_EXCHANGE_ISSUER) {
			return null; // Not a token-exchange JWT — pass to next strategy
		}

		// 3. Verify signature + expiry
		let payload: IssuedJwtPayload;
		try {
			payload = this.jwtService.verify<IssuedJwtPayload>(token, {
				issuer: TOKEN_EXCHANGE_ISSUER,
			});
		} catch (error) {
			if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
				return false;
			}
			throw error;
		}

		// 4. Resolve subject (sub claim)
		const subject = await this.findUser(payload.sub);
		if (!subject || subject.disabled) return false;

		// 5. Resolve actor (act.sub claim) if present — actor is optional;
		//    a missing actor is not an error, but a disabled actor is.
		let actor: User | undefined;
		if (payload.act) {
			const found = await this.findUser(payload.act.sub);
			if (found?.disabled) return false;
			actor = found ?? undefined;
		}

		// 6. Acting principal: actor (if resolved) or subject
		const actingUser = actor ?? subject;

		// 7. Scopes come from the acting user's role (role.scopes is eager: true)
		req.tokenGrant = {
			scopes: actingUser.role.scopes.map((s) => s.slug),
			apiKeyScopes: Array.from(ALL_API_KEY_SCOPES),
			subject,
			...(actor && { actor }),
		};

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
