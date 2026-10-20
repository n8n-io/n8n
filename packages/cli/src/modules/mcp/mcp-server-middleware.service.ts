import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	extractBearer,
	inboundFrom,
	inboundRequestOf,
	isUrlIssuer,
	ResourceAdmission,
	type Inbound,
	type Refusal,
	type RefusalReason,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import { NextFunction, Response, Request } from 'express';

import { JwtService } from '@n8n/backend-services';
import type { AuthFailureReason, TelemetryAuthContext } from '@n8n/backend-services/auth';
import { Telemetry } from '@/telemetry';

import { McpServerApiKeyService, type McpApiKeyResult } from './mcp-api-key.service';
import { McpProtectedResource } from './mcp-protected-resource';
import {
	USER_CONNECTED_TO_MCP_EVENT,
	UNAUTHORIZED_ERROR_MESSAGE,
	MCP_ACCESS_DISABLED_ERROR_MESSAGE,
} from './mcp.constants';
import type { McpAuthenticatedRequest } from './mcp.types';
import { getClientInfo, getProtocolVersion, isConnectionHandshake } from './mcp.utils';

/** Pipeline reasons that have their own value in the MCP connection telemetry. */
const TELEMETRY_REASONS: Partial<Record<RefusalReason, AuthFailureReason>> = {
	'no-credential': 'missing_authorization_header',
	'malformed-credential': 'invalid_bearer_format',
	'unknown-subject': 'user_not_found',
	insufficient_scope: 'insufficient_scope',
	revoked: 'token_not_found_in_db',
};

/** The pipeline reason goes into `error_details`, so dashboards keep the detail. */
const telemetryOf = (reason: RefusalReason, urlIssuer: boolean): TelemetryAuthContext => ({
	reason: TELEMETRY_REASONS[reason] ?? 'invalid_token',
	auth_type: urlIssuer ? 'oauth' : 'unknown',
	error_details: reason,
});

/**
 * The telemetry for a request whose header carries no bearer, as it was before the pipeline.
 * `extractBearer` reports a missing header as `no-credential` and any other header as malformed.
 */
function headerDenial(header: string | undefined): TelemetryAuthContext {
	if (header === undefined) {
		return {
			reason: 'missing_authorization_header',
			auth_type: 'unknown',
			error_details: 'Authorization header not sent',
		};
	}
	const problem = /^bearer(\s|$)/i.test(header)
		? 'Malformed Bearer token'
		: 'Missing Bearer prefix';
	return {
		reason: 'invalid_bearer_format',
		auth_type: 'unknown',
		error_details: `Invalid authorization header format - ${problem}`,
	};
}

/**
 * MCP Server Middleware Service
 * Centralizes authentication for MCP server endpoints. An MCP API key or a token-exchange JWT
 * goes through `McpServerApiKeyService`. An OAuth2 access token from any trusted source that
 * accepts the `instance-mcp` surface goes through the inbound-auth pipeline.
 */
@Service()
export class McpServerMiddlewareService {
	constructor(
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
		private readonly mcpProtectedResource: McpProtectedResource,
		private readonly admission: ResourceAdmission,
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
	) {}

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
	 * Express middleware for MCP server authentication. Routes the bearer on its `iss`: an
	 * http(s) issuer goes to the pipeline, anything else to the API-key path first.
	 */
	getAuthMiddleware() {
		return async (req: Request, res: Response, next: NextFunction) => {
			const inbound = inboundFrom(this.mcpProtectedResource, inboundRequestOf(req));
			const extracted = extractBearer(inbound);
			if (!extracted.ok) {
				const refused = this.admission.refuse(inbound, extracted.reason);
				await this.deny(req, res, refused, headerDenial(req.header('authorization')));
				return;
			}

			const { token } = extracted.value.credential;
			const urlIssuer = isUrlIssuer(this.issuerOf(token));
			if (!urlIssuer) {
				const result = await this.mcpServerApiKeyService.verifyApiKey(token);
				if (result !== null) {
					await this.settleApiKey(req, res, next, inbound, result);
					return;
				}
				// No API-key strategy knows the token. The pipeline refuses it with its own reason.
			}

			const admitted = await this.admission.admit(this.mcpProtectedResource, extracted.value);
			if (!admitted.ok) {
				await this.deny(req, res, admitted, telemetryOf(admitted.reason, urlIssuer));
				return;
			}
			await this.settleSecurityContext(req, res, next, inbound, admitted.context);
		};
	}

	/** Routing only, never a decision: the token is not verified yet. */
	private issuerOf(token: string): unknown {
		try {
			return this.jwtService.decodeUnverified<{ iss?: unknown } | null>(token)?.iss;
		} catch {
			// `jwt.decode` throws on a JWT-typed token whose payload is not JSON.
			return undefined;
		}
	}

	private async settleSecurityContext(
		req: Request,
		res: Response,
		next: NextFunction,
		inbound: Inbound,
		context: SecurityContext,
	) {
		// RFC 9068 §2.2 requires `client_id`, and MCP attributes every OAuth call to a client.
		if (context.clientId === undefined) {
			await this.refuseAdmitted(req, res, inbound, context, 'not-an-access-token');
			return;
		}

		// The context names a Principal. The tools need the User entity with its role.
		const user = await this.userRepository.findByIdWithRole(context.subject.id);
		if (!user) {
			await this.refuseAdmitted(req, res, inbound, context, 'unknown-subject');
			return;
		}

		const mcpReq = req as McpAuthenticatedRequest;
		mcpReq.user = user;
		mcpReq.mcpCaller = { authType: 'oauth', clientId: context.clientId };
		// An OAuth caller is always scope-bearing: `undefined` would mean full tool access.
		mcpReq.mcpScopes = context.tokenScopes ?? [];
		// Keep what earlier middleware put on the operation context.
		mcpReq.ctx = { ...mcpReq.ctx, security: context };
		next();
	}

	private async refuseAdmitted(
		req: Request,
		res: Response,
		inbound: Inbound,
		context: SecurityContext,
		reason: RefusalReason,
	) {
		const refused = this.admission.refuse(inbound, reason, context);
		await this.deny(req, res, refused, telemetryOf(reason, true));
	}

	/** The API-key path is outside the pipeline's vocabulary, so it writes its own line. */
	private async settleApiKey(
		req: Request,
		res: Response,
		next: NextFunction,
		inbound: Inbound,
		result: McpApiKeyResult,
	) {
		const where = { surface: inbound.surface, resource: inbound.resource.url };
		if (!result.user) {
			const telemetry: TelemetryAuthContext = result.context ?? {
				reason: 'invalid_token',
				auth_type: 'api_key',
			};
			this.logger.warn('Inbound authentication denied', { ...where, reason: telemetry.reason });
			// No reason: the challenge carries no error, as before.
			const advertised = { surface: inbound.surface, resource: inbound.resource };
			await this.deny(req, res, { advertised }, telemetry);
			return;
		}

		this.logger.info('Inbound authentication accepted', {
			...where,
			authMethod: result.authMethod,
			userId: result.user.id,
		});
		const mcpReq = req as McpAuthenticatedRequest;
		mcpReq.user = result.user;
		mcpReq.mcpCaller = result.caller;
		// undefined for API keys = not scope-bearing → full tool access
		mcpReq.mcpScopes = result.scopes;
		next();
	}

	private async deny(
		req: Request,
		res: Response,
		refusal: Refusal,
		telemetry: TelemetryAuthContext,
	) {
		this.trackFailedConnection(req, UNAUTHORIZED_ERROR_MESSAGE, 401, telemetry);
		// RFC 6750 §3 / RFC 9728 §5.1: the challenge names the protected-resource metadata.
		res.header('WWW-Authenticate', await this.admission.challenge(refusal));
		res.status(401).send({
			message: `${UNAUTHORIZED_ERROR_MESSAGE}${telemetry.error_details ? ': ' + telemetry.error_details : ''}`,
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
