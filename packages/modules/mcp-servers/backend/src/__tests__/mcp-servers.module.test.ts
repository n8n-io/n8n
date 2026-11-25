import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpServersModule } from '../mcp-servers.module';
import { TextDraftPort } from '../tools/text-draft-port';
import { McpServerToolAdapters, WorkflowToolPort } from '../tools/workflow-tool-port';

// The REST routes have their integration tests in the CLI. Their imports only slow this test.
vi.mock('../controllers/mcp-servers.controller', () => ({}));
vi.mock('../controllers/mcp-server-tools.controller', () => ({}));

describe('McpServersModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('mcp-servers')?.class).toBe(McpServersModule);
	});

	it('takes the workflow tool and text draft adapters from the CLI at init', async () => {
		const workflows = mock<WorkflowToolPort>();
		const textDrafts = mock<TextDraftPort>();
		Container.set(McpServerToolAdapters, { resolve: () => ({ workflows, textDrafts }) });

		await new McpServersModule().init();

		expect(Container.get(WorkflowToolPort)).toBe(workflows);
		expect(Container.get(TextDraftPort)).toBe(textDrafts);
	});
});
