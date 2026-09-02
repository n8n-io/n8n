import type { ModuleRegistry, Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ChatHubSettingsController } from '../chat-hub.settings.controller';
import type { ChatHubSettingsService } from '../chat-hub.settings.service';

describe('ChatHubSettingsController', () => {
	const settings = mock<ChatHubSettingsService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const controller = new ChatHubSettingsController(settings, logger, moduleRegistry);

	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setEnabled', () => {
		it('should persist the flag and refresh module settings', async () => {
			const result = await controller.setEnabled(req, res, { enabled: false });

			expect(settings.setEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('chat-hub');
			expect(result).toEqual({ enabled: false });
		});

		it('should still resolve when the module registry refresh fails', async () => {
			moduleRegistry.refreshModuleSettings.mockRejectedValueOnce(new Error('boom'));

			const result = await controller.setEnabled(req, res, { enabled: true });

			expect(settings.setEnabled).toHaveBeenCalledWith(true);
			expect(logger.warn).toHaveBeenCalled();
			expect(result).toEqual({ enabled: true });
		});

		it('re-enables chat regardless of the current disabled state', async () => {
			// The disabled-state gate lives on ChatHubController, not here, so this
			// endpoint must stay reachable to turn the feature back on.
			const result = await controller.setEnabled(req, res, { enabled: true });

			expect(settings.setEnabled).toHaveBeenCalledWith(true);
			expect(result).toEqual({ enabled: true });
		});
	});
});
