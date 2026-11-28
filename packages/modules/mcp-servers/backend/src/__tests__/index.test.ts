import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('public API', () => {
	it('exports the services, config, gate, and ports, and does not register the module', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);

		expect(moduleMetadata.get('mcp-servers')).toBeUndefined();

		const publicApi = await import('../index.js');

		expect(moduleMetadata.get('mcp-servers')).toBeUndefined();
		expect(Object.keys(publicApi).sort()).toEqual([
			'CustomMcpServersFlagGate',
			'McpServerAdapters',
			'McpServerToolsService',
			'McpServersConfig',
			'McpServersService',
			'OAuthClientNamePort',
			'RefreshTokenPort',
			'TextDraftPort',
			'WorkflowToolPort',
		]);
	});
});
