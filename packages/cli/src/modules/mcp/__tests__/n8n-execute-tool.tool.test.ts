import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ExecuteNodeService } from '@/executions/execute-node.service';
import type { ExecuteNodeResult } from '@/executions/execute-node.service';
import { NodeCatalogService } from '@/node-catalog';
import { Telemetry } from '@/telemetry';

import { createN8nExecuteToolTool } from '../tools/n8n-execute-tool.tool';

const buildNodeDescription = (name: string): INodeTypeDescription =>
	({
		name,
		displayName: name,
		credentials: [],
	}) as unknown as INodeTypeDescription;

const buildSuccessResult = (overrides: Partial<ExecuteNodeResult> = {}): ExecuteNodeResult => ({
	executionId: 'exec-1',
	status: 'success',
	output: [],
	...overrides,
});

type HandlerInput = {
	id: string;
	credentialId: string;
	params: Record<string, unknown>;
	dryRun: boolean;
	sessionId: string;
};

/**
 * Build a fully-populated handler input. The MCP SDK's `ToolCallback` type
 * widens optional zod fields to required-at-runtime, so we pass every key
 * explicitly. Optional fields default to `undefined` (cast via `unknown`).
 */
const buildInput = (overrides: Partial<HandlerInput>): HandlerInput => ({
	id: overrides.id ?? '',
	params: overrides.params ?? {},
	credentialId: overrides.credentialId ?? (undefined as unknown as string),
	dryRun: overrides.dryRun ?? (undefined as unknown as boolean),
	sessionId: overrides.sessionId ?? (undefined as unknown as string),
});

describe('n8n_execute_tool MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (
		knownNodeTypes: string[] = ['n8n-nodes-base.slack', 'n8n-nodes-base.set'],
		executeResult: ExecuteNodeResult | Error = buildSuccessResult(),
	) => {
		const execute =
			executeResult instanceof Error
				? jest.fn().mockRejectedValue(executeResult)
				: jest.fn().mockResolvedValue(executeResult);
		const executeNodeService = mockInstance(ExecuteNodeService, { execute });
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const getNodeType = jest.fn((id: string): INodeTypeDescription | null => {
			return knownNodeTypes.includes(id) ? buildNodeDescription(id) : null;
		});
		const nodeCatalogService = mockInstance(NodeCatalogService, {
			getNodeTypeParser: jest.fn().mockReturnValue({
				getNodeType,
				searchNodeTypes: jest.fn().mockReturnValue([]),
			}),
		});
		return { executeNodeService, telemetry, nodeCatalogService, getNodeType };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			expect(tool.name).toBe('n8n_execute_tool');
			expect(tool.config.description).toEqual(expect.any(String));
			expect(tool.config.inputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler', () => {
		test('parses id into nodeType + resource + operation, calls ExecuteNodeService', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(
				buildInput({
					id: 'slack.message.send',
					credentialId: 'c1',
					params: { channel: '#x', text: 'hi' },
				}),
				{} as never,
			);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					user,
					nodeType: 'n8n-nodes-base.slack',
					credentialId: 'c1',
					parameters: expect.objectContaining({
						resource: 'message',
						operation: 'send',
						channel: '#x',
						text: 'hi',
					}),
				}),
			);
		});

		test('passes dryRun through', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(
				buildInput({
					id: 'slack.message.send',
					dryRun: true,
					params: {},
				}),
				{} as never,
			);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({ dryRun: true }),
			);
		});

		test('handles ids with no resource (single segment after node)', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json' }), {} as never);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: 'n8n-nodes-base.set',
					parameters: expect.objectContaining({ operation: 'json' }),
				}),
			);
			const callArg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(callArg.parameters).not.toHaveProperty('resource');
		});

		test('handles ids with only a node type (no operation)', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set', params: { value: 1 } }), {} as never);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: 'n8n-nodes-base.set',
					parameters: expect.objectContaining({ value: 1 }),
				}),
			);
			const callArg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(callArg.parameters).not.toHaveProperty('resource');
			expect(callArg.parameters).not.toHaveProperty('operation');
		});

		test('respects already-prefixed node-type ids', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks([
				'n8n-nodes-base.set',
			]);

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'n8n-nodes-base.set.json' }), {} as never);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: 'n8n-nodes-base.set',
					parameters: expect.objectContaining({ operation: 'json' }),
				}),
			);
		});

		test('respects @n8n/n8n-nodes-langchain.* prefixes', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks([
				'@n8n/n8n-nodes-langchain.agent',
			]);

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: '@n8n/n8n-nodes-langchain.agent.run' }), {} as never);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					parameters: expect.objectContaining({ operation: 'run' }),
				}),
			);
		});

		test('passes caller metadata with kind="mcp"', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json' }), {} as never);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					caller: expect.objectContaining({ kind: 'mcp' }),
				}),
			);
		});

		test('returns the result from ExecuteNodeService', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks(
				undefined,
				buildSuccessResult({
					executionId: 'e1',
					status: 'success',
					output: [{ ok: true } as unknown],
					executionUrl: 'http://localhost/exec/e1',
				}),
			);

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			const result = await tool.handler(buildInput({ id: 'set.json' }), {} as never);

			expect(result.structuredContent).toMatchObject({
				executionId: 'e1',
				status: 'success',
				executionUrl: 'http://localhost/exec/e1',
			});
		});

		test('tracks telemetry on success', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);
			await tool.handler(buildInput({ id: 'slack.message.send' }), {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'n8n_execute_tool',
					results: expect.objectContaining({ success: true }),
				}),
			);
		});

		test('returns isError and tracks failure when ExecuteNodeService throws', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks(
				undefined,
				new Error('node blew up'),
			);

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);
			const result = await tool.handler(buildInput({ id: 'slack.message.send' }), {} as never);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				status: 'error',
				error: expect.objectContaining({ message: 'node blew up' }),
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'n8n_execute_tool',
					results: expect.objectContaining({ success: false }),
				}),
			);
		});

		test('forwards sessionId from tool input to executeNodeService (overrides transport)', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(
				buildInput({
					id: 'set.json',
					params: { mode: 'raw' },
					sessionId: 'agent-conv-123',
				}),
				// Agent-supplied sessionId must win over any transport-provided value.
				{ sessionId: 'transport-should-be-ignored' } as never,
			);

			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					caller: expect.objectContaining({
						kind: 'mcp',
						name: 'mcp-server',
						sessionId: 'agent-conv-123',
					}),
				}),
			);
		});

		test('defaults sessionId to the transport sessionId from MCP extra', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json', params: { mode: 'raw' } }), {
				sessionId: 'transport-abc',
			} as never);

			const arg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(arg.caller.sessionId).toBe('transport-abc');
		});

		test('defaults sessionId to the mcp-session-id request header when SDK sessionId is absent', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json', params: { mode: 'raw' } }), {
				requestInfo: { headers: { 'mcp-session-id': 'header-session-xyz' } },
			} as never);

			const arg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(arg.caller.sessionId).toBe('header-session-xyz');
		});

		test('prefers SDK extra.sessionId over the mcp-session-id header when both are present', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json', params: { mode: 'raw' } }), {
				sessionId: 'transport-wins',
				requestInfo: { headers: { 'mcp-session-id': 'header-loses' } },
			} as never);

			const arg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(arg.caller.sessionId).toBe('transport-wins');
		});

		test('omits sessionId when no input, transport, and header are provided', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json', params: { mode: 'raw' } }), {} as never);

			const arg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(arg.caller.sessionId).toBeUndefined();
		});

		test('treats whitespace-only mcp-session-id header as absent', async () => {
			const { executeNodeService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'set.json', params: { mode: 'raw' } }), {
				requestInfo: { headers: { 'mcp-session-id': '   ' } },
			} as never);

			const arg = (executeNodeService.execute as jest.Mock).mock.calls[0][0];
			expect(arg.caller.sessionId).toBeUndefined();
		});

		test('uses NodeCatalog parser for longest matching prefix when ambiguous', async () => {
			// Catalog knows about n8n-nodes-base.slack but NOT n8n-nodes-base.message,
			// so "slack.message.send" should resolve to nodeType=n8n-nodes-base.slack
			// (resource=message, operation=send). Verifies parser is consulted.
			const { executeNodeService, telemetry, nodeCatalogService, getNodeType } = createMocks([
				'n8n-nodes-base.slack',
			]);

			const tool = createN8nExecuteToolTool(
				user,
				executeNodeService,
				nodeCatalogService,
				telemetry,
			);

			await tool.handler(buildInput({ id: 'slack.message.send' }), {} as never);

			expect(getNodeType).toHaveBeenCalled();
			expect(executeNodeService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: 'n8n-nodes-base.slack',
					parameters: expect.objectContaining({ resource: 'message', operation: 'send' }),
				}),
			);
		});
	});
});
