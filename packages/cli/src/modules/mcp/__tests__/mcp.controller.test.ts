import { Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';

// eslint-disable-next-line import-x/order
import { McpServerMiddlewareService } from '../mcp-server-middleware.service';

const mockAuthMiddleware = jest.fn().mockImplementation(async (_req, _res, next) => {
	next();
});
const mcpServerMiddlewareService = mockDeep<McpServerMiddlewareService>();
mcpServerMiddlewareService.getAuthMiddleware.mockReturnValue(mockAuthMiddleware);

// We need to mock the service before importing the controller as it's used in the middleware
Container.set(McpServerMiddlewareService, mcpServerMiddlewareService);

import { McpController, type FlushableResponse } from '../mcp.controller';
import { McpService } from '../mcp.service';
import { McpSettingsService } from '../mcp.settings.service';
import { Telemetry } from '@/telemetry';
import type { UserConnectedToMCPEventPayload } from '../mcp.types';

const mockHandleRequest = jest.fn().mockResolvedValue(undefined);
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
	const StreamableHTTPServerTransport = jest.fn().mockImplementation((_opts) => ({
		handleRequest: mockHandleRequest,
		close: jest.fn().mockResolvedValue(undefined),
	}));
	return { StreamableHTTPServerTransport };
});

type AuthenticatedMcpRequest = AuthenticatedRequest & {
	mcpAuthType?: UserConnectedToMCPEventPayload['auth_type'];
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
	let controller: McpController;
	const logger = mock<Logger>();
	const telemetry = { track: jest.fn() } as unknown as Telemetry;
	const mcpService = { getServer: jest.fn() } as unknown as McpService;
	const mcpSettingsService = { getEnabled: jest.fn() } as unknown as McpSettingsService;

	beforeEach(() => {
		jest.clearAllMocks();

		Container.set(Logger, logger);
		Container.set(Telemetry, telemetry);
		Container.set(McpService, mcpService);
		Container.set(McpSettingsService, mcpSettingsService);

		controller = Container.get(McpController);
	});

	test('returns 403 if MCP access is disabled', async () => {
		(mcpSettingsService.getEnabled as jest.Mock).mockResolvedValue(false);
		const res = createRes();
		await controller.build(createReq(), res);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'MCP access is disabled' });
		expect(mcpService.getServer as unknown as jest.Mock).not.toHaveBeenCalled();
	});

	test('creates mcp server if MCP access is enabled', async () => {
		(mcpSettingsService.getEnabled as jest.Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as jest.Mock).mockReturnValue({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
		});
		const res = createRes();
		await controller.build(createReq(), res);
		expect(mcpService.getServer as unknown as jest.Mock).toHaveBeenCalled();
	});

	test('tracks successful initialize connections with auth type', async () => {
		(mcpSettingsService.getEnabled as jest.Mock).mockResolvedValue(true);
		(mcpService.getServer as unknown as jest.Mock).mockReturnValue({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
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
		});
	});

	test('HEAD /http returns 401 with WWW-Authenticate header for auth scheme discovery', async () => {
		const req = {} as Request;
		const res = createRes();
		res.header = jest.fn().mockReturnThis();
		res.end = jest.fn().mockReturnThis();

		await controller.discoverAuthSchemeHead(req, res);

		expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.end).toHaveBeenCalled();
	});

	describe('GET /http', () => {
		test('returns 403 if MCP access is disabled', async () => {
			(mcpSettingsService.getEnabled as jest.Mock).mockResolvedValue(false);
			const res = createRes();
			await controller.handleGet(createReq(), res);
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'MCP access is disabled' });
		});

		test('delegates to transport.handleRequest', async () => {
			(mcpSettingsService.getEnabled as jest.Mock).mockResolvedValue(true);
			(mcpService.getServer as unknown as jest.Mock).mockReturnValue({
				connect: jest.fn().mockResolvedValue(undefined),
				close: jest.fn().mockResolvedValue(undefined),
			});
			const req = createReq();
			const res = createRes();
			await controller.handleGet(req, res);
			expect(mockHandleRequest).toHaveBeenCalledWith(req, res, undefined);
		});
	});
});
