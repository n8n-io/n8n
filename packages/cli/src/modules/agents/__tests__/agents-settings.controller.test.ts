import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { Publisher } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AgentsSettingsController } from '../agents-settings.controller';
import type { AgentsSettingsService } from '../agents-settings.service';

describe('AgentsSettingsController', () => {
	const settingsService = mock<AgentsSettingsService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();
	const controller = new AgentsSettingsController(
		settingsService,
		moduleRegistry,
		publisher,
		logger,
	);

	beforeEach(() => vi.clearAllMocks());

	it('saves the setting, refreshes this process and tells the other mains', async () => {
		await controller.updateSettings(mock<AuthenticatedRequest>(), mock<Response>(), {
			enabled: false,
		});

		expect(settingsService.setEnabled).toHaveBeenCalledWith(false);
		expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-agents-settings' });
	});

	it('still saves the setting when the broadcast fails', async () => {
		const error = new Error('redis down');
		publisher.publishCommand.mockRejectedValueOnce(error);

		await expect(
			controller.updateSettings(mock<AuthenticatedRequest>(), mock<Response>(), { enabled: true }),
		).resolves.toEqual({ enabled: true });
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to notify other main processes of the Agents setting',
			{ error },
		);
	});

	describe('on another main', () => {
		it('reloads the module settings when the command arrives', async () => {
			await controller.reloadSettings();

			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		});

		it('listens for the command on mains only', () => {
			const handlers = Container.get(PubSubMetadata)
				.getHandlers()
				.filter(({ eventName }) => eventName === 'reload-agents-settings');

			expect(handlers).toEqual([
				expect.objectContaining({
					eventHandlerClass: AgentsSettingsController,
					methodName: 'reloadSettings',
					filter: { instanceType: 'main' },
				}),
			]);
		});
	});
});
