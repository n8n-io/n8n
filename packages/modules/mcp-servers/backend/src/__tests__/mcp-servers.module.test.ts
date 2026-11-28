import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';

import { McpServersModule } from '../mcp-servers.module';
import { McpServerAdapters } from '../ports/mcp-server-adapters';
import { OAuthClientNamePort } from '../ports/oauth-client-name.port';
import { RefreshTokenPort } from '../ports/refresh-token.port';
import { TextDraftPort } from '../ports/text-draft.port';
import { WorkflowToolPort } from '../ports/workflow-tool.port';
import { McpServerProtectedResource } from '../services/mcp-server-protected-resource.service';

// The REST routes have their integration tests in the CLI. Their imports only slow this test.
vi.mock('../controllers/mcp-servers.controller', () => ({}));
vi.mock('../controllers/mcp-server-tools.controller', () => ({}));
vi.mock('../controllers/mcp-server-runtime.controller', () => ({}));
vi.mock('../controllers/mcp-server-access.controller', () => ({}));

describe('McpServersModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('mcp-servers')?.class).toBe(McpServersModule);
	});

	it('takes the adapters from the CLI at init', async () => {
		const workflows = mock<WorkflowToolPort>();
		const textDrafts = mock<TextDraftPort>();
		const clients = mock<OAuthClientNamePort>();
		const refreshTokens = mock<RefreshTokenPort>();
		Container.set(McpServerAdapters, {
			resolve: () => ({ workflows, textDrafts, clients, refreshTokens }),
		});
		Container.set(McpServerProtectedResource, mock<McpServerProtectedResource>());
		const registry = mock<ProtectedResourceRegistry>();
		Container.set(ProtectedResourceRegistry, registry);

		await new McpServersModule().init();

		expect(Container.get(WorkflowToolPort)).toBe(workflows);
		expect(Container.get(TextDraftPort)).toBe(textDrafts);
		expect(Container.get(OAuthClientNamePort)).toBe(clients);
		expect(Container.get(RefreshTokenPort)).toBe(refreshTokens);
		expect(registry.registerResolver).toHaveBeenCalledWith(
			Container.get(McpServerProtectedResource),
		);
	});
});
