import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { McpServersModule } from '../mcp-servers.module';

describe('McpServersModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('mcp-servers')?.class).toBe(McpServersModule);
	});
});
