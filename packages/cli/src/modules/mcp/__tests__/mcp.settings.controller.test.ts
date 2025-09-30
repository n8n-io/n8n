import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';

import { ForbiddenError } from '../../../errors/response-errors/forbidden.error';
import { UpdateMcpSettingsDto } from '../dto/update-mcp-settings.dto';
import { McpSettingsController } from '../mcp.settings.controller';
import { McpSettingsService } from '../mcp.settings.service';

const createReq = (body: unknown, roleSlug: string): AuthenticatedRequest =>
	({ body, user: { role: { slug: roleSlug } } }) as unknown as AuthenticatedRequest;

describe('McpSettingsController', () => {
	const logger = mock<Logger>();
	const moduleRegistry = mockDeep<ModuleRegistry>();
	const mcpSettingsService = mock<McpSettingsService>();

	let controller: McpSettingsController;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.set(Logger, logger);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(ModuleRegistry, moduleRegistry);
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
});
