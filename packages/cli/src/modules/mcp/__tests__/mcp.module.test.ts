import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpModule } from '../mcp.module';
import { McpSettingsService } from '../mcp.settings.service';

describe('McpModule.settings', () => {
	const mcpSettingsService = mock<McpSettingsService>();

	beforeEach(() => {
		vi.restoreAllMocks();
		mcpSettingsService.getEnabled.mockResolvedValue(true);
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);

		// `settings()` resolves its dependencies from the container at call time,
		// so stub the container rather than injecting constructor mocks.
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) =>
			token === McpSettingsService ? mcpSettingsService : mock(),
		);
	});

	it('exposes autoExposeNewWorkflows to the frontend', async () => {
		const settings = await new McpModule().settings();

		expect(settings).toMatchObject({ autoExposeNewWorkflows: true });
	});

	it('reports the setting as off when disabled', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);

		const settings = await new McpModule().settings();

		expect(settings).toMatchObject({ autoExposeNewWorkflows: false });
	});
});
