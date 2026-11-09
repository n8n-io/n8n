import type { Mocked } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Transaction, User, UserRepository } from '@n8n/db';
import type { Inbound, RefusalReason, Refused, ResourceAdmission } from '@n8n/inbound-auth';
import type { Principal, SecurityContext } from '@n8n/permissions';
import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@n8n/backend-services';
import { Telemetry } from '@/telemetry';

import { McpServerApiKeyService } from '../mcp-api-key.service';
import { MCP_CLIENT_INFO_META_KEY, MCP_PROTOCOL_VERSION_META_KEY } from '../mcp.constants';
import { McpProtectedResource } from '../mcp-protected-resource';
import { McpServerMiddlewareService } from '../mcp-server-middleware.service';
import type { McpAuthenticatedRequest } from '../mcp.types';

const RESOURCE_URL = 'https://n8n.example.com/mcp-server/http';
const CHALLENGE =
	'Bearer resource_metadata="https://n8n.example.com/.well-known/oauth-protected-resource/mcp-server/http"';

const mockReqWith = (authHeader: string | undefined, body?: unknown) => {
	const req = mockDeep<McpAuthenticatedRequest>({
		// `extractBearer` reads the headers object, not `req.header()`.
		headers: authHeader === undefined ? {} : { authorization: authHeader },
		method: 'POST',
		originalUrl: '/mcp-server/http',
		ip: '203.0.113.7',
	});
	req.header.mockImplementation((name: string) => {
		if (name === 'authorization') return authHeader;
		return undefined;
	});
	req.body = body ?? {};
	return req;
};

const mockRes = () => {
	const res = mockDeep<Response>();
	res.status.mockReturnThis();
	res.send.mockReturnThis();
	res.header.mockReturnThis();
	return res;
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock(), mock());

/** A token from an OAuth2 trusted source. The admission is mocked, so only `iss` matters. */
const signIssuerToken = (iss: string) => jwt.sign({ iss, sub: 'idp-alice' }, 'any-secret');

const context: SecurityContext = {
	subject: { id: 'user-123', type: 'person', email: 'alice@example.com' } as Principal,
	authMethod: 'oauth-access-token',
	subjectClaim: { sourceId: 'idp-1', issuer: 'https://idp.example', subject: 'idp-alice' },
	clientId: 'client-abc',
	tokenScopes: ['workflow:read'],
};

let mcpServerApiKeyService: Mocked<McpServerApiKeyService>;
let mcpProtectedResource: Mocked<McpProtectedResource>;
let admission: Mocked<ResourceAdmission>;
let userRepository: Mocked<UserRepository>;
let telemetry: Mocked<Telemetry>;
let logger: Mocked<Logger>;
let service: McpServerMiddlewareService;

describe('McpServerMiddlewareService', () => {
	beforeAll(() => {
		mcpServerApiKeyService = mockInstance(McpServerApiKeyService) as Mocked<McpServerApiKeyService>;
		mcpProtectedResource = mockInstance(McpProtectedResource, {
			surface: 'instance-mcp',
		}) as Mocked<McpProtectedResource>;
		admission = mock<ResourceAdmission>();
		userRepository = mock<UserRepository>();
		telemetry = mockInstance(Telemetry);
		logger = mock<Logger>();

		service = new McpServerMiddlewareService(
			mcpServerApiKeyService,
			mcpProtectedResource,
			admission,
			userRepository,
			jwtService,
			telemetry,
			logger,
		);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mcpProtectedResource.getResourceUrl.mockReturnValue(RESOURCE_URL);
		mcpProtectedResource.getAudiences.mockReturnValue([RESOURCE_URL]);
		admission.refuse.mockImplementation(
			(inbound: Inbound, reason: RefusalReason, ctx?: SecurityContext): Refused => ({
				ok: false,
				reason,
				advertised: { surface: inbound.surface, resource: inbound.resource },
				...(ctx && { context: ctx }),
			}),
		);
		admission.challenge.mockResolvedValue(CHALLENGE);
	});

	describe('getEnabledMiddleware', () => {
		const runMiddleware = async (enabled: boolean, body?: unknown) => {
			mcpProtectedResource.isAvailable.mockResolvedValue(enabled);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();
			const next = vi.fn() as NextFunction;

			await service.getEnabledMiddleware()(mockReqWith(undefined, body), res, next);

			return { res, next };
		};

		it('should pass the request through when MCP access is enabled', async () => {
			const { res, next } = await runMiddleware(true);

			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should return 404 without an authentication challenge when MCP access is disabled', async () => {
			const { res, next } = await runMiddleware(false);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ message: 'MCP access is disabled' });
			expect(res.header).not.toHaveBeenCalledWith('WWW-Authenticate', expect.anything());
			expect(next).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('should track a connection error when a handshake hits the disabled server', async () => {
			await runMiddleware(false, {
				jsonrpc: '2.0',
				method: 'initialize',
				params: { clientInfo: { name: 'Claude', version: '1.0.0' } },
			});

			expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
				mcp_connection_status: 'error',
				error: 'MCP access is disabled',
				http_status: 404,
				client_name: 'Claude',
				client_version: '1.0.0',
			});
		});

		it('should not track non-handshake requests against the disabled server', async () => {
			await runMiddleware(false, { jsonrpc: '2.0', method: 'tools/call', params: {} });

			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('getAuthMiddleware', () => {
		const run = async (authHeader: string | undefined, body?: unknown) => {
			const req = mockReqWith(authHeader, body);
			const res = mockRes();
			const next = vi.fn() as NextFunction;
			await service.getAuthMiddleware()(req, res, next);
			return { req, res, next };
		};

		const expectUnauthorized = (res: Mocked<Response>, next: NextFunction, message: string) => {
			expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', CHALLENGE);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message });
			expect(next).not.toHaveBeenCalled();
		};

		describe('a header without a bearer', () => {
			it('refuses a missing header with no-credential and keeps the telemetry', async () => {
				const { res, next } = await run(undefined);

				expect(admission.refuse).toHaveBeenCalledWith(
					expect.objectContaining({ surface: 'instance-mcp' }),
					'no-credential',
				);
				expect(admission.challenge).toHaveBeenCalledWith(
					expect.objectContaining({ reason: 'no-credential' }),
				);
				expectUnauthorized(res, next, 'Unauthorized: Authorization header not sent');
				expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
					mcp_connection_status: 'error',
					http_status: 401,
					error: 'Unauthorized',
					client_name: undefined,
					client_version: undefined,
					auth_type: 'unknown',
					error_details: 'Authorization header not sent',
					reason: 'missing_authorization_header',
				});
				expect(admission.admit).not.toHaveBeenCalled();
				// The shared admission writes the denial line.
				expect(logger.warn).not.toHaveBeenCalled();
			});

			it.each([
				['Basic sometoken', 'Missing Bearer prefix'],
				['Bearer', 'Malformed Bearer token'],
				['Bearer two parts', 'Malformed Bearer token'],
			])('refuses %j with malformed-credential and today’s message', async (header, problem) => {
				const { res, next } = await run(header);

				expect(admission.refuse).toHaveBeenCalledWith(expect.anything(), 'malformed-credential');
				expectUnauthorized(
					res,
					next,
					`Unauthorized: Invalid authorization header format - ${problem}`,
				);
				expect(telemetry.track).toHaveBeenCalledWith(
					'User connected to MCP server',
					expect.objectContaining({
						reason: 'invalid_bearer_format',
						auth_type: 'unknown',
						error_details: `Invalid authorization header format - ${problem}`,
					}),
				);
			});
		});

		describe('a bearer from a URL issuer', () => {
			beforeEach(() => {
				admission.admit.mockResolvedValue({ ok: true, context });
				userRepository.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user-123' }));
			});

			it.each(['https://idp.example', 'http://localhost:5678'])(
				'sends a token from %s to the pipeline, not to the API-key path',
				async (iss) => {
					const token = signIssuerToken(iss);

					await run(`Bearer ${token}`);

					expect(admission.admit).toHaveBeenCalledWith(
						mcpProtectedResource,
						expect.objectContaining({
							surface: 'instance-mcp',
							credential: { kind: 'bearer', token },
						}),
					);
					expect(mcpServerApiKeyService.verifyApiKey).not.toHaveBeenCalled();
				},
			);

			it('sets the user, the OAuth caller, the token scopes and the security context', async () => {
				const user = mock<User>({ id: 'user-123' });
				userRepository.findByIdWithRole.mockResolvedValue(user);

				const { req, res, next } = await run(`Bearer ${signIssuerToken('https://idp.example')}`);

				expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-123');
				expect(req.user).toBe(user);
				expect(req.mcpCaller).toEqual({ authType: 'oauth', clientId: 'client-abc' });
				expect(req.mcpScopes).toEqual(['workflow:read']);
				expect(req.ctx?.security).toBe(context);
				expect(next).toHaveBeenCalled();
				expect(res.status).not.toHaveBeenCalled();
				// The pipeline writes the accept line.
				expect(logger.info).not.toHaveBeenCalled();
			});

			it('keeps what earlier middleware put on the operation context', async () => {
				const req = mockReqWith(`Bearer ${signIssuerToken('https://idp.example')}`);
				const earlier = { trx: mock<Transaction>() };
				req.ctx = earlier;

				await service.getAuthMiddleware()(req, mockRes(), vi.fn());

				expect(req.ctx).toEqual({ ...earlier, security: context });
			});

			it('treats a token without scopes as scope-bearing with no scopes, not full access', async () => {
				admission.admit.mockResolvedValue({
					ok: true,
					context: { ...context, tokenScopes: undefined },
				});

				const { req } = await run(`Bearer ${signIssuerToken('https://idp.example')}`);

				expect(req.mcpScopes).toEqual([]);
			});

			it('refuses an admitted token without a client id', async () => {
				const withoutClient = { ...context, clientId: undefined };
				admission.admit.mockResolvedValue({ ok: true, context: withoutClient });

				const { res, next } = await run(`Bearer ${signIssuerToken('https://idp.example')}`);

				expect(admission.refuse).toHaveBeenCalledWith(
					expect.anything(),
					'not-an-access-token',
					withoutClient,
				);
				expectUnauthorized(res, next, 'Unauthorized: not-an-access-token');
				expect(telemetry.track).toHaveBeenCalledWith(
					'User connected to MCP server',
					expect.objectContaining({
						reason: 'invalid_token',
						auth_type: 'oauth',
						error_details: 'not-an-access-token',
					}),
				);
			});

			it('refuses an admitted token whose user row is gone', async () => {
				userRepository.findByIdWithRole.mockResolvedValue(null);

				const { res, next } = await run(`Bearer ${signIssuerToken('https://idp.example')}`);

				expect(admission.refuse).toHaveBeenCalledWith(
					expect.anything(),
					'unknown-subject',
					context,
				);
				expectUnauthorized(res, next, 'Unauthorized: unknown-subject');
				expect(telemetry.track).toHaveBeenCalledWith(
					'User connected to MCP server',
					expect.objectContaining({ reason: 'user_not_found', auth_type: 'oauth' }),
				);
			});

			it.each([
				['source-not-accepted', 'invalid_token'],
				['signature-invalid', 'invalid_token'],
				['revoked', 'token_not_found_in_db'],
			] as const)(
				'answers a %s refusal with the admission challenge and the reason',
				async (reason, telemetryReason) => {
					const refused: Refused = {
						ok: false,
						reason,
						advertised: {
							surface: 'instance-mcp',
							resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
						},
					};
					admission.admit.mockResolvedValue(refused);

					const { res, next } = await run(`Bearer ${signIssuerToken('https://idp.example')}`);

					expect(admission.challenge).toHaveBeenCalledWith(refused);
					expectUnauthorized(res, next, `Unauthorized: ${reason}`);
					expect(telemetry.track).toHaveBeenCalledWith(
						'User connected to MCP server',
						expect.objectContaining({
							reason: telemetryReason,
							auth_type: 'oauth',
							error_details: reason,
						}),
					);
					// The pipeline writes the reject line.
					expect(logger.warn).not.toHaveBeenCalled();
				},
			);
		});

		describe('a bearer for the API-key path', () => {
			it('authenticates an MCP API key without the pipeline and logs the accept', async () => {
				const user = mock<User>({ id: 'user-123' });
				const apiKey = jwtService.sign('mcpApiKey', { sub: 'user-123', iss: 'n8n' });
				mcpServerApiKeyService.verifyApiKey.mockResolvedValue({
					user,
					caller: { authType: 'api_key' },
					authMethod: 'api-key',
				});

				const { req, res, next } = await run(`Bearer ${apiKey}`);

				expect(mcpServerApiKeyService.verifyApiKey).toHaveBeenCalledWith(apiKey);
				expect(admission.admit).not.toHaveBeenCalled();
				expect(req.user).toBe(user);
				// An API key is not issued to an OAuth client, so there is none to report
				expect(req.mcpCaller).toEqual({ authType: 'api_key' });
				// API keys are not scope-bearing: undefined means full tool access
				expect(req.mcpScopes).toBeUndefined();
				expect(next).toHaveBeenCalled();
				expect(res.status).not.toHaveBeenCalled();
				expect(logger.info).toHaveBeenCalledTimes(1);
				expect(logger.info).toHaveBeenCalledWith('Inbound authentication accepted', {
					surface: 'instance-mcp',
					resource: RESOURCE_URL,
					authMethod: 'api-key',
					userId: 'user-123',
				});
			});

			it('authenticates a delegated token-exchange JWT and sets req.user to the actor', async () => {
				const actor = mock<User>({ id: 'actor-1' });
				const scopedJwt = jwtService.sign('tokenExchange', {
					iss: 'n8n-token-exchange',
					sub: 'subject-1',
					act: { sub: 'actor-1' },
					jti: 'test-jti',
				});
				mcpServerApiKeyService.verifyApiKey.mockResolvedValue({
					user: actor,
					actor,
					caller: { authType: 'api_key' },
					authMethod: 'scoped-jwt',
				});

				const { req, next } = await run(`Bearer ${scopedJwt}`);

				expect(req.user).toBe(actor);
				expect(next).toHaveBeenCalled();
				expect(admission.admit).not.toHaveBeenCalled();
				expect(logger.info).toHaveBeenCalledWith(
					'Inbound authentication accepted',
					expect.objectContaining({ authMethod: 'scoped-jwt', userId: 'actor-1' }),
				);
			});

			it('answers a rejected API key with the challenge without an error, as before', async () => {
				mcpServerApiKeyService.verifyApiKey.mockResolvedValue({
					user: null,
					context: { reason: 'invalid_token', auth_type: 'api_key' },
				});

				const { res, next } = await run('Bearer invalid-token-format');

				expect(admission.challenge).toHaveBeenCalledWith({
					advertised: {
						surface: 'instance-mcp',
						resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
					},
				});
				expectUnauthorized(res, next, 'Unauthorized');
				expect(telemetry.track).toHaveBeenCalledWith(
					'User connected to MCP server',
					expect.objectContaining({ reason: 'invalid_token', auth_type: 'api_key' }),
				);
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
					surface: 'instance-mcp',
					resource: RESOURCE_URL,
					reason: 'invalid_token',
				});
				expect(admission.admit).not.toHaveBeenCalled();
			});

			it('sends a token that no API-key strategy knows to the pipeline', async () => {
				mcpServerApiKeyService.verifyApiKey.mockResolvedValue(null);
				admission.admit.mockResolvedValue({
					ok: false,
					reason: 'unknown-issuer',
					advertised: {
						surface: 'instance-mcp',
						resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
					},
				});

				const { res, next } = await run('Bearer some-session-jwt');

				expect(admission.admit).toHaveBeenCalled();
				expectUnauthorized(res, next, 'Unauthorized: unknown-issuer');
				expect(telemetry.track).toHaveBeenCalledWith(
					'User connected to MCP server',
					expect.objectContaining({
						reason: 'invalid_token',
						auth_type: 'unknown',
						error_details: 'unknown-issuer',
					}),
				);
			});

			it('routes a JWT whose payload is not JSON to the API-key path instead of throwing', async () => {
				// `jwt.decode` throws for a token typed `JWT` whose payload does not parse.
				const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
					'base64url',
				);
				const token = `${header}.${Buffer.from('not-json').toString('base64url')}.sig`;
				mcpServerApiKeyService.verifyApiKey.mockResolvedValue({ user: null });

				const { res } = await run(`Bearer ${token}`);

				expect(mcpServerApiKeyService.verifyApiKey).toHaveBeenCalledWith(token);
				expect(res.status).toHaveBeenCalledWith(401);
			});

			it('keeps the token and the email out of the log lines', async () => {
				const apiKey = jwtService.sign('mcpApiKey', { sub: 'user-123', iss: 'n8n' });
				mcpServerApiKeyService.verifyApiKey.mockResolvedValueOnce({
					user: mock<User>({ id: 'user-123', email: 'alice@example.com' }),
					caller: { authType: 'api_key' },
					authMethod: 'api-key',
				});
				mcpServerApiKeyService.verifyApiKey.mockResolvedValueOnce({ user: null });

				await run(`Bearer ${apiKey}`);
				await run(`Bearer ${apiKey}`);

				const logged = JSON.stringify([logger.info.mock.calls, logger.warn.mock.calls]);
				expect(logged).not.toContain(apiKey);
				expect(logged).not.toContain('alice@example.com');
			});
		});

		it('should track telemetry with client info from request body', async () => {
			await run(undefined, { params: { clientInfo: { name: 'test-client', version: '1.0.0' } } });

			expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
				mcp_connection_status: 'error',
				http_status: 401,
				error: 'Unauthorized',
				client_name: 'test-client',
				client_version: '1.0.0',
				auth_type: 'unknown',
				error_details: 'Authorization header not sent',
				reason: 'missing_authorization_header',
			});
		});

		// An unauthenticated `server/discover` probe is treated like any other RPC:
		// capability discovery is grant-scoped, so it stays behind auth and the 401
		// points the client at the OAuth protected-resource metadata. The client
		// identity and protocol version it declared in `_meta` are still captured.
		it('should reject an unauthenticated server/discover probe with 401 and capture _meta', async () => {
			const { res, next } = await run(undefined, {
				jsonrpc: '2.0',
				method: 'server/discover',
				params: {
					_meta: {
						[MCP_PROTOCOL_VERSION_META_KEY]: '2026-07-28',
						[MCP_CLIENT_INFO_META_KEY]: { name: 'Claude', version: '3.0.0' },
					},
				},
			});

			expectUnauthorized(res, next, 'Unauthorized: Authorization header not sent');
			expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
				mcp_connection_status: 'error',
				http_status: 401,
				error: 'Unauthorized',
				client_name: 'Claude',
				client_version: '3.0.0',
				protocol_version: '2026-07-28',
				auth_type: 'unknown',
				error_details: 'Authorization header not sent',
				reason: 'missing_authorization_header',
			});
		});
	});
});
