import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { type ApiKey, type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';

import { UpdateMcpSettingsDto } from '../dto/update-mcp-settings.dto';
import { McpServerApiKeyService } from '../mcp-api-key.service';
import { McpSettingsController } from '../mcp.settings.controller';
import { McpSettingsService } from '../mcp.settings.service';

const createReq = (body: unknown): AuthenticatedRequest =>
	({ body }) as unknown as AuthenticatedRequest;

describe('McpSettingsController', () => {
	const logger = mock<Logger>();
	const moduleRegistry = mockDeep<ModuleRegistry>();
	const mcpSettingsService = mock<McpSettingsService>();
	const mcpServerApiKeyService = mockDeep<McpServerApiKeyService>();

	let controller: McpSettingsController;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.set(Logger, logger);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(ModuleRegistry, moduleRegistry);
		Container.set(McpServerApiKeyService, mcpServerApiKeyService);
		controller = Container.get(McpSettingsController);
	});

	describe('updateSettings', () => {
		test('disables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: false });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: false });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue(null);

			const res = new Response();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(result).toEqual({ mcpAccessEnabled: false });
		});

		test('enables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: true });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue(null);

			const res = new Response();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(result).toEqual({ mcpAccessEnabled: true });
		});

		test('handles module registry refresh failure gracefully', async () => {
			const req = createReq({ mcpAccessEnabled: true });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });
			const error = new Error('Registry sync failed');

			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockRejectedValue(error);

			const res = new Response();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(logger.warn).toHaveBeenCalledWith('Failed to sync MCP settings to module registry', {
				cause: 'Registry sync failed',
			});
			expect(result).toEqual({ mcpAccessEnabled: true });
		});

		test('requires boolean mcpAccessEnabled value', () => {
			expect(() => new UpdateMcpSettingsDto({} as never)).toThrow();
			expect(() => new UpdateMcpSettingsDto({ mcpAccessEnabled: 'yes' } as never)).toThrow();
		});
	});

	describe('getApiKeyForMcpServer', () => {
		const mockUser = { id: 'user123', role: { slug: 'member' } };
		const mockApiKey = {
			id: 'api-key-123',
			key: 'mcp-key-abc123',
			userId: 'user123',
			createdAt: new Date(),
		} as unknown as ApiKey;

		test('returns API key from getOrCreateApiKey', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;
			mcpServerApiKeyService.getOrCreateApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.getApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.getOrCreateApiKey).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(mockApiKey);
		});
	});

	describe('rotateApiKeyForMcpServer', () => {
		const mockUser = { id: 'user123', role: { slug: 'member' } };
		const mockApiKey = {
			id: 'api-key-123',
			key: 'mcp-key-abc123',
			userId: 'user123',
			createdAt: new Date(),
		} as unknown as ApiKey;

		test('successfully rotates API key', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			mcpServerApiKeyService.rotateMcpServerApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.rotateApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.rotateMcpServerApiKey).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(mockApiKey);
		});
	});
});
