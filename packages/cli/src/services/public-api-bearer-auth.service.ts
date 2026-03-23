import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';

import { McpOAuthTokenService } from '@/modules/mcp/mcp-oauth-token.service';

import { EventService } from '@/events/event.service';
import { LastActiveAtService } from './last-active-at.service';

const CLI_AUDIENCE = 'public-api';

@Service()
export class PublicApiBearerAuthService {
	constructor(
		private readonly tokenService: McpOAuthTokenService,
		private readonly eventService: EventService,
		private readonly lastActiveAtService: LastActiveAtService,
	) {}

	getAuthMiddleware(version: string) {
		return async (req: AuthenticatedRequest): Promise<boolean> => {
			const authHeader = req.headers.authorization;
			if (!authHeader?.startsWith('Bearer ')) return false;

			const token = authHeader.slice(7);

			try {
				// verifyAccessToken does JWT signature + audience verification + DB lookup
				const authInfo = await this.tokenService.verifyAccessToken(token, CLI_AUDIENCE);
				const result = await this.tokenService.verifyOAuthAccessToken(token, CLI_AUDIENCE);

				if (!result.user || result.user.disabled) return false;

				req.user = result.user;
				// Store verified scopes on req so scope middleware can read them
				// without re-decoding the JWT (which would bypass signature verification)
				(req as AuthenticatedRequest & { oauthScopes?: string[] }).oauthScopes =
					authInfo.scopes as string[];

				this.eventService.emit('public-api-invoked', {
					userId: result.user.id,
					path: req.path,
					method: req.method,
					apiVersion: version,
					userAgent: req.headers['user-agent'],
				});

				void this.lastActiveAtService.updateLastActiveIfStale(result.user.id);

				return true;
			} catch {
				return false;
			}
		};
	}
}
