import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import Ajv2020 from 'ajv/dist/2020';
import type { ExecutionSummary } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionListService } from '@/executions/execution-list.service';
import { encodeExecutionCursor } from '@/executions/execution-cursor';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { shapeToStandardSchema } from '../tool-schema.util';
import { createSearchExecutionsTool } from '../tools/search-executions.tool';

// CONTEXT-242: Validate the wire response, including the schema change during an upgrade.
describe('search executions output schema', () => {
	const executionListService = mock<ExecutionListService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const telemetry = mock<Telemetry>();
	const user = mock<User>({ id: 'user-1' });
	let server: McpServer;
	let client: Client;

	beforeEach(() => {
		vi.resetAllMocks();
		executionListService.buildSharingOptions.mockResolvedValue({});
		executionListService.findPageWithCount.mockResolvedValue({
			results: [],
			count: 0,
			estimated: false,
			nextCursor: null,
		});
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			isArchived: false,
			settings: { availableInMCP: true },
		} as Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>>);
		server = new McpServer({ name: 'n8n MCP Server', version: '1.1.0' });
		client = new Client({ name: 'context-242-reproduction', version: '1.0.0' });
	});

	afterEach(async () => {
		await client.close();
		await server.close();
	});

	const createTool = () =>
		createSearchExecutionsTool(user, executionListService, workflowFinderService, telemetry);

	async function connect() {
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
		await client.connect(clientTransport);
	}

	function registerTool() {
		const tool = createTool();
		if (!tool.config.outputSchema) throw new Error('Missing output schema');
		return server.registerTool(
			tool.name,
			{
				...tool.config,
				inputSchema: shapeToStandardSchema(tool.config.inputSchema!),
				outputSchema: shapeToStandardSchema(tool.config.outputSchema),
			},
			tool.handler,
		);
	}

	test.each([
		'empty',
		'populated',
		'unknown count',
		'query error',
		'access error',
		'invalid cursor',
	])('accepts the current schema with %s results', async (scenario) => {
		if (scenario === 'populated') {
			executionListService.findPageWithCount.mockResolvedValue({
				results: [
					mock<ExecutionSummary>({
						id: '1',
						workflowId: 'wf-1',
						status: 'new',
						mode: 'manual',
						startedAt: null,
						stoppedAt: undefined,
						waitTill: undefined,
					}),
				],
				count: 2,
				estimated: false,
				nextCursor: encodeExecutionCursor({
					version: 1,
					v1: { id: '1', timestamp: '2026-10-12T10:00:00.000Z' },
				}),
			});
		} else if (scenario === 'unknown count') {
			executionListService.findPageWithCount.mockResolvedValue({
				results: [],
				count: -1,
				estimated: true,
				nextCursor: null,
			});
		} else if (scenario === 'query error') {
			executionListService.findPageWithCount.mockRejectedValue(new Error('Database unavailable'));
		} else if (scenario === 'access error') {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
		}
		registerTool();
		await connect();
		const { tools } = await client.listTools();
		const result = await client.callTool({
			name: 'search_workflow_executions',
			arguments: {
				workflowId: 'wf-1',
				limit: 5,
				...(scenario === 'invalid cursor' ? { cursor: 'invalid' } : {}),
			},
		});
		const validate = new Ajv2020({ strict: false }).compile(tools[0].outputSchema!);
		expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
		expect(result.isError ?? false).toBe(
			['query error', 'access error', 'invalid cursor'].includes(scenario),
		);
	});

	test('reproduces the reported error with the 2.39.8 schema and clears it after tools/list', async () => {
		const tool = createTool();
		if (!tool.config.outputSchema) throw new Error('Missing output schema');
		// The release diff adds only nextCursor to this output schema.
		const { nextCursor: _nextCursor, ...oldShape } = tool.config.outputSchema;
		const registered = server.registerTool(
			tool.name,
			{
				inputSchema: shapeToStandardSchema(tool.config.inputSchema!),
				outputSchema: shapeToStandardSchema(oldShape),
			},
			async () => ({
				content: [{ type: 'text', text: '{"data":[],"count":0,"estimated":false}' }],
				structuredContent: { data: [], count: 0, estimated: false },
			}),
		);
		await connect();
		const before = await client.listTools();
		const args = { name: tool.name, arguments: { workflowId: 'wf-1', limit: 5 } };
		await expect(client.callTool(args)).resolves.toMatchObject({ structuredContent: { data: [] } });
		registered.update({
			outputSchema: shapeToStandardSchema(tool.config.outputSchema),
			callback: tool.handler,
		});
		await expect(client.callTool(args)).rejects.toThrow(
			"Structured content does not match the tool's output schema: data must NOT have additional properties",
		);
		const response = await tool.handler({ workflowId: 'wf-1', limit: 5 });
		const validateOld = new Ajv2020({ strict: false }).compile(before.tools[0].outputSchema!);
		expect(validateOld(response.structuredContent)).toBe(false);
		expect(validateOld.errors).toContainEqual(
			expect.objectContaining({
				instancePath: '',
				keyword: 'additionalProperties',
				params: { additionalProperty: 'nextCursor' },
			}),
		);
		const after = await client.listTools();
		expect(after.tools).toHaveLength(before.tools.length);
		expect(after.tools[0].outputSchema?.properties).toHaveProperty('nextCursor');
		await expect(client.callTool(args)).resolves.toMatchObject({
			structuredContent: { data: [], count: 0, estimated: false, nextCursor: null },
		});
	});

	test('reproduces the upgrade failure through the stateless HTTP handler', async () => {
		let upgraded = false;
		const tool = createTool();
		if (!tool.config.outputSchema) throw new Error('Missing output schema');
		const { nextCursor: _nextCursor, ...oldShape } = tool.config.outputSchema;
		const handler = createMcpHandler(
			() => {
				const requestServer = new McpServer({ name: 'n8n MCP Server', version: '1.1.0' });
				requestServer.registerTool(
					tool.name,
					{
						inputSchema: shapeToStandardSchema(tool.config.inputSchema!),
						outputSchema: shapeToStandardSchema(upgraded ? tool.config.outputSchema! : oldShape),
					},
					async (args) => {
						const result = await tool.handler(args);
						if (upgraded) return result;
						if (!isRecord(result.structuredContent)) throw new Error('Missing structured content');
						const { nextCursor: _cursor, ...oldOutput } = result.structuredContent!;
						return {
							content: [{ type: 'text', text: JSON.stringify(oldOutput) }],
							structuredContent: oldOutput,
						};
					},
				);
				return requestServer;
			},
			{ legacy: 'stateless' },
		);
		const requests: string[] = [];
		await client.connect(
			new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp-server/http'), {
				fetch: async (url, init) => {
					const request = new Request(url, init);
					if (request.method === 'POST') requests.push((await request.clone().json()).method);
					return await handler.fetch(request);
				},
			}),
		);
		await client.listTools();
		const args = { name: tool.name, arguments: { workflowId: 'wf-1', limit: 5 } };
		await expect(client.callTool(args)).resolves.toMatchObject({ structuredContent: { data: [] } });
		upgraded = true;
		await expect(client.callTool(args)).rejects.toThrow(
			"Structured content does not match the tool's output schema: data must NOT have additional properties",
		);
		await client.listTools();
		await expect(client.callTool(args)).resolves.toMatchObject({
			structuredContent: { data: [], nextCursor: null },
		});
		expect(requests.filter((method) => method === 'tools/list')).toHaveLength(2);
	});
});
