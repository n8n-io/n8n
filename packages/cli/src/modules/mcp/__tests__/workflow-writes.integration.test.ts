import { InstanceWriteAccessService } from '@n8n/backend-services';
import { createWorkflow, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { McpServerApiKeyService } from '../mcp-api-key.service';
import { McpSettingsService } from '../mcp.settings.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

mockInstance(AiGatewayService, {
	isAvailable: vi.fn().mockResolvedValue({ available: false }),
});
mockInstance(CollaborationService, {
	ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
	broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
});

describe('MCP workflow writes', () => {
	let owner: User;
	let apiKey: string;
	let originalBuilderEnabled: boolean;

	beforeAll(async () => {
		vi.mocked(Container.get(PostHogClient).getFeatureFlags).mockResolvedValue({});
		const config = Container.get(GlobalConfig);
		originalBuilderEnabled = config.endpoints.mcpBuilderEnabled;
		config.endpoints.mcpBuilderEnabled = true;
		await Container.get(McpSettingsService).setEnabled(true);
		owner = await createOwner();
		apiKey = (await Container.get(McpServerApiKeyService).createMcpServerApiKey(owner)).apiKey;
	});

	afterEach(() => {
		Container.get(SourceControlPreferencesService).sourceControlPreferences = {
			branchReadOnly: false,
		};
	});

	afterAll(async () => {
		Container.get(GlobalConfig).endpoints.mcpBuilderEnabled = originalBuilderEnabled;
		await Container.get(McpSettingsService).setEnabled(false);
	});

	test.each([false, true])(
		'respects branchReadOnly=%s when renaming a workflow',
		async (readOnly) => {
			const reportedErrors = vi.spyOn(Container.get(ErrorReporter), 'error');
			const workflow = await createWorkflow(
				{
					name: 'Original workflow',
					nodes: [],
					connections: {},
					settings: { availableInMCP: true },
				},
				owner,
			);
			Container.get(SourceControlPreferencesService).sourceControlPreferences = {
				branchReadOnly: readOnly,
			};
			expect(Container.get(InstanceWriteAccessService).isReadOnly()).toBe(readOnly);

			const response = await testServer.restlessAgent
				.post('/mcp-server/http')
				.set('Authorization', `Bearer ${apiKey}`)
				.set('Accept', 'application/json, text/event-stream')
				.set('MCP-Protocol-Version', '2025-06-18')
				.send({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: 'update_workflow',
						arguments: {
							workflowId: workflow.id,
							operations: [{ type: 'setWorkflowMetadata', name: 'Renamed workflow' }],
						},
					},
				});

			expect(
				response.status,
				`${response.text}\n${reportedErrors.mock.calls.map(([error]) => String(error)).join('\n')}`,
			).toBe(200);
			const message = response.text.split('\n').find((line: string) => line.startsWith('data: '));
			expect(message).toBeDefined();
			const body = JSON.parse(message!.slice(6)) as {
				result?: { isError?: boolean; structuredContent?: unknown };
				error?: unknown;
			};
			expect(body.error).toBeUndefined();
			const saved = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id });
			expect.soft(saved.name).toBe(readOnly ? 'Original workflow' : 'Renamed workflow');
			expect.soft(body.result?.isError ?? false, JSON.stringify(body)).toBe(readOnly);
		},
	);
});
