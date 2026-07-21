import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';

import { mcpEnabledForDiscovery } from '../mcp-enabled-discovery.middleware';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

const createResponse = () =>
	({
		header: vi.fn().mockReturnThis(),
		setHeader: vi.fn().mockReturnThis(),
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	}) as unknown as Response;

const createNext = () => vi.fn() as unknown as NextFunction;

const expectNotFound = (res: Response, next: NextFunction) => {
	expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
	expect(res.status).toHaveBeenCalledWith(404);
	expect(res.json).toHaveBeenCalledWith({ message: 'Not Found' });
	expect(next).not.toHaveBeenCalled();
};

const mockContainerGet = ({
	moduleRegistry,
	mcpSettingsService,
	mcpSettingsServiceError,
}: {
	moduleRegistry: Pick<ModuleRegistry, 'isActive'>;
	mcpSettingsService?: Pick<McpSettingsService, 'getEnabled'>;
	mcpSettingsServiceError?: Error;
}) => {
	vi.spyOn(Container, 'get').mockImplementation((token) => {
		if (token === ModuleRegistry) {
			return moduleRegistry;
		}

		if (token === McpSettingsService) {
			if (mcpSettingsServiceError) {
				throw mcpSettingsServiceError;
			}

			return mcpSettingsService;
		}

		throw new Error('Unexpected dependency requested');
	});
};

describe('mcpEnabledForDiscovery', () => {
	const req = {} as Request;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns 404 with Cache-Control: no-store when the MCP module is not loaded', async () => {
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(false) };
		mockContainerGet({ moduleRegistry });
		const res = createResponse();
		const next = createNext();

		await mcpEnabledForDiscovery(req, res, next);

		expect(moduleRegistry.isActive).toHaveBeenCalledWith('mcp');
		expectNotFound(res, next);
	});

	it('returns 404 with Cache-Control: no-store when McpSettingsService is missing', async () => {
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(true) };
		mockContainerGet({
			moduleRegistry,
			mcpSettingsServiceError: new Error('Service not registered'),
		});
		const res = createResponse();
		const next = createNext();

		await mcpEnabledForDiscovery(req, res, next);

		expectNotFound(res, next);
	});

	it('returns 404 with Cache-Control: no-store when the MCP discovery toggle is disabled', async () => {
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(true) };
		const mcpSettingsService = { getEnabled: vi.fn().mockResolvedValue(false) };
		mockContainerGet({ moduleRegistry, mcpSettingsService });
		const res = createResponse();
		const next = createNext();

		await mcpEnabledForDiscovery(req, res, next);

		expect(mcpSettingsService.getEnabled).toHaveBeenCalledTimes(1);
		expectNotFound(res, next);
	});

	it('calls next() when the MCP module is loaded and the discovery toggle is enabled', async () => {
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(true) };
		const mcpSettingsService = { getEnabled: vi.fn().mockResolvedValue(true) };
		mockContainerGet({ moduleRegistry, mcpSettingsService });
		const res = createResponse();
		const next = createNext();

		await mcpEnabledForDiscovery(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});

	it('forwards unexpected getEnabled errors via next(error)', async () => {
		const error = new Error('DB timeout');
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(true) };
		const mcpSettingsService = { getEnabled: vi.fn().mockRejectedValue(error) };
		mockContainerGet({ moduleRegistry, mcpSettingsService });
		const res = createResponse();
		const next = createNext();

		await mcpEnabledForDiscovery(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith(error);
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});
});
