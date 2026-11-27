import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpServersModule } from '../mcp-servers.module';
import { McpServerToolAdapters, WorkflowToolPort } from '../tools/workflow-tool-port';

describe('McpServersModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('mcp-servers')?.class).toBe(McpServersModule);
	});

	it('takes the workflow tool adapter from the CLI at init', async () => {
		const workflows = mock<WorkflowToolPort>();
		Container.set(McpServerToolAdapters, { resolve: () => ({ workflows }) });

		await new McpServersModule().init();

		expect(Container.get(WorkflowToolPort)).toBe(workflows);
	});
});
