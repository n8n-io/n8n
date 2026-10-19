import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import { mock } from 'vitest-mock-extended';

import type { ExecutionListService } from '@/executions/execution-list.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { shapeToStandardSchema } from '../tool-schema.util';
import { createSearchExecutionsTool } from '../tools/search-executions.tool';

test('refreshes a cached execution output schema after an upgrade over stateless HTTP', async () => {
	const executionListService = mock<ExecutionListService>();
	executionListService.buildSharingOptions.mockResolvedValue({});
	executionListService.findPageWithCount.mockResolvedValue({
		results: [],
		count: 0,
		estimated: false,
		nextCursor: null,
	});
	const workflowFinderService = mock<WorkflowFinderService>();
	workflowFinderService.findWorkflowForUser.mockResolvedValue(
		mock<NonNullable<Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>>>>({
			id: 'wf-1',
			isArchived: false,
			settings: { availableInMCP: true },
		}),
	);
	const tool = createSearchExecutionsTool(
		mock<User>({ id: 'user-1' }),
		executionListService,
		workflowFinderService,
		mock<Telemetry>(),
	);
	if (!tool.config.inputSchema || !tool.config.outputSchema)
		throw new Error('Missing tool schemas');
	const inputSchema = shapeToStandardSchema(tool.config.inputSchema);
	const currentOutput = tool.config.outputSchema;
	// Version 2.39.8 did not declare nextCursor and rejected extra output properties.
	const { nextCursor: _nextCursor, ...oldOutput } = currentOutput;
	let upgraded = false;
	const handler = createMcpHandler(
		() => {
			const server = new McpServer({ name: 'n8n MCP Server', version: '1.1.0' });
			server.registerTool(
				tool.name,
				{
					inputSchema,
					outputSchema: shapeToStandardSchema(upgraded ? currentOutput : oldOutput),
				},
				async (args) => {
					const result = await tool.handler(args);
					if (upgraded) return result;
					if (!isRecord(result.structuredContent)) throw new Error('Missing structured content');
					const { nextCursor: _cursor, ...legacy } = result.structuredContent;
					return {
						content: [{ type: 'text', text: JSON.stringify(legacy) }],
						structuredContent: legacy,
					};
				},
			);
			return server;
		},
		{ legacy: 'stateless' },
	);
	const client = new Client({ name: 'schema-upgrade-test', version: '1.0.0' });
	try {
		await client.connect(
			new StreamableHTTPClientTransport(new URL('http://localhost/mcp-server/http'), {
				fetch: async (url, init) => await handler.fetch(new Request(url, init)),
			}),
		);
		const before = await client.listTools();
		expect(before.tools[0].outputSchema?.properties).not.toHaveProperty('nextCursor');
		const args = { name: tool.name, arguments: { workflowId: 'wf-1', limit: 5 } };
		await expect(client.callTool(args)).resolves.toMatchObject({ structuredContent: { data: [] } });
		upgraded = true;
		await expect(client.callTool(args)).rejects.toThrow(
			"Structured content does not match the tool's output schema: data must NOT have additional properties",
		);
		const after = await client.listTools();
		expect(after.tools[0].outputSchema?.properties).toHaveProperty('nextCursor');
		await expect(client.callTool(args)).resolves.toMatchObject({
			structuredContent: { data: [], count: 0, estimated: false, nextCursor: null },
		});
	} finally {
		await client.close();
		await handler.close();
	}
});
