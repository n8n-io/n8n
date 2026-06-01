import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

import { McpSettingsLoader } from '../loaders/mcp-settings.loader';

describe('McpSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const mcpSettingsService = mock<McpSettingsService>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			mcpManagedByEnv: false,
			mcpAccessEnabled: false,
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new McpSettingsLoader(config, mcpSettingsService, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	describe('gating', () => {
		it('returns "skipped" when mcpManagedByEnv is false', async () => {
			const loader = createLoader({ mcpManagedByEnv: false, mcpAccessEnabled: true });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mcpSettingsService.setEnabled).not.toHaveBeenCalled();
		});
	});

	describe('when mcpManagedByEnv is true', () => {
		it('enables MCP access when mcpAccessEnabled is true', async () => {
			const loader = createLoader({ mcpManagedByEnv: true, mcpAccessEnabled: true });

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
		});

		it('disables MCP access when mcpAccessEnabled is false', async () => {
			const loader = createLoader({ mcpManagedByEnv: true, mcpAccessEnabled: false });

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(false);
		});
	});
});
