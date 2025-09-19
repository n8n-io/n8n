import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';

import { BadRequestError } from '../../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../../errors/response-errors/forbidden.error';
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
			await expect(controller.updateSettings(req)).rejects.toBeInstanceOf(ForbiddenError);
		});

		test('disables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: false }, GLOBAL_OWNER_ROLE.slug);
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);

			const result = await controller.updateSettings(req);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistry.settings.set).toHaveBeenCalledWith('mcp', { mcpAccessEnabled: false });
			expect(result).toEqual({ mcpAccessEnabled: false });
		});

		test('enables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: true }, GLOBAL_OWNER_ROLE.slug);
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);

			const result = await controller.updateSettings(req);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.settings.set).toHaveBeenCalledWith('mcp', { mcpAccessEnabled: true });
			expect(result).toEqual({ mcpAccessEnabled: true });
		});

		test('handles invalid values correctly', async () => {
			const req1 = createReq({}, GLOBAL_OWNER_ROLE.slug);
			await expect(controller.updateSettings(req1)).rejects.toBeInstanceOf(BadRequestError);

			const req2 = createReq({ mcpAccessEnabled: 'yes' }, GLOBAL_OWNER_ROLE.slug);
			await expect(controller.updateSettings(req2)).rejects.toBeInstanceOf(BadRequestError);
		});
	});
});
