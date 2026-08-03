import { inProduction } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { NextFunction, Response, Request, type RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';

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
import { McpConfig } from './mcp.config';
import {
	isRateLimitedWriteTool,
	USER_CONNECTED_TO_MCP_EVENT,
	UNAUTHORIZED_ERROR_MESSAGE,
} from './mcp.constants';
import { getClientInfo, getProtocolVersion } from './mcp.utils';

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
		private readonly mcpConfig: McpConfig,
	) {}

	/**
	 * Second rate-limit layer: a tighter, per-user, per-tool cap for the tools
	 * that trigger executions or heavy creation, keyed off the `Mcp-Name` header.
	 * Runs after auth (so the user is known) and sits on top of the flat per-IP
	 * limit, so it only ever tightens. Only enforced in production, like the flat
	 * limit, so local building is never throttled; a `0` config disables it.
	 */
	getToolRateLimitMiddleware(): RequestHandler {
		const limit = this.mcpConfig.rateLimitWriteTool;
		if (!inProduction || limit <= 0) return (_req, _res, next) => next();

		return expressRateLimit({
			limit,
			windowMs: 5 * Time.minutes.toMilliseconds,
			// Key per user + tool: one client hammering execute_workflow can't
			// exhaust another user's budget or that user's other tools.
			keyGenerator: (req: Request) =>
				`mcp-write:${(req as AuthenticatedRequest).user?.id ?? 'anon'}:${req.header('mcp-name')}`,
			// Only the write tools are capped here; everything else rides the flat limit.
			skip: (req: Request) => !isRateLimitedWriteTool(req.header('mcp-name')),
			standardHeaders: true,
			legacyHeaders: false,
			message: {
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Too many requests for this tool. Try again shortly.' },
				id: null,
			},
		});
	}

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
			const mcpReq = req as AuthenticatedRequest & {
				mcpAuthType?: UserWithContext['authType'];
				mcpScopes?: string[];
			};
			mcpReq.mcpAuthType = result.authType;
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
		this.trackUnauthorizedEvent(req, context);
		// RFC 6750 Section 3 / RFC 9728 Section 5.1: include the WWW-Authenticate
		// header on 401s, advertising the protected-resource metadata URL so
		// clients discover it directly instead of guessing the well-known path.
		const prmUrl = this.mcpProtectedResource.getProtectedResourceMetadataUrl();
		res.header('WWW-Authenticate', `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"`);
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
			protocol_version: getProtocolVersion(req),
			...context,
		};
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}
