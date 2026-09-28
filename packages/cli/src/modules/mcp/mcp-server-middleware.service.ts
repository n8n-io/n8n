import { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { NextFunction, Response, Request } from 'express';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { AuthError } from '@/errors/response-errors/auth.error';
import { JwtService } from '@/services/jwt.service';
import {
	OAuthTokenVerifierProxy,
	type TelemetryAuthContext,
	type UserWithContext,
} from '@/services/oauth-token-verifier-proxy.service';
import { Telemetry } from '@/telemetry';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpProtectedResource } from './mcp-protected-resource';
import {
	USER_CONNECTED_TO_MCP_EVENT,
	UNAUTHORIZED_ERROR_MESSAGE,
	MCP_ACCESS_DISABLED_ERROR_MESSAGE,
} from './mcp.constants';
import type { McpAuthenticatedRequest } from './mcp.types';
import { getClientInfo, getProtocolVersion, isConnectionHandshake } from './mcp.utils';

/**
 * MCP Server Middleware Service
 * Centralizes authentication for MCP server endpoints
 * Supports both API key and OAuth token validation
 */
@Service()
export class McpServerMiddlewareService {
	constructor(
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
		private readonly oauthTokenVerifier: OAuthTokenVerifierProxy,
		private readonly mcpProtectedResource: McpProtectedResource,
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
			const expectedAudience = this.mcpProtectedResource.getResourceUrl();
			return await this.oauthTokenVerifier.verifyOAuthAccessToken(token, expectedAudience);
		}

		return await this.mcpServerApiKeyService.verifyApiKey(token);
	}

	/**
	 * Express middleware hiding the MCP server while instance MCP access is off.
	 * Answers 404 instead of an authentication challenge, so OAuth-aware clients
	 * don't send their users through a login for a server that isn't there.
	 */
	getEnabledMiddleware() {
		return async (req: Request, res: Response, next: NextFunction) => {
			if (await this.mcpProtectedResource.isAvailable()) {
				next();
				return;
			}

			// Handshakes only — HEAD/GET probes of a hidden server aren't
			// connection attempts worth tracking.
			if (isConnectionHandshake(req.body)) {
				this.trackFailedConnection(req, MCP_ACCESS_DISABLED_ERROR_MESSAGE, 404);
			}

			res.status(404).json({ message: MCP_ACCESS_DISABLED_ERROR_MESSAGE });
		};
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
			const mcpReq = req as McpAuthenticatedRequest;
			mcpReq.mcpCaller = result.caller;
			// undefined for API keys = not scope-bearing → full tool access
			mcpReq.mcpScopes = result.scopes;

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
		this.trackFailedConnection(req, UNAUTHORIZED_ERROR_MESSAGE, 401, context);
		// RFC 6750 Section 3 / RFC 9728 Section 5.1: include the WWW-Authenticate
		// header on 401s, advertising the protected-resource metadata URL so
		// clients discover it directly instead of guessing the well-known path.
		const prmUrl = this.mcpProtectedResource.getProtectedResourceMetadataUrl();
		res.header('WWW-Authenticate', `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"`);
		res.status(401).send({
			message: `${UNAUTHORIZED_ERROR_MESSAGE}${context?.error_details ? ': ' + context.error_details : ''}`,
		});
	}

	// `httpStatus` is a literal, not res.statusCode: tracked before the response is written.
	private trackFailedConnection(
		req: Request,
		error: string,
		httpStatus: number,
		context?: TelemetryAuthContext,
	) {
		const clientInfo = getClientInfo(req);
		const payload = {
			mcp_connection_status: 'error',
			error,
			http_status: httpStatus,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
			protocol_version: getProtocolVersion(req),
			...context,
		};
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}
