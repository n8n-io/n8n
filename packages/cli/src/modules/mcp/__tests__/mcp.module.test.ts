import { mockInstance } from '@n8n/backend-test-utils';
import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';

import { License } from '@/license';

import { McpProtectedResource } from '../mcp-protected-resource';
import { McpModule } from '../mcp.module';
import { McpSettingsController } from '../mcp.settings.controller';

vi.mock('../mcp.controller', () => ({}));

describe('McpModule', () => {
	it('refreshes the MCP settings when the license certificate changes', async () => {
		const license = mockInstance(License);
		const settingsController = mockInstance(McpSettingsController);
		mockInstance(ProtectedResourceRegistry);
		mockInstance(McpProtectedResource);

		await new McpModule().init();
		const [onCertRefresh] = license.onCertRefresh.mock.calls[0];
		onCertRefresh('cert');

		expect(settingsController.refreshMcpModuleSettings).toHaveBeenCalledTimes(1);
	});
});
