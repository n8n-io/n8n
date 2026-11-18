import { PostHogClient } from '@n8n/backend-services';
import { createWorkflow, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createToolsFromInstanceMcpServer, type InstanceAiToolRegistry } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import { AiGatewayService } from '@/services/ai-gateway.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { InstanceMcpClientFactory } from '../instance-mcp-client.factory';
import { InstanceMcpServerAdapter } from '../instance-mcp-server';

setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

mockInstance(AiGatewayService, {
	isAvailable: vi.fn().mockResolvedValue({ available: false }),
});

const noopLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

const callBridged = async (tools: InstanceAiToolRegistry, name: string, args: unknown) => {
	const tool = tools.get(name);
	if (!tool?.handler) throw new Error(`${name} was not bridged`);
	return await tool.handler(args, { toolCallId: 'call-1', toolName: name, runId: 'run-1' });
};

/**
 * The whole M1 path against the real server: the Assistant's client lists the
 * instance tools, the bridge turns them into agent tools, and calls run
 * through the protocol into the real tool handlers as the user.
 */
describe('Assistant over the instance MCP server', () => {
	let owner: User;
	let server: InstanceMcpServerAdapter;
	let tools: InstanceAiToolRegistry;
	let groups: Map<string, string>;

	beforeAll(async () => {
		vi.mocked(Container.get(PostHogClient).getFeatureFlags).mockResolvedValue({});
		Container.get(GlobalConfig).endpoints.mcpBuilderEnabled = true;
		owner = await createOwner();
		const client = await Container.get(InstanceMcpClientFactory).createForUser(owner);
		server = await InstanceMcpServerAdapter.create(client);
		({ tools, groups } = createToolsFromInstanceMcpServer({ server, logger: noopLogger }));
	});

	afterAll(async () => {
		await server.close();
	});

	it('lists the builder tools with their group', () => {
		const byName = new Map(server.getTools().map((tool) => [tool.name, tool]));

		expect(server.instructions).toContain('n8n');
		for (const name of ['search_nodes', 'get_node_types', 'explore_node_resources']) {
			expect(byName.get(name)?._meta).toMatchObject({ 'n8n/group': 'nodes' });
			expect(groups.get(name)).toBe('nodes');
		}
		expect(byName.get('search_workflows')?._meta).toMatchObject({ 'n8n/group': 'workflows' });
	});

	it('reads the workflows of the user through a bridged tool', async () => {
		const workflow = await createWorkflow({ name: 'Bridged workflow' }, owner);

		const result = await callBridged(tools, 'search_workflows', { query: 'Bridged' });

		expect(isRecord(result) && result.isError).toBeFalsy();
		expect(isRecord(result) ? result.structuredContent : undefined).toMatchObject({
			data: [expect.objectContaining({ id: workflow.id, name: 'Bridged workflow' })],
		});
	});

	// The workflow is not "available in MCP": a third-party client is refused, the
	// first-party Assistant reads it as its native tools did.
	it('opens a workflow that is not available in MCP, as a first-party client', async () => {
		const workflow = await createWorkflow({ name: 'Not exposed' }, owner);

		const result = await callBridged(tools, 'get_workflow_details', { workflowId: workflow.id });

		expect(isRecord(result) && result.isError).toBeFalsy();
		expect(isRecord(result) ? result.structuredContent : undefined).toMatchObject({
			workflow: expect.objectContaining({ id: workflow.id, name: 'Not exposed' }),
		});
	});

	// The test server loads no node packages, so the search answers empty; the point
	// is that the call reaches the real catalog-backed handler without an error.
	it('runs a node search through a bridged tool', { timeout: 120_000 }, async () => {
		const result = await callBridged(tools, 'search_nodes', { queries: ['slack'] });

		expect(isRecord(result) && result.isError).toBeFalsy();
		expect(isRecord(result) ? result.content : undefined).toEqual([
			expect.objectContaining({ type: 'text', text: expect.stringContaining('slack') }),
		]);
	});
});
