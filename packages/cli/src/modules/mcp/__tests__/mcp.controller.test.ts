import { Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';

// eslint-disable-next-line import-x/order
import { McpServerApiKeyService } from '../mcp-api-key.service';

const mockAuthMiddleware = jest.fn().mockImplementation(async (_req, _res, next) => {
	next();
});
const mcpServerApiKeyService = mockDeep<McpServerApiKeyService>();
mcpServerApiKeyService.getAuthMiddleware.mockReturnValue(mockAuthMiddleware);

// We need to mock the service before importing the controller as it's used in the middleware
Container.set(McpServerApiKeyService, mcpServerApiKeyService);

import { McpController, type FlushableResponse } from '../mcp.controller';
import { McpService } from '../mcp.service';
import { McpSettingsService } from '../mcp.settings.service';

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
	const StreamableHTTPServerTransport = jest.fn().mockImplementation((_opts) => ({
		handleRequest: jest.fn().mockResolvedValue(undefined),
		close: jest.fn().mockResolvedValue(undefined),
	}));
	return { StreamableHTTPServerTransport };
});

const createReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
	({ user: { id: 'user-1' }, body: {}, ...overrides }) as unknown as AuthenticatedRequest;

const createRes = (): FlushableResponse => {
	const res = mock<FlushableResponse>();
	res.status.mockReturnThis();
	res.json.mockReturnThis();
	return res;
};

describe('McpController', () => {
	let controller: McpController;
	const logger = mock<Logger>();
	const mcpService = { getServer: jest.fn() } as unknown as McpService;
	const mcpSettingsService = { getEnabled: jest.fn() } as unknown as McpSettingsService;

	beforeEach(() => {
		jest.clearAllMocks();

		Container.set(Logger, logger);
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
});
