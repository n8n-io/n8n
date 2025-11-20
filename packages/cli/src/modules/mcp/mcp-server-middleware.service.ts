import { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { NextFunction, Response, Request } from 'express';
import { ensureError } from 'n8n-workflow';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import { USER_CONNECTED_TO_MCP_EVENT, UNAUTHORIZED_ERROR_MESSAGE } from './mcp.constants';
import type { TelemetryAuthContext, UserWithContext } from './mcp.types';
import { getClientInfo } from './mcp.utils';

import { AuthError } from '@/errors/response-errors/auth.error';
import { JwtService } from '@/services/jwt.service';
import { Telemetry } from '@/telemetry';

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
	async getUserForToken(token: string): Promise<UserWithContext> {
		let decoded: { meta?: { isOAuth?: boolean } };
		try {
			decoded = this.jwtService.decode<{ meta?: { isOAuth?: boolean } }>(token);
		} catch (error) {
			return {
				user: null,
				context: {
					reason: 'jwt_decode_failed',
					auth_type: 'unknown',
					error_details: ensureError(error).message,
				},
			};
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
				this.responseWithUnauthorized(res, req, {
					reason: 'missing_authorization_header',
					auth_type: 'unknown',
					error_details: 'Authorization header not sent',
				});
				return;
			}

			let token: string;
			try {
				token = this.extractBearerToken(authorizationHeader);
			} catch (er) {
				const error = ensureError(er);
				this.responseWithUnauthorized(res, req, {
					reason: 'invalid_bearer_format',
					auth_type: 'unknown',
					error_details: error.message,
				});
				return;
			}

			const result = await this.getUserForToken(token);
			const user = result.user;

			if (!user) {
				this.responseWithUnauthorized(res, req, result.context);
				return;
			}

			(req as AuthenticatedRequest).user = user;

			next();
		};
	}

	private extractBearerToken(headerValue: string): string {
		if (!headerValue.startsWith('Bearer')) {
			throw new AuthError('Invalid authorization header format - Missing Bearer prefix');
		}

		const tokenMatch = headerValue.match(/^Bearer\s+(.+)$/i);
		if (tokenMatch) {
			return tokenMatch[1];
		}

		throw new AuthError('Invalid authorization header format - Malformed Bearer token');
	}

	private responseWithUnauthorized(res: Response, req: Request, context?: TelemetryAuthContext) {
		this.trackUnauthorizedEvent(req, context);
		// RFC 6750 Section 3: Include WWW-Authenticate header for 401 responses
		res.header('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
		res.status(401).send({
			message: `${UNAUTHORIZED_ERROR_MESSAGE}${context?.error_details ? ': ' + context.error_details : ''}`,
		});
	}

	private trackUnauthorizedEvent(req: Request, context?: TelemetryAuthContext) {
		const clientInfo = getClientInfo(req);
		const payload = {
			mcp_connection_status: 'error',
			error: UNAUTHORIZED_ERROR_MESSAGE,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
			...context,
		};
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}
