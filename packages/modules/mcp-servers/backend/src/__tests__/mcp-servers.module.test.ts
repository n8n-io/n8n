import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';

import { RefreshTokenPort } from '../access/refresh-token-port';
import { McpServersModule } from '../mcp-servers.module';
import { McpServerProtectedResource } from '../runtime/mcp-server-protected-resource';
import { OAuthClientNamePort } from '../tools/oauth-client-name-port';
import { TextDraftPort } from '../tools/text-draft-port';
import { McpServerToolAdapters, WorkflowToolPort } from '../tools/workflow-tool-port';

// The REST routes have their integration tests in the CLI. Their imports only slow this test.
vi.mock('../controllers/mcp-servers.controller', () => ({}));
vi.mock('../controllers/mcp-server-tools.controller', () => ({}));
vi.mock('../runtime/mcp-server-runtime.controller', () => ({}));
vi.mock('../access/mcp-server-access.controller', () => ({}));

describe('McpServersModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('mcp-servers')?.class).toBe(McpServersModule);
	});

	it('takes the adapters from the CLI at init', async () => {
		const workflows = mock<WorkflowToolPort>();
		const textDrafts = mock<TextDraftPort>();
		const clients = mock<OAuthClientNamePort>();
		const refreshTokens = mock<RefreshTokenPort>();
		Container.set(McpServerToolAdapters, {
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
