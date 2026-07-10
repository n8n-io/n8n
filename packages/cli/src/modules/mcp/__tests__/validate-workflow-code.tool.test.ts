import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { NodeConnectionTypes } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';

import { createValidateWorkflowCodeTool } from '../tools/workflow-builder/validate-workflow-code.tool';

// Mocks referenced inside vi.mock factories must come from vi.hoisted.
const { mockParseAndValidate, mockStripImportStatements } = vi.hoisted(() => ({
	mockParseAndValidate: vi.fn(),
	mockStripImportStatements: vi.fn((code: string) => code),
}));

vi.mock('@n8n/ai-workflow-builder', () => ({
	// `new ParseValidateHandler()` — use a constructable function, not an arrow.
	ParseValidateHandler: vi.fn(function () {
		return { parseAndValidate: mockParseAndValidate };
	}),
	stripImportStatements: (code: string) => mockStripImportStatements(code),
	CODE_BUILDER_VALIDATE_TOOL: {
		toolName: 'validate_workflow_code',
		displayTitle: 'Validate Workflow Code',
	},
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: {
		toolName: 'create_workflow_from_code',
		displayTitle: 'Create',
	},
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive' },
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
}));

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('validate-workflow-code MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Telemetry;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;

	beforeEach(() => {
		vi.clearAllMocks();

		telemetry = mockInstance(Telemetry, {
			track: vi.fn(),
		});
		nodeTypes = mockInstance(NodeTypes);
		nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
			if (type === '@n8n/n8n-nodes-langchain.agent') {
				return { description: { outputs: [NodeConnectionTypes.Main] } };
			}
			if (type === '@n8n/n8n-nodes-langchain.agentTool') {
				return { description: { outputs: [NodeConnectionTypes.AiTool] } };
			}
			return { description: { outputs: [NodeConnectionTypes.Main] } };
		}) as typeof nodeTypes.getByNameAndVersion);
	});

	const createTool = () => createValidateWorkflowCodeTool(user, telemetry, nodeTypes);

	describe('smoke tests', () => {
		test('creates tool with correct name and readOnlyHint=true', () => {
			const tool = createTool();

			expect(tool.name).toBe('validate_workflow_code');
			expect(tool.config).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('returns valid=true with nodeCount for valid code', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }, { id: '2' }, { id: '3' }] },
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response.nodeCount).toBe(3);
			expect(result.isError).toBeUndefined();
		});

		test('includes warnings array when warnings exist', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }] },
				warnings: [
					{ code: 'deprecated', message: 'Node X is deprecated', nodeName: 'HTTP Request' },
					{
						code: 'no-target',
						message: 'Connection Y has no target',
						parameterPath: 'options.retry',
					},
				],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const expectedWarnings = [
				{
					code: 'deprecated',
					message: 'Node X is deprecated',
					nodeName: 'HTTP Request',
				},
				{
					code: 'no-target',
					message: 'Connection Y has no target',
					parameterPath: 'options.retry',
				},
			];

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response.warnings).toEqual(expectedWarnings);
			expect(result.structuredContent).toEqual(
				expect.objectContaining({ warnings: expectedWarnings }),
			);
		});

		test('omits warnings key when no warnings', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }] },
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
		});

		test('returns valid=false with errors for invalid code', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Syntax error at line 10'));

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(response.errors).toEqual(['Syntax error at line 10']);
			expect(result.isError).toBe(true);
		});

		test('includes SDK reference hint only for parse errors', async () => {
			const parseError = new Error('Failed to parse generated workflow code: unexpected token');
			parseError.name = 'WorkflowCodeParseError';
			mockParseAndValidate.mockRejectedValue(parseError);

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(response.hint).toContain('sdk_ref');
			expect(response.hint).toContain('Workflow SDK reference');
			expect(response.hint).toContain('validate_workflow_code');
		});

		test('does not include SDK reference hint for non-parse errors', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Some other error'));

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.hint).toBeUndefined();
		});

		test('tracks telemetry on success with nodeCount and warningCount', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }, { id: '2' }] },
				warnings: [{ code: 'warn', message: 'some warning' }],
			});

			const tool = createTool();
			await tool.handler({ code: 'const wf = ...' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'validate_workflow_code',
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({
							nodeCount: 2,
							warningCount: 1,
						}),
					}),
				}),
			);
		});

		test('returns valid=false when an agent is wired as a tool to another agent', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: {
					nodes: [
						{
							id: 'manager',
							name: 'Manager Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'worker',
							name: 'Worker Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [200, 0],
							parameters: {},
						},
					],
					connections: {
						'Worker Agent': {
							ai_tool: [[{ node: 'Manager Agent', type: 'ai_tool', index: 0 }]],
						},
					},
				},
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(Array.isArray(response.errors)).toBe(true);
			expect((response.errors as string[])[0]).toContain('@n8n/n8n-nodes-langchain.agentTool');
			expect(result.isError).toBe(true);
		});

		test('tracks telemetry on failure with error message', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const tool = createTool();
			await tool.handler({ code: 'bad code' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'validate_workflow_code',
					results: expect.objectContaining({
						success: false,
						error: 'Parse failed',
					}),
				}),
			);
		});
	});
});
