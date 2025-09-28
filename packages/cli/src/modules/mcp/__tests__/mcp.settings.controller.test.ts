import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { ApiKey, GLOBAL_OWNER_ROLE, AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ForbiddenError } from '../../../errors/response-errors/forbidden.error';
import { McpServerApiKeyService } from '../mcp-api-key.service';
import { McpSettingsController } from '../mcp.settings.controller';
import { McpSettingsService } from '../mcp.settings.service';
import { UpdateMcpSettingsDto } from '../update-mcp-settings.dto';

const createReq = (body: unknown, roleSlug: string): AuthenticatedRequest =>
	({ body, user: { role: { slug: roleSlug } } }) as unknown as AuthenticatedRequest;

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

	test('gets settings correctly', async () => {
		mcpSettingsService.getEnabled.mockResolvedValue(true);
		await expect(controller.getSettings()).resolves.toEqual({ mcpAccessEnabled: true });
		mcpSettingsService.getEnabled.mockResolvedValue(false);
		await expect(controller.getSettings()).resolves.toEqual({ mcpAccessEnabled: false });
	});

	describe('updateSettings', () => {
		test('prevents non-owners from updating MCP access', async () => {
			const req = createReq({ mcpAccessEnabled: false }, 'member');
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: false });
			const res = new Response();
			await expect(controller.updateSettings(req, res, dto)).rejects.toBeInstanceOf(ForbiddenError);
		});

		test('disables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: false }, GLOBAL_OWNER_ROLE.slug);
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: false });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue({ mcpAccessEnabled: false });

			const res = new Response();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(result).toEqual({ mcpAccessEnabled: false });
		});

		test('enables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: true }, GLOBAL_OWNER_ROLE.slug);
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue({ mcpAccessEnabled: true });

			const res = new Response();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
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

		test('returns existing API key when found', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;
			mcpServerApiKeyService.findServerApiKeyForUser.mockResolvedValue(mockApiKey);

			const result = await controller.getApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.findServerApiKeyForUser).toHaveBeenCalledWith(mockUser);
			expect(mcpServerApiKeyService.createMcpServerApiKey).not.toHaveBeenCalled();
			expect(result).toEqual(mockApiKey);
		});

		test('creates and returns new API key when none exists', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			mcpServerApiKeyService.findServerApiKeyForUser.mockResolvedValue(null);
			mcpServerApiKeyService.createMcpServerApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.getApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.findServerApiKeyForUser).toHaveBeenCalledWith(mockUser);
			expect(mcpServerApiKeyService.createMcpServerApiKey).toHaveBeenCalledWith(mockUser);
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

		test('successfully rotates existing API key', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			mcpServerApiKeyService.findServerApiKeyForUser.mockResolvedValue(mockApiKey);
			mcpServerApiKeyService.deleteApiKeyForUser.mockResolvedValue(undefined);
			mcpServerApiKeyService.createMcpServerApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.rotateApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.findServerApiKeyForUser).toHaveBeenCalledWith(mockUser);
			expect(mcpServerApiKeyService.deleteApiKeyForUser).toHaveBeenCalledWith(mockUser);
			expect(mcpServerApiKeyService.createMcpServerApiKey).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(mockApiKey);
		});

		test('throws BadRequestError when no existing API key to rotate', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			mcpServerApiKeyService.findServerApiKeyForUser.mockResolvedValue(null);

			await expect(controller.rotateApiKeyForMcpServer(req)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			await expect(controller.rotateApiKeyForMcpServer(req)).rejects.toThrow(
				'No existing MCP server API key to rotate',
			);

			expect(mcpServerApiKeyService.findServerApiKeyForUser).toHaveBeenCalledWith(mockUser);
			expect(mcpServerApiKeyService.deleteApiKeyForUser).not.toHaveBeenCalled();
			expect(mcpServerApiKeyService.createMcpServerApiKey).not.toHaveBeenCalled();
		});
	});
});
