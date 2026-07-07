import type { Mock } from 'vitest';
import { Logger } from '@n8n/backend-common';
import { ApiKeyRepository, type AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import { mock, mockDeep } from 'vitest-mock-extended';

// eslint-disable-next-line import-x/order
import { McpServerMiddlewareService } from '../mcp-server-middleware.service';

const mockAuthMiddleware = vi.fn().mockImplementation(async function (_req, _res, next) {
	next();
});
const mcpServerMiddlewareService = mockDeep<McpServerMiddlewareService>();
mcpServerMiddlewareService.getAuthMiddleware.mockReturnValue(mockAuthMiddleware);

// The controller's route decorator resolves McpServerMiddlewareService via DI at
// module-evaluation time, so it must be registered before the controller module
// loads. ES import hoisting would run a static `import` of the controller before
// this set, so the controller is imported dynamically in `beforeEach` instead.
Container.set(McpServerMiddlewareService, mcpServerMiddlewareService);

import { McpConfig } from '../mcp.config';
import type { McpController as McpControllerType, FlushableResponse } from '../mcp.controller';
import { McpService } from '../mcp.service';
import { McpSettingsService } from '../mcp.settings.service';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { Telemetry } from '@/telemetry';
import type { UserConnectedToMCPEventPayload } from '../mcp.types';

const mockHandleRequest = vi.fn().mockResolvedValue(undefined);
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
	const StreamableHTTPServerTransport = vi.fn().mockImplementation(function (_opts) {
		return {
			handleRequest: mockHandleRequest,
			close: vi.fn().mockResolvedValue(undefined),
		};
	});
	return { StreamableHTTPServerTransport };
});

type AuthenticatedMcpRequest = AuthenticatedRequest & {
	mcpAuthType?: UserConnectedToMCPEventPayload['auth_type'];
	mcpClientId?: string;
};

const createReq = (overrides: Partial<AuthenticatedMcpRequest> = {}): AuthenticatedMcpRequest =>
	({ user: { id: 'user-1' }, body: {}, ...overrides }) as unknown as AuthenticatedMcpRequest;

const createRes = (): FlushableResponse => {
	const res = mock<FlushableResponse>();
	res.status.mockReturnThis();
	res.json.mockReturnThis();
	return res;
};

describe('McpController', () => {
	let McpController: typeof McpControllerType;
	let controller: McpControllerType;
	const logger = mock<Logger>();
	const telemetry = { track: vi.fn() } as unknown as Telemetry;
	const mcpService = {
		getServer: vi.fn(),
		resolveMcpAppsVariant: vi.fn(),
	} as unknown as McpService;
	const mcpSettingsService = { getEnabled: vi.fn() } as unknown as McpSettingsService;
	const oauthTokenVerifier = {
		recordClientActivity: vi.fn(),
	} as unknown as OAuthTokenVerifierProxy;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Default mock — the controller now resolves the MCP Apps variant for
		// every request, so tests that don't care about the variant still need
		// a sane default. Individual tests override this with `mockResolvedValue`
		// when the variant matters.
		(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
			enabled: false,
			variant: 'unassigned',
		});

		Container.set(Logger, logger);
		Container.set(Telemetry, telemetry);
		Container.set(McpService, mcpService);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(OAuthTokenVerifierProxy, oauthTokenVerifier);
		// Real repositories can't be auto-constructed by DI without a DataSource.
		Container.set(ApiKeyRepository, mock<ApiKeyRepository>());

		// Imported here (not statically) so the Container.set above runs first.
		({ McpController } = await import('../mcp.controller'));
		controller = Container.get(McpController);
	});

	test('records client activity for OAuth tool calls', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		const res = createRes();

		await controller.build(
			createReq({
				mcpAuthType: 'oauth',
				mcpClientId: 'client-1',
				body: { jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_workflows' } },
			} as Partial<AuthenticatedMcpRequest>),
			res,
		);

		expect(oauthTokenVerifier.recordClientActivity).toHaveBeenCalledWith('user-1', 'client-1');
	});

	test('does not record activity for non-tool-call requests or API keys', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});

		// tools/list is not activity
		await controller.build(
			createReq({
				mcpClientId: 'client-1',
				body: { jsonrpc: '2.0', method: 'tools/list' },
			} as Partial<AuthenticatedMcpRequest>),
			createRes(),
		);
		// API-key requests carry no client id
		await controller.build(
			createReq({
				body: { jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_workflows' } },
			}),
			createRes(),
		);

		expect(oauthTokenVerifier.recordClientActivity).not.toHaveBeenCalled();
	});

	test('returns 403 if MCP access is disabled', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(false);
		const res = createRes();
		await controller.build(createReq(), res);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'MCP access is disabled' });
		expect(mcpService.getServer as unknown as Mock).not.toHaveBeenCalled();
		// MCP Apps variant resolution is skipped for rejected requests to
		// avoid an unnecessary PostHog lookup.
		expect(mcpService.resolveMcpAppsVariant as Mock).not.toHaveBeenCalled();
	});

	test('tracks disabled-access init errors without MCP Apps variant fields', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(false);
		const res = createRes();

		await controller.build(
			createReq({
				mcpAuthType: 'oauth',
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
			mcp_connection_status: 'error',
			error: 'MCP access is disabled',
		});
		expect(mcpService.resolveMcpAppsVariant as Mock).not.toHaveBeenCalled();
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

	test('tracks successful initialize connections with auth type and MCP Apps variant', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
			enabled: true,
			variant: 'variant',
		});
		const res = createRes();

		await controller.build(
			createReq({
				mcpAuthType: 'oauth',
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
		});
	});

	test('reports the env_override variant when the flag is forced on by an operator', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
			enabled: true,
			variant: 'env_override',
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

	test('resolves the MCP Apps variant once and forwards `enabled` to getServer on initialize', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
			enabled: true,
			variant: 'variant',
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

		expect(mcpService.resolveMcpAppsVariant as Mock).toHaveBeenCalledTimes(1);
		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			true,
			{ name: 'Claude', version: '1.0.0' },
			undefined,
		);
	});

	test('resolves the MCP Apps variant and forwards `enabled` to getServer on non-initialize requests', async () => {
		(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as Mock).mockReturnValue({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		});
		(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
			enabled: false,
			variant: 'control',
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
		expect(mcpService.resolveMcpAppsVariant as Mock).toHaveBeenCalledTimes(1);
		expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			false,
			undefined,
			undefined,
		);
		// Non-initialize requests still skip telemetry tracking.
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	test('HEAD /http returns 401 with WWW-Authenticate header for auth scheme discovery', async () => {
		const req = {} as Request;
		const res = createRes();
		res.header = vi.fn().mockReturnThis();
		res.end = vi.fn().mockReturnThis();

		await controller.discoverAuthSchemeHead(req, res);

		expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.end).toHaveBeenCalled();
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
		test('returns 403 if MCP access is disabled', async () => {
			(mcpSettingsService.getEnabled as Mock).mockResolvedValue(false);
			const res = createRes();
			await controller.handleGet(createReq(), res);
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'MCP access is disabled' });
		});

		test('delegates to transport.handleRequest', async () => {
			(mcpSettingsService.getEnabled as Mock).mockResolvedValue(true);
			(mcpService.resolveMcpAppsVariant as Mock).mockResolvedValue({
				enabled: true,
				variant: 'variant',
			});
			(mcpService.getServer as unknown as Mock).mockReturnValue({
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
			});
			const req = createReq();
			const res = createRes();
			await controller.handleGet(req, res);
			expect(mcpService.resolveMcpAppsVariant as Mock).toHaveBeenCalledTimes(1);
			expect(mcpService.getServer as unknown as Mock).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user-1' }),
				true,
				undefined,
				undefined,
			);
			expect(mockHandleRequest).toHaveBeenCalledWith(req, res, undefined);
		});
	});
});
