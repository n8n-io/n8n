import { Logger } from '@n8n/backend-common';
import { ApiKeyRepository, type AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import { ErrorReporter } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import { Telemetry } from '@/telemetry';

import { McpProtectedResource } from '../mcp-protected-resource';
import { McpServerMiddlewareService } from '../mcp-server-middleware.service';

const mockAuthMiddleware = vi.fn().mockImplementation(async function (_req, _res, next) {
	next();
});
const mockEnabledMiddleware = vi.fn().mockImplementation(async function (_req, _res, next) {
	next();
});
const mcpServerMiddlewareService = mockDeep<McpServerMiddlewareService>();
mcpServerMiddlewareService.getAuthMiddleware.mockReturnValue(mockAuthMiddleware);
mcpServerMiddlewareService.getEnabledMiddleware.mockReturnValue(mockEnabledMiddleware);

// The controller's route decorator resolves McpServerMiddlewareService via DI at
// module-evaluation time, so it must be registered before the controller module
// loads. ES import hoisting would run a static `import` of the controller before
// this set, so the controller is imported dynamically in `beforeEach` instead.
Container.set(McpServerMiddlewareService, mcpServerMiddlewareService);

import { McpConfig } from '../mcp.config';
import { MCP_CLIENT_INFO_META_KEY, MCP_PROTOCOL_VERSION_META_KEY } from '../mcp.constants';
import type { McpController as McpControllerType, FlushableResponse } from '../mcp.controller';
import { McpService } from '../mcp.service';
import { McpSettingsService } from '../mcp.settings.service';
import type { McpCallerAuth } from '@/services/oauth-token-verifier-proxy.service';

const mockHandleRequest = vi.fn().mockResolvedValue(undefined);

type MockMcpHandler = { factory: () => Promise<unknown>; onerror?: (error: Error) => void };

// The controller wires createMcpHandler (per-request server factory) through
// toNodeHandler. The mocks run the factory when the node handler is invoked,
// mirroring the real flow: getServer is only called for requests that reach
// the transport, and a failure there is reported through `onerror` and answered
// with an error status rather than rethrown — the SDK's handler never throws at
// the caller, which is why the controller judges the outcome by status code.
vi.mock('@modelcontextprotocol/server', () => ({
	createMcpHandler: vi.fn(
		(factory: () => Promise<unknown>, options?: { onerror?: (error: Error) => void }) => ({
			factory,
			onerror: options?.onerror,
		}),
	),
}));
vi.mock('@modelcontextprotocol/node', () => ({
	toNodeHandler: vi.fn(
		(handler: MockMcpHandler) => async (req: unknown, res: unknown, body?: unknown) => {
			try {
				await handler.factory();
			} catch (error) {
				handler.onerror?.(error as Error);
				(res as FlushableResponse).statusCode = 500;
				return;
			}
			await mockHandleRequest(req, res, body);
		},
	),
}));

type AuthenticatedMcpRequest = AuthenticatedRequest & {
	mcpCaller?: McpCallerAuth;
	mcpScopes?: string[];
};

const createReq = (overrides: Partial<AuthenticatedMcpRequest> = {}): AuthenticatedMcpRequest =>
	({ user: { id: 'user-1' }, body: {}, ...overrides }) as unknown as AuthenticatedMcpRequest;

const createRes = (): FlushableResponse => {
	const res = mock<FlushableResponse>();
	res.status.mockReturnThis();
	res.json.mockReturnThis();
	// Express defaults to 200 until something writes a status; the connection
	// event reads this to tell a served handshake from a rejected one.
	res.statusCode = 200;
	return res;
};

describe('McpController', () => {
	let McpController: typeof McpControllerType;
	let controller: McpControllerType;
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const telemetry = { track: vi.fn() } as unknown as Telemetry;
	const mcpService = {
		getServer: vi.fn(),
		resolveFeatureFlags: vi.fn(),
	} as unknown as McpService;
	const mcpSettingsService = { getEnabled: vi.fn() } as unknown as McpSettingsService;
	const mcpProtectedResource = {
		getProtectedResourceMetadataUrl: vi
			.fn()
			.mockReturnValue(
				'https://n8n.example.com/.well-known/oauth-protected-resource/mcp-server/http',
			),
	} as unknown as McpProtectedResource;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Default mock — the controller resolves the MCP feature flags for
		// every request, so tests that don't care about them still need a sane
		// default. Individual tests override this with `mockResolvedValue`
		// when a flag matters.
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: false, variant: 'unassigned' },
			canvasGroupsEnabled: false,
		});

		Container.set(Logger, logger);
		Container.set(ErrorReporter, errorReporter);
		Container.set(Telemetry, telemetry);
		Container.set(McpService, mcpService);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(McpProtectedResource, mcpProtectedResource);
		// Real repositories can't be auto-constructed by DI without a DataSource.
		Container.set(ApiKeyRepository, mock<ApiKeyRepository>());

		// Imported here (not statically) so the Container.set above runs first.
		({ McpController } = await import('../mcp.controller.js'));
		controller = Container.get(McpController);
	});

	test('advertises the MCP routing headers in the CORS allow-list', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		const res = createRes();
		res.header = vi.fn().mockReturnThis();

		await controller.build(createReq(), res);

		expect(res.header).toHaveBeenCalledWith(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
		);
	});

	test('creates mcp server if MCP access is enabled', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		const res = createRes();
		await controller.build(createReq(), res);
		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalled();
	});

	test('tracks successful initialize connections with auth type and feature flags', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: true, variant: 'variant' },
			canvasGroupsEnabled: true,
		});
		const res = createRes();

		await controller.build(
			createReq({
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				body: {
					jsonrpc: '2.0',
					method: 'initialize',
					params: { clientInfo: { name: 'Claude', version: '1.0.0' } },
				},
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
			user_id: 'user-1',
			client_name: 'Claude',
			client_version: '1.0.0',
			auth_type: 'oauth',
			mcp_connection_status: 'success',
			mcp_apps_enabled: true,
			mcp_apps_variant: 'variant',
			mcp_canvas_groups_enabled: true,
		});
	});

	test('tracks a server/discover handshake with client info and protocol version from _meta', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: false, variant: 'unassigned' },
			canvasGroupsEnabled: false,
		});
		const res = createRes();

		// The 2026-07-28 revision has no `initialize`; a modern client opens with
		// `server/discover` and carries its identity in the per-request _meta
		// envelope, so the connection event must fire off that method.
		await controller.build(
			createReq({
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: {
						_meta: {
							[MCP_PROTOCOL_VERSION_META_KEY]: '2026-07-28',
							[MCP_CLIENT_INFO_META_KEY]: { name: 'Claude', version: '3.0.0' },
						},
					},
				},
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
			user_id: 'user-1',
			client_name: 'Claude',
			client_version: '3.0.0',
			protocol_version: '2026-07-28',
			auth_type: 'oauth',
			mcp_connection_status: 'success',
			mcp_apps_enabled: false,
			mcp_apps_variant: 'unassigned',
			mcp_canvas_groups_enabled: false,
		});
	});

	// A handshake the SDK refuses (unsupported protocol revision, missing
	// Mcp-Method header, unsupported media type) comes back as an error response,
	// not a throw. Tracking it as a connection would count users who never got a
	// working session, inflating the connect-to-use funnel.
	test('tracks a handshake the SDK answered with an error status as an error', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		mockHandleRequest.mockImplementationOnce((_req: unknown, res: FlushableResponse) => {
			res.statusCode = 400;
		});
		const res = createRes();

		await controller.build(
			createReq({
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: {
						_meta: {
							[MCP_PROTOCOL_VERSION_META_KEY]: '2026-07-28',
							[MCP_CLIENT_INFO_META_KEY]: { name: 'Claude', version: '3.0.0' },
						},
					},
				},
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'User connected to MCP server',
			expect.objectContaining({
				user_id: 'user-1',
				client_name: 'Claude',
				protocol_version: '2026-07-28',
				mcp_connection_status: 'error',
				error: 'MCP handshake failed',
				http_status: 400,
			}),
		);
	});

	// `server/discover` exists only on the modern leg. Without a protocol version
	// in the `_meta` envelope the request classifies as legacy, where the method is
	// unknown, and the handler answers method-not-found inside a 200. Verified
	// against a running instance: the response is an SSE frame carrying
	// {"error":{"code":-32601}} with HTTP 200, so the status alone reads as success.
	test('tracks a discover handshake with no declared protocol version as an error', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		const res = createRes();

		await controller.build(
			createReq({
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				body: { jsonrpc: '2.0', method: 'server/discover', params: {} },
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'User connected to MCP server',
			expect.objectContaining({
				mcp_connection_status: 'error',
				error: 'MCP handshake failed: no protocol version declared',
				http_status: 200,
			}),
		);
	});

	test('reports the handler error when building the MCP server fails', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockRejectedValue(
			new Error('tool schema conversion failed'),
		);
		const res = createRes();

		await controller.build(
			createReq({
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				body: {
					jsonrpc: '2.0',
					method: 'initialize',
					params: { clientInfo: { name: 'Claude', version: '1.0.0' } },
				},
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'User connected to MCP server',
			expect.objectContaining({
				mcp_connection_status: 'error',
				error: 'tool schema conversion failed',
				http_status: 500,
			}),
		);
	});

	test('reports the env_override variant when the flag is forced on by an operator', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: true, variant: 'env_override' },
			canvasGroupsEnabled: false,
		});
		const res = createRes();

		await controller.build(
			createReq({
				body: {
					jsonrpc: '2.0',
					method: 'initialize',
					params: { clientInfo: { name: 'Claude', version: '1.0.0' } },
				},
			}),
			res,
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'User connected to MCP server',
			expect.objectContaining({
				mcp_apps_enabled: true,
				mcp_apps_variant: 'env_override',
			}),
		);
	});

	test('resolves the feature flags once and forwards the resolution to getServer on initialize', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: true, variant: 'variant' },
			canvasGroupsEnabled: false,
		});
		const res = createRes();

		await controller.build(
			createReq({
				body: {
					jsonrpc: '2.0',
					method: 'initialize',
					params: { clientInfo: { name: 'Claude', version: '1.0.0' } },
				},
			}),
			res,
		);

		expect(mcpService.resolveFeatureFlags as Mock).toHaveBeenCalledTimes(1);
		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			{ mcpApps: { enabled: true, variant: 'variant' }, canvasGroupsEnabled: false },
			{ name: 'Claude', version: '1.0.0' },
			{ caller: undefined, grantedScopes: undefined },
		);
	});

	test('resolves the feature flags and forwards the resolution to getServer on non-initialize requests', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveFeatureFlags as Mock).mockResolvedValue({
			mcpApps: { enabled: false, variant: 'control' },
			canvasGroupsEnabled: false,
		});
		const res = createRes();

		await controller.build(
			createReq({
				body: {
					jsonrpc: '2.0',
					method: 'toolCall',
				},
			}),
			res,
		);

		// Resolution happens for every request so the registered tools stay
		// consistent with what was advertised at handshake time.
		expect(mcpService.resolveFeatureFlags as Mock).toHaveBeenCalledTimes(1);
		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			{ mcpApps: { enabled: false, variant: 'control' }, canvasGroupsEnabled: false },
			undefined,
			{ caller: undefined, grantedScopes: undefined },
		);
		// Non-initialize requests still skip telemetry tracking.
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	test('forwards the auth the middleware resolved to getServer', async () => {
		// The auth middleware resolves these from the bearer token; the controller
		// hands them to the server, which gates tools on the scopes and labels its
		// tool-call events with the rest.
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		const res = createRes();

		await controller.build(
			createReq({
				body: { jsonrpc: '2.0', method: 'tools/call' },
				mcpCaller: { authType: 'oauth', clientId: 'client-abc' },
				mcpScopes: ['workflow:read'],
			}),
			res,
		);

		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			expect.anything(),
			undefined,
			{
				caller: { authType: 'oauth', clientId: 'client-abc' },
				grantedScopes: ['workflow:read'],
			},
		);
	});

	test('HEAD /http returns 401 with WWW-Authenticate header for auth scheme discovery', async () => {
		const req = {} as Request;
		const res = createRes();
		res.header = vi.fn().mockReturnThis();
		res.end = vi.fn().mockReturnThis();

		await controller.discoverAuthSchemeHead(req, res);

		expect(res.header).toHaveBeenCalledWith(
			'WWW-Authenticate',
			'Bearer realm="n8n MCP Server", resource_metadata="https://n8n.example.com/.well-known/oauth-protected-resource/mcp-server/http"',
		);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.end).toHaveBeenCalled();
	});

	describe('MCP access gate', () => {
		test.each(['discoverAuthSchemeHead', 'handleGet', 'build'])(
			'runs before authentication on %s',
			(handlerName) => {
				const { middlewares } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
					McpController as unknown as Controller,
					handlerName,
				);

				expect(middlewares[0]).toBe(mockEnabledMiddleware);
			},
		);
	});

	// The route decorators read `McpConfig.rateLimitServer` at import time, so
	// these assertions prove the configured limit is wired into the routes
	// without booting the full server.
	describe('IP rate limit configuration', () => {
		const getRouteIpRateLimit = (handlerName: string) =>
			Container.get(ControllerRegistryMetadata).getRouteMetadata(
				McpController as unknown as Controller,
				handlerName,
			).ipRateLimit;

		test.each(['handleGet', 'build'])(
			'applies the configured server limit to %s',
			(handlerName) => {
				const limit = Container.get(McpConfig).rateLimitServer;

				expect(getRouteIpRateLimit(handlerName)).toEqual({ limit });
			},
		);
	});

	describe('GET /http', () => {
		// The listen stream is unsupported in stateless mode: a GET routed into
		// the transport would hang forever, so the route must answer 405 itself.
		test('returns 405 without touching the MCP transport', async () => {
			(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
			const res = createRes();
			await controller.handleGet(createReq(), res);
			expect(res.header).toHaveBeenCalledWith('Allow', 'POST');
			expect(res.status).toHaveBeenCalledWith(405);
			expect(res.json).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				error: {
					code: -32000,
					message: 'Method not allowed.',
				},
				id: null,
			});
			expect(mcpService.getServer as unknown as Mock).not.toHaveBeenCalled();
			expect(mockHandleRequest).not.toHaveBeenCalled();
		});
	});
});
