import { AuthenticatedRequest, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NextFunction, Response, Request } from 'express';

import { AuthError } from '@/errors/response-errors/auth.error';
import { JwtService } from '@/services/jwt.service';
import { Telemetry } from '@/telemetry';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import { USER_CONNECTED_TO_MCP_EVENT, UNAUTHORIZED_ERROR_MESSAGE } from './mcp.constants';
import { getClientInfo } from './mcp.utils';

/**
 * MCP Server Middleware Service
 * Centralizes authentication for MCP server endpoints
 * Supports both API key and OAuth token validation
 */
@Service()
export class McpServerMiddlewareService {
	constructor(
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
		private readonly mcpAuthTokenService: McpOAuthTokenService,
		private readonly jwtService: JwtService,
		private readonly telemetry: Telemetry,
	) {}

	/**
	 * Get user for a given token (API key or OAuth access token)
	 * Uses JWT metadata to determine token type and route to correct validation
	 */
	async getUserForToken(token: string): Promise<User | null> {
		let decoded: { meta?: { isOAuth?: boolean } };
		try {
			decoded = this.jwtService.decode<{ meta?: { isOAuth?: boolean } }>(token);
		} catch (error) {
			return null;
		}

		if (decoded?.meta?.isOAuth === true) {
			return await this.mcpAuthTokenService.verifyOAuthAccessToken(token);
		}

		return await this.mcpServerApiKeyService.verifyApiKey(token);
	}

	/**
	 * Express middleware for MCP server authentication
	 * Validates Bearer token (OAuth or API key) and attaches user to request
	 */
	getAuthMiddleware() {
		return async (req: Request, res: Response, next: NextFunction) => {
			const authorizationHeader = req.header('authorization');

			if (!authorizationHeader) {
				this.responseWithUnauthorized(res, req);
				return;
			}

			const token = this.extractBearerToken(authorizationHeader);

			if (!token) {
				this.responseWithUnauthorized(res, req);
				return;
			}

			const user = await this.getUserForToken(token);

			if (!user) {
				this.responseWithUnauthorized(res, req);
				return;
			}

			(req as AuthenticatedRequest).user = user;

			next();
		};
	}

	private extractBearerToken(headerValue: string): string | null {
		if (!headerValue.startsWith('Bearer')) {
			throw new AuthError('Invalid authorization header format');
		}

		const tokenMatch = headerValue.match(/^Bearer\s+(.+)$/i);
		if (tokenMatch) {
			return tokenMatch[1];
		}

		throw new AuthError('Invalid authorization header format');
	}

	private responseWithUnauthorized(res: Response, req: Request) {
		this.trackUnauthorizedEvent(req);
		// RFC 6750 Section 3: Include WWW-Authenticate header for 401 responses
		res.header('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
		res.status(401).send({ message: UNAUTHORIZED_ERROR_MESSAGE });
	}

	private trackUnauthorizedEvent(req: Request) {
		const clientInfo = getClientInfo(req);
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, {
			mcp_connection_status: 'error',
			error: UNAUTHORIZED_ERROR_MESSAGE,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
		});
	}
}
